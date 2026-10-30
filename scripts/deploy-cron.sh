#!/usr/bin/env bash
# Deploy the notification cron (apps/cron) to the n8n host and schedule the lifecycle job.
#
# Run from the repo root, on the commit you mean to ship:
#   SSH_TARGET=root@workflows.familywealth.in scripts/deploy-cron.sh --check   read-only: changes nothing
#   N8N_API_KEY=... VERIFY_EMAIL=you@example.com scripts/deploy-cron.sh       deploy
#
# Credentials come from the environment; nothing is stored in this file. The
# runbook is docs/n8n/DEPLOY.md.
#
# No step sends a push: the verify runs preview-lifecycle.js and
# send-cue-now.js --dry-run, which only print. .env values are never printed,
# only which names are set, and any mongodb:// URL in remote output is redacted.
set -euo pipefail

MODE="deploy"
case "${1:-}" in
  --check) MODE="check" ;;
  "") ;;
  *) echo "usage: scripts/deploy-cron.sh [--check]" >&2; exit 2 ;;
esac

SSH_TARGET="${SSH_TARGET:-root@workflows.familywealth.in}"
N8N_URL="${N8N_URL:-https://workflows.familywealth.in}"
REMOTE_DIR="${REMOTE_DIR:-/var/lib/n8n/notes-cron}"   # where "Send Routine Notification" runs
STAMP="$(date +%Y%m%d-%H%M%S)"
# WEB_APP_URL is optional: aiCue.js sends it as the OpenRouter referer, defaulting to routinenotes.app.
REQUIRED_ENV="MONGDO_DB ENCRYPTION_KEY OPENROUTER_API_KEY"
# BatchMode: a key the host refuses fails at once instead of waiting on a password prompt.
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
[ -n "${SSH_KEY:-}" ] && SSH_OPTS+=(-i "$SSH_KEY")

if [ "$MODE" = "deploy" ]; then
  : "${N8N_API_KEY:?set N8N_API_KEY}"
  : "${VERIFY_EMAIL:?set VERIFY_EMAIL (the account the dry runs plan for)}"
fi

redact() { sed -E 's#mongodb(\+srv)?://[^[:space:]"]+#mongodb://[redacted]#g'; }
remote() { ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$@"; }

cd "$(dirname "${BASH_SOURCE[0]}")/.."
SHA="$(git rev-parse --short HEAD)"
# apps/cron's dependencies as name@range, e.g. "moment@^2.24.0 mongoose@^5.9.9".
DEPS="$(node -p "Object.entries(require('./apps/cron/package.json').dependencies).map(([n, v]) => n + '@' + v).join(' ')")"
# Prints each dependency's installed version on the host, or that it is missing.
DEPS_REPORT="for d in $DEPS; do n=\${d%@*}; if [ -d node_modules/\$n ]; then echo \"   \$n \$(node -p \"require('./node_modules/\$n/package.json').version\")\"; else echo \"   \$n not installed (the deploy installs it)\"; fi; done"

echo "== 0. Preflight: commit $SHA, tests"
if ! git diff --quiet HEAD -- apps/cron; then
  echo "apps/cron has uncommitted changes; deploy a commit, not a working tree." >&2; exit 1
fi
(cd apps/cron && npx jest --silent 2>&1 | tail -3)

echo "== 1. Inspect $SSH_TARGET:$REMOTE_DIR"
remote "ls -la '$REMOTE_DIR' | head -30 && ls -la '$REMOTE_DIR/..' | grep -E 'serviceAccountKey|\.env' || true; \
  cd '$REMOTE_DIR' && node -v && node -e \"if (typeof fetch !== 'function') { console.error('Node 18+ needed for AI cues'); process.exit(1) }\" \
  ; $DEPS_REPORT; \
  if [ -f RELEASE ]; then sed 's/^/live: /' RELEASE; else echo 'live: (no RELEASE file; never deployed by this script)'; fi"
# Names only, never values. dotenv reads .env from the job's cwd, REMOTE_DIR.
MISSING="$(remote "cd '$REMOTE_DIR'; for n in $REQUIRED_ENV; do grep -q \"^\$n=.\" .env 2>/dev/null || echo \$n; done")"
remote "cd '$REMOTE_DIR'; for n in $REQUIRED_ENV; do grep -q \"^\$n=.\" .env 2>/dev/null && echo \"   \$n set\" || echo \"   \$n MISSING\"; done; \
  grep -q '^OPENROUTER_FREE_MODELS=.' .env 2>/dev/null && echo '   OPENROUTER_FREE_MODELS set: the 26 Oct pin was dead; unset it unless it names current :free models' || true"

if [ "$MODE" = "check" ]; then
  echo "== Check only: nothing changed on the host."
  [ -z "$MISSING" ] || echo "   Fix in $REMOTE_DIR/.env before deploying: $MISSING"
  exit 0
fi
[ -z "$MISSING" ] || { echo "Missing in $REMOTE_DIR/.env: $MISSING. Nothing deployed." >&2; exit 1; }

