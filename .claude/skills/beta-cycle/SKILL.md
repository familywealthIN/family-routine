---
name: beta-cycle
description: Run the weekly Routine Notes beta cycle end to end - a seven-day simulated beta test of the Routine Focus home screen on a phone viewport, file the findings as Asana tickets under a "Beta Test fixes" epic, dispatch fixer subagents against the open tickets, retest what they fixed, and open an MR from develop to master. Use when asked to run the beta cycle, the weekly beta test, or to fix and retest the beta tickets.
---

# Weekly beta cycle

One loop: **test → file → fix → retest → ship**. Each stage feeds the next, and the loop is
the point — a fix that is never retested has not been verified.

`docs/beta/README.md` is the runbook and describes the two halves (local test, cloud fix).
This skill is the local orchestration. Where they disagree about the **fix** stage, note that
the README's worktree instruction applies to the **cloud** half only — see §3.

## What is under test

`/home` is the **Routine Focus** screen: one focused routine, its ring and checklist, and a
chat thread underneath that replies with tappable checkboxes. D/K/G live in the user drawer.
`/home/classic` is the previous dashboard and is still the only screen with Skip Day, the
agenda for other dates, and the upcoming/past lists.

**The phone shell is the primary surface.** It is selected below 600 CSS px and renders as
`rn-home rn-home--phone`. Read `docs/routine-focus-home.md` before the cycle starts — it
carries the file map and the deliberate departures from the design handoff, which must not be
filed as defects.

## 0. Preflight

```bash
node tools/beta/list-tickets.js            # what is already open
git fetch origin && git status --short     # see §3 before you rely on this being clean
```

Both dev servers, backgrounded **bare** — never piped through `head`/`tail`, or they take
SIGPIPE and die mid-run:

```bash
(cd apps/server && yarn dev) &
(cd apps/web-app && yarn dev) &    # not `yarn serve` - no such script in this workspace
```

There is no `apps/server/.env`; the monorepo keeps one at the root. `server.js` resolves it
from `__dirname`, so the cwd no longer matters and the old `DOTENV_CONFIG_PATH` workaround is
obsolete. If you see env-dependent features fail (chat, auth), check the root `.env` itself
rather than how the server was launched.

Then check the three things that silently invalidate a whole run:

```bash
grep graphQLUrl apps/web-app/src/blob/config.js     # MUST be http://localhost:3000/graphql
grep -c '^OPENROUTER_API_KEY=.' .env                # chat is dead without it
grep -c '^JWT_SECRET=.' .env                        # the auth bypass needs it
```

`blob/config.js` pointing at the deployed dev API is the expensive one: `routineChat` is not
deployed there, so every chat turn fails and the run files a phantom Blocker. Regenerate it
with `GQL_URL=http://localhost:3000/graphql node -r dotenv/config scripts/create-env.js
dotenv_config_path=../../.env` from `apps/web-app`.

### Browser driver — assume Playwright

Chrome DevTools MCP only registers if Chrome was listening on 9222 **before the Claude session
started**. In practice it usually is not, so **plan for Playwright and treat MCP as the
bonus**. Do not restart the cycle to get MCP; do not burn turns retrying its tools.

Playwright 1.59 is already in `node_modules` and is the proven driver for this screen. The
`beta-tester` agent carries the full recipe; what the orchestrator must do is **tell the agent
which driver it has**, because the agent cannot discover MCP's absence cheaply.

- `devices['Pixel 7']` (412×839, touch, mobile UA) reaches a true phone shell. With Chrome MCP
  you must use `emulate`, never `resize_page` — Chrome's minimum window width means
  `resize_page` cannot reach 412px and the run silently tests the tablet shell.
- One `browser.newContext()` per simulated day **is** the close-and-reopen boundary. Re-seed
  localStorage each time; that is auth, not the state under test.
- Playwright's `ctx.addInitScript()` persists for the whole context, unlike Chrome MCP's
  per-navigation `initScript`. This is the main reason Playwright is easier for multi-day work.

If you want MCP next time, launch Chrome **before** starting the session:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 --user-data-dir=C:/Users/grvpa/cdbg &   # SHORT path - MAX_PATH
```

### Known environment facts — exclude these from findings

- The start webhook `https://workflows.grvpanchal.me/webhook/test-flow` **does not respond**
  (`curl` GET → `http=000` after 30s; POST → 404). The end webhook returns 200 in ~10s. To
  drive an agent through to `finished`, temporarily repoint one agent's start URL at the end
  webhook — and restore it afterwards, in `residue`.
- `apps/server` has crashed mid-run before. A dead `:3000` makes the app paint confident EMPTY
  states that read exactly like data loss. **Check liveness between simulated days**, and
  re-verify any finding captured during an outage before filing it — one false "/goals is
  empty" finding has already been produced and retracted this way.

