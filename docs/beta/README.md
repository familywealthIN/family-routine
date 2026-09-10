# The weekly beta cycle

One loop: **test → file → fix → retest → ship**. It runs in two halves, because the two
halves need different machines.

| Half | Runs where | Does |
|---|---|---|
| **Test** | Local only | Seven-day simulated beta run through Chrome DevTools MCP, files findings to Asana |
| **Fix** | Cloud routine, Sat 22:00 America/New_York | Fixes the open tickets, verifies, opens the MR from `develop` to `master` |

The test half cannot run in the cloud: it needs a local Chrome on port 9222, local dev
servers on `:3000` and `:8080`, and the gitignored root `.env`. The fix half needs none of
those, so it is the half that is scheduled.

`docs/beta/tickets.json` is the seam between them. It is a **committed** snapshot of every
still-open Asana ticket, which is how the cloud half learns what is outstanding without an
Asana token.

## Local half — test and file

Run `/beta-cycle` (see `.claude/skills/beta-cycle/SKILL.md`) or, by hand:

```bash
# Chrome must already be listening BEFORE the Claude session starts, with a SHORT profile
# dir or CacheStorage blows the Windows MAX_PATH limit and Vue never mounts.
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 --user-data-dir=C:/Users/grvpa/cdbg &

(cd apps/server && yarn dev) &     # bare - never pipe through head/tail, it dies on SIGPIPE
(cd apps/web-app && yarn serve) &
```

Then dispatch the `beta-tester` agent, and file what it returns:

```bash
node tools/beta/file-findings.js <run.json> --label "5-11 Sep 2026" --dry   # always dry first
node tools/beta/file-findings.js <run.json> --label "5-11 Sep 2026"
node tools/beta/snapshot-tickets.js        # refresh the seam
git add docs/beta/tickets.json && git commit -m "chore(beta): refresh open-ticket snapshot"
```

`file-findings.js` dedupes against every still-open ticket across every prior epic. A finding
that matches an open ticket becomes a recurrence comment rather than a duplicate. **A
recurrence on a ticket closed last cycle is the most important signal the cycle produces** —
it means a fix did not hold.

## Cloud half — fix and ship

This is what the Saturday routine runs. It is also runnable by hand.

1. **Read the backlog.** `docs/beta/tickets.json`. Each ticket carries `gid`, `ref` (`D-NN`),
   `severity`, `title` and the full `notes` — REPRO / EXPECTED / ACTUAL / EVIDENCE and a
   `DONE WHEN` acceptance line.

   Some tickets carry a **`SOLUTION`** section written by the product owner. Where one exists
   it **overrides** your own reading of the bug — implement what it says, and put any
   objection in the fix report's `risk` field rather than substituting your own design.

2. **Pick the batch.** Order by severity: Blocker → Critical → Major → Minor → Cosmetic.
   Take at most **six**. Skip any ref that already appears in a `fix(D-NN):` commit reachable
   from `origin/develop`. Skip anything marked `[Needs re-verification]` — those need a human.

3. **Fix.** One `ticket-fixer` subagent per ticket (`.claude/agents/ticket-fixer.md`), each in
   its own git worktree (`isolation: "worktree"`), dispatched in waves grouped by subsystem so
   no two concurrent fixers own the same files:

   | Wave | Subsystem |
   |---|---|
   | 1 | AI plan & milestone creation (`apps/server` goal/plan resolvers) |
   | 2 | Agents, redeem and the points ledger |
   | 3 | Goal completion and counters |
   | 4 | Dashboard and goal-item UI (`apps/web-app` organisms) |
   | 5 | Polish, copy, formatting |

   Merge each wave's branches one at a time and run the touched workspace's checks before
   starting the next wave.

4. **Integrate.** `develop` currently trails `master`, so bring it forward first, then land
   the verified fix branches on it:

   ```bash
   git checkout develop && git merge --ff-only origin/master
   # merge each verified fix branch
   yarn lint && yarn build          # whatever the touched workspaces actually have
   node tools/beta/snapshot-tickets.js   # only if an Asana token is present
   git push origin develop
   ```

5. **Open the MR.**

   ```bash
   gh pr create --base master --head develop \
     --title "Beta cycle <label>: <n> fixes" --body-file <pr.md>
   ```

   The body must carry, per ticket: status, root cause, what was verified and **how**, and the
   `retestHint` — the exact UI steps the next local beta run should re-check. It must also
   name what was deliberately left open and flag any `needsMigration`. A reviewer should be
   able to tell from the body alone which fixes were proven and which were only argued.

## Hard rules

- Mongo is the **live Atlas `routine` DB**. Every simulated day writes real records. Clean up
  test records; report anything irreversible.
- Never claim a check ran that did not run. "Not available" is an acceptable result.
- Never close a ticket the retest did not cover. Only a verified fix with a real commit closes
  one; `invalid` and `notReproduced` get flagged `[Needs re-verification]` and stay open.
- Do not change any `@capacitor/*` version, reintroduce the removed `busy` prop, move CSS out
  of the inline organism `<style>` blocks, or reuse an entity id for a filtered projection.
- Never run a data migration. Describe it and set `needsMigration`.
- The Asana PAT is `ASANA_ACCESS_TOKEN` in the gitignored root `.env`. It is not available in
  the cloud. Never echo it, commit it, or pass it to a subagent.

## Tooling

| Script | Does |
|---|---|
| `tools/beta/asana.js` | Shared REST client; reads the PAT from root `.env` |
| `tools/beta/list-tickets.js` | Prints an epic and its subtasks |
| `tools/beta/dump-ticket.js` | Prints full notes for given gids |
| `tools/beta/file-findings.js` | Files a run's findings as an epic + subtasks, with dedupe |
| `tools/beta/report-fix.js` | Writes fixer results back onto tickets, closes verified ones |
| `tools/beta/snapshot-tickets.js` | Refreshes `docs/beta/tickets.json`, the cloud seam |
