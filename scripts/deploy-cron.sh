#!/usr/bin/env bash
# Deploy the new notification cron to the n8n host and schedule the lifecycle job.
#
# Run from the repo root (on master / aef81c1):
#   N8N_API_KEY=... SSH_TARGET=root@workflows.familywealth.in scripts/deploy-cron.sh
#
# Credentials come from the environment — nothing is stored in this file.
set -euo pipefail

: "${N8N_API_KEY:?set N8N_API_KEY}"
SSH_TARGET="${SSH_TARGET:-root@workflows.familywealth.in}"
N8N_URL="${N8N_URL:-https://workflows.familywealth.in}"
REMOTE_DIR="${REMOTE_DIR:-/var/lib/n8n/notes-cron}"   # where "Send Routine Notification" runs
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "== 1. Inspect $SSH_TARGET:$REMOTE_DIR"
ssh "$SSH_TARGET" "ls -la '$REMOTE_DIR' && ls -la '$REMOTE_DIR/..' | grep -E 'serviceAccountKey|\.env' || true; \
  cd '$REMOTE_DIR' && node -v && node -e \"require('moment');require('mongoose');require('firebase-admin');console.log('deps ok')\""

echo "== 2. Back up to $REMOTE_DIR.bak-$STAMP"
ssh "$SSH_TARGET" "cp -a '$REMOTE_DIR' '$REMOTE_DIR.bak-$STAMP'"

echo "== 3. Copy apps/cron/src/* (flattened, like the current layout)"
tar -C apps/cron/src -czf - . | ssh "$SSH_TARGET" "tar -C '$REMOTE_DIR' -xzf -"

echo "== 3b. AI cues: OPENROUTER_API_KEY in the cron .env (Node 18+ for fetch)"
ssh "$SSH_TARGET" "cd '$REMOTE_DIR' && node -e \"if (typeof fetch !== 'function') { console.error('Node 18+ needed for AI cues'); process.exit(1) }\" && \
  (grep -q '^OPENROUTER_API_KEY=' .env ../.env 2>/dev/null && echo 'OPENROUTER_API_KEY present' || echo 'NOTE: no OPENROUTER_API_KEY in .env — cues stay on templates until you add it')"

echo "== 4. Syntax + module check on the server (sends nothing)"
ssh "$SSH_TARGET" "cd '$REMOTE_DIR' && for f in send-notification.js lifecycle-notifications.js progress.js weekly-agenda.js; do node --check \$f; done && \
  node -e \"require('./cue/cueEngine');require('./cue/aiCue');require('./lifecycle/planner');require('./utils/push');console.log('modules ok')\""

echo "== 5. n8n: add 'Lifecycle Notifications' (every 15 min) and turn off the 21:00 progress job"
api() { curl -sS -f -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' "$@"; }
BODY=$(python3 - "$REMOTE_DIR" <<'PY'
import json, sys
d = json.load(open('docs/n8n/6-lifecycle-notifications.json'))
for n in d['nodes']:
    if n['type'].endswith('executeCommand'):
        n['parameters']['command'] = f"cd {sys.argv[1]} && node lifecycle-notifications.js"
print(json.dumps({k: d[k] for k in ('name', 'nodes', 'connections')} | {'settings': {}}))
PY
)
NEW_ID=$(api -X POST "$N8N_URL/api/v1/workflows" -d "$BODY" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
api -X POST "$N8N_URL/api/v1/workflows/$NEW_ID/activate" >/dev/null
echo "   lifecycle workflow: $NEW_ID (active)"

api "$N8N_URL/api/v1/workflows?limit=100" | python3 -c '
import json,sys
for w in json.load(sys.stdin)["data"]:
    cmds=" ".join(n["parameters"].get("command","") for n in w["nodes"] if n["type"].endswith("executeCommand"))
    if "progress.js" in cmds and w["active"]: print(w["id"])' | while read -r ID; do
  api -X POST "$N8N_URL/api/v1/workflows/$ID/deactivate" >/dev/null && echo "   deactivated progress workflow $ID"
done

echo "== Done. Rollback: ssh $SSH_TARGET \"rm -rf '$REMOTE_DIR' && mv '$REMOTE_DIR.bak-$STAMP' '$REMOTE_DIR'\""
echo "   then deactivate workflow $NEW_ID and re-activate the progress workflow."