echo "== 2. Back up to $REMOTE_DIR.bak-$STAMP"
remote "cp -a '$REMOTE_DIR' '$REMOTE_DIR.bak-$STAMP'"
rollback() {
  echo "== Rolling back to $REMOTE_DIR.bak-$STAMP"
  remote "rm -rf '$REMOTE_DIR' && mv '$REMOTE_DIR.bak-$STAMP' '$REMOTE_DIR'"
}

echo "== 3. Copy apps/cron/src/* (flattened, like the current layout)"
tar -C apps/cron/src -czf - . | remote "tar -C '$REMOTE_DIR' -xzf -"
echo "== 3b. Install any dependency of apps/cron the host lacks (present ones stay as they are)"
remote "cd '$REMOTE_DIR' && for d in $DEPS; do n=\${d%@*}; [ -d node_modules/\$n ] || npm install --omit=dev --no-audit --no-fund \"\$d\" 2>&1 | tail -1; done; $DEPS_REPORT"
printf 'commit %s\ndeployed %s\n' "$SHA" "$(date -u +%Y-%m-%dT%H:%MZ)" | remote "cat > '$REMOTE_DIR/RELEASE'"

echo "== 4. Verify on the server (sends nothing)"
set +e
VERIFY="$(remote "cd '$REMOTE_DIR' && for f in send-notification.js lifecycle-notifications.js progress.js weekly-agenda.js; do node --check \$f || exit 1; done && \
  node -e \"require('./cue/cueEngine');require('./cue/aiCue');require('./lifecycle/planner');require('./utils/push');console.log('modules ok')\" && \
  echo '-- preview-lifecycle.js' && node preview-lifecycle.js '$VERIFY_EMAIL' && \
  echo '-- send-cue-now.js --dry-run' && node send-cue-now.js '$VERIFY_EMAIL' --dry-run" 2>&1)"
STATUS=$?
set -e
printf '%s\n' "$VERIFY" | redact | tail -40
# D-11: the per-minute job used to print the Mongo URL, password included, to the n8n log.
if printf '%s' "$VERIFY" | grep -q -E 'mongodb(\+srv)?://'; then
  echo "A Mongo URL reached the output (D-11)." >&2; STATUS=1
fi
if [ "$STATUS" -ne 0 ]; then
  echo "Verify failed." >&2; rollback; exit 1
fi

echo "== 5. n8n: 'Lifecycle Notifications' (every 15 min) active, the 21:00 progress job off"
api() { curl -sS -f -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' "$@"; }
WORKFLOWS="$(api "$N8N_URL/api/v1/workflows?limit=250")"
# Re-runs reuse the workflow an earlier run created instead of adding another.
# JSON handling is node, which every machine that runs this has (python3 may not).
LIFECYCLE_ID="$(printf '%s' "$WORKFLOWS" | node -e '
const w = JSON.parse(require("fs").readFileSync(0, "utf8")).data.find((x) => x.name === "Lifecycle Notifications");
console.log(w ? w.id : "")')"
if [ -z "$LIFECYCLE_ID" ]; then
  # MSYS_NO_PATHCONV: Git Bash would rewrite the /var/... argument into a Windows path.
  BODY="$(MSYS_NO_PATHCONV=1 node -e '
const d = JSON.parse(require("fs").readFileSync("docs/n8n/6-lifecycle-notifications.json", "utf8"));
d.nodes.filter((n) => n.type.endsWith("executeCommand"))
  .forEach((n) => { n.parameters.command = `cd ${process.argv[1]} && node lifecycle-notifications.js`; });
console.log(JSON.stringify({ name: d.name, nodes: d.nodes, connections: d.connections, settings: {} }));' "$REMOTE_DIR")"
  LIFECYCLE_ID="$(api -X POST "$N8N_URL/api/v1/workflows" -d "$BODY" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0, "utf8")).id)')"
  echo "   created lifecycle workflow $LIFECYCLE_ID"
fi
api -X POST "$N8N_URL/api/v1/workflows/$LIFECYCLE_ID/activate" >/dev/null
echo "   lifecycle workflow: $LIFECYCLE_ID (active)"

printf '%s' "$WORKFLOWS" | node -e '
JSON.parse(require("fs").readFileSync(0, "utf8")).data
  .filter((w) => w.active && w.nodes.some((n) => n.type.endsWith("executeCommand") && String(n.parameters.command || "").includes("progress.js")))
  .forEach((w) => console.log(w.id));' | while read -r ID; do
  api -X POST "$N8N_URL/api/v1/workflows/$ID/deactivate" >/dev/null && echo "   deactivated progress workflow $ID"
done

echo "== Done: $SHA is live in $REMOTE_DIR."
echo "   Rollback: ssh $SSH_TARGET \"rm -rf '$REMOTE_DIR' && mv '$REMOTE_DIR.bak-$STAMP' '$REMOTE_DIR'\""
echo "   then deactivate workflow $LIFECYCLE_ID and re-activate the progress workflow."