### Clock discipline — plan it before day 1

A `Date` shim moves the **client** only. `validateRedeem` (`apps/server/src/utils/xpLedger.js`)
enforces a ±1-day window against the **server** clock, so every redeem, points debit and agent
start on a simulated day outside that window is refused with
`400: Redemption is only available for today` regardless of feature health.

So **schedule the clock-sensitive journeys on the server's real day** rather than discovering
the refusal mid-run. Agent lifecycle, redeem and points work belong on the real date; cross-day
persistence, resume and cascade work can be shimmed freely. Any finding in the refused areas
must say which clock was moved and rule the window out before it is filed.

**Last cycle's residue contaminates this one.** Simulating a future date writes real routine
documents, and the server leaves a `passed` flag on them. A later cycle that re-simulates the
same dates then meets routines the server already considers passed while the client thinks they
are current — which surfaces as self-contradictory status copy ("In progress · times up" beside
"9h left" and a Redeem button) that looks exactly like a live defect. The 4-10 Oct run produced
two such candidates and retracted both after checking dates the previous run had *not* touched.

So: hand the next run the previous cycle's `residue` list, and **pick simulated dates the last
cycle did not use** where the calendar allows. When a date must be reused, verify any status
finding on a clean date before filing it.

## 1. Test

Dispatch the `beta-tester` agent with the driver named explicitly and the preflight results
handed over, so it does not redo them. It runs the seven simulated days on the phone shell,
cross-checks each finding on a second surface, and returns JSON.

```bash
node -e 'require("fs").writeFileSync("<scratch>/run.json", process.argv[1])' "$JSON"
node -e 'const r=require("<scratch>/run.json"); console.log(r.findings.length,"findings");
  const c={}; r.findings.forEach(f=>c[f.severity]=(c[f.severity]||0)+1); console.log(c);
  console.log("missing doneWhen:", r.findings.filter(f=>!f.doneWhen).length)'
```

Read the `retracted` array **before** the findings. If it is empty, be suspicious — a run that
never retracted anything usually did not cross-check. Check `shell` is `phone` and `driver`
matches what you actually provided, and read `methodologyNotes` for what the run had to work
around.

`uxFindings` do **not** become tickets. They are observations and judgement calls — surface
them in your summary to the user and let the owner decide.

Carry forward every `retestHint` from last cycle's fix reports and re-run those steps
explicitly. That is how a regression gets caught.

### Preserve the evidence before you file

The agent writes its log and screenshots to the **session scratchpad, which is temporary**, but
ticket notes reference those paths and have to outlive the session. Copy them somewhere stable
and reference that path when filing:

```bash
mkdir -p .beta-runs/<label> && cp -r <scratch>/evidence.md <scratch>/shots .beta-runs/<label>/
```

`.beta-runs/` is gitignored — screenshots are too heavy to commit, but a ticket whose evidence
has evaporated cannot be triaged six weeks later.

## 2. File

```bash
node tools/beta/file-findings.js <scratch>/run.json --label "2-8 Oct 2026" --dry
node tools/beta/file-findings.js <scratch>/run.json --label "2-8 Oct 2026"
node tools/beta/snapshot-tickets.js        # refresh the cloud seam
git add docs/beta/tickets.json && git commit -m "chore(beta): refresh open-ticket snapshot"
```

Always `--dry` first and read the dedupe split. A finding that matches a still-open ticket is
posted as a recurrence comment, not filed again. **A recurrence on a ticket that was closed
last cycle is the most important signal the cycle produces** — call it out.

Dedupe only sees **open** tickets, so the matcher is blind by design after a clean-slate
close (below). That is correct when the interface itself was replaced; it is a mistake when it
was not — check which situation you are in before you trust a "0 recurrences" result.

### Starting from a clean board

When the screen under test has been replaced, the old board describes screens that no longer
exist and is worth closing wholesale rather than re-triaging:

```bash
node tools/beta/snapshot-tickets.js                       # ALWAYS snapshot first
node tools/beta/close-all.js --reason "<why>" --dry
node tools/beta/close-all.js --reason "<why>"
```

`close-all.js` comments the reason on every open ticket **before** completing it, and closes
the parent epics too. Nothing is deleted and reopening restores full history, but this is a
wholesale action on real tickets — never run it without the snapshot, and never without the
owner having asked for it.

## 3. Fix

### Triage before you dispatch

Split the findings in two, and say which is which:

- **Located defects** — the root cause is named at a file and line, and `doneWhen` is a
  mechanical check. These are what fixers are for.
- **Product decisions** — the finding is real but the right behaviour is a judgement call
  (should a rule change? is a missing capability scope or regression?). A fixer sent at one of
  these will invent a product decision and commit it. **Take these to the owner first** and
  only dispatch once a `SOLUTION` section is on the ticket.

The 2-8 Oct run split 8 / 4 this way, which is a normal ratio — expect roughly a third of a
cycle's findings to need a decision before any code is written.

### Local fixers do NOT get worktrees

`isolation: "worktree"` is wrong for the local half, for three independent reasons:

1. a fresh worktree has no `node_modules`, so lint/test/build cannot run and the verification
   step — the whole point of the fixer — is worthless;
2. `apps/web-app/src/blob/config.js` is gitignored, so the web-app cannot even build there;
3. a worktree checks out a **commit**, so any feature still sitting uncommitted in the working
   tree simply is not there, and a fixer cannot reproduce a bug in code it cannot see.

So: **run local fixers in the main tree, in waves with disjoint file ownership.** Worktrees
are correct in the cloud half, where the run does its own install.

Reason 3 makes `git status --short` a real gate: if the feature under test is uncommitted,
either commit it first or accept that fixers share one tree. Confirm which with the owner —
committing someone's in-progress feature is their call, not yours.

### Waves

Order by severity, and dispatch `ticket-fixer` agents in waves grouped by subsystem so no two
concurrent fixers own the same files. Give each one ticket: its ref, gid, title and full notes.

| Wave | Subsystem | Typical area |
|---|---|---|
| 1 | Focus screen core | `RoutineFocus.vue`, `routineFocusModel.js`, shell selection |
| 2 | Routine chat | `RoutineChatContainer.vue`, `chatApi.js`, `RoutineChatSchema.js`, intents |
| 3 | Agents, points & redeem | agent lifecycle, points ledger, `redeemClick`, slot counter |
| 4 | Goals, milestones & cascade | plan/milestone resolvers, period tabs, completion gating |
| 5 | Focus organisms & drawer | `packages/ui/organisms/Routine*`, `UserDrawer`, phone layout |
| 6 | Classic dashboard & everything else | `/home/classic`, polish, copy, formatting |

Keep a wave to about five agents. Two files draw almost every wave's fire —
`RoutineFocus.vue` (2.3k lines) and `routineFocusModel.js` — so check that no two tickets in
one wave both land there before dispatching them concurrently.

After each wave, commit or merge its work one piece at a time and run the touched workspace's
checks before starting the next — a wave that lands on a broken tree wastes the next wave.
Baseline for comparison: `packages/ui` 221 tests, `apps/web-app` 561, `apps/server` 207, all
green as of 2 Oct 2026. Jest's `testMatch` excludes `apps/web-app/e2e/`, so `yarn test` is
safe to run while a beta session is live; **never** run the Playwright e2e specs then —
`cache-integrity.spec.js` deletes today's Routine document out from under the run.

Then write the results back:

```bash
node tools/beta/report-fix.js <scratch>/fixes.json --dry
node tools/beta/report-fix.js <scratch>/fixes.json
```

Only `status: "fixed"` with a real commit completes a ticket. `invalid` and `notReproduced`
get flagged `[Needs re-verification]` and stay open for a human.

## 4. Retest

Dispatch `beta-tester` again, scoped: give it only the `retestHint` steps from the fixes that
landed, the same phone viewport, and the same driver. This run does not need seven days — it
needs to prove each specific fix holds through the UI, not just in a unit test.

A fix whose retest fails gets its ticket reopened with the failure, and the commit stays on the
branch for a human to judge. Do not quietly re-close it.

## 5. Ship

The fix work lands on `develop`, then goes to `master` as one MR:

```bash
git checkout develop && git merge --ff-only origin/master   # develop trails master
# merge the verified fix branches
git push origin develop
gh pr create --base master --head develop --title "Beta cycle <label>: <n> fixes" --body-file <scratch>/pr.md
```

The PR body must carry: the ticket list with status, what was verified and how, what was
retested through the UI, what is deliberately left open (including anything parked as a product
decision), and any `needsMigration` flag. A reviewer should be able to tell from the body alone
which fixes were proven and which were only argued.

## Hard rules

- Mongo is the **live Atlas `routine` DB**. Every simulated day writes real records. Clean up
  test records, and report anything irreversible in the run's `residue` — points spent through
  the ledger cannot be reversed from the UI, and a false system event written into a chat
  thread cannot be edited out of it.
- Never claim a check ran that did not run. "Not available" is an acceptable result.
- Never close a ticket the retest did not cover.
- Never dispatch a fixer at a finding that needs a product decision first.
- The Asana PAT lives in `ASANA_ACCESS_TOKEN` in the gitignored root `.env`. Never echo it,
  never commit it, never pass it in a prompt to a subagent.
