---
name: beta-cycle
description: Run the weekly Routine Notes beta cycle end to end - a seven-day simulated beta test through Chrome MCP, file the findings as Asana tickets under a "Beta Test fixes" epic, dispatch fixer subagents against the open tickets, retest what they fixed, and open an MR from develop to master. Use when asked to run the beta cycle, the weekly beta test, or to fix and retest the beta tickets.
---

# Weekly beta cycle

One loop: **test → file → fix → retest → ship**. Each stage feeds the next, and the loop is
the point — a fix that is never retested has not been verified.

## 0. Preflight

```bash
node tools/beta/list-tickets.js            # what is already open
git fetch origin && git status --short     # working tree must be clean
```

Chrome must already be listening on 9222 with a short profile dir, launched **before** this
session started, or the Chrome MCP tools will not have registered:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 --user-data-dir=C:/Users/grvpa/cdbg &
```

Both dev servers, backgrounded **bare** — never piped through `head`/`tail`:

```bash
(cd apps/server && yarn dev) &
(cd apps/web-app && yarn serve) &
```

## 1. Test

Dispatch the `beta-tester` agent. It runs the seven simulated days, cross-checks each finding
on a second surface, and returns JSON. Save it:

```bash
node -e 'require("fs").writeFileSync("<scratch>/run.json", process.argv[1])' "$JSON"
```

Read the `retracted` array before you read the findings. If it is empty, be suspicious — a run
that never retracted anything usually did not cross-check.

Carry forward every `retestHint` from last cycle's fix reports and re-run those steps
explicitly. That is how a regression gets caught.

## 2. File

```bash
node tools/beta/file-findings.js <scratch>/run.json --label "5-11 Sep 2026" --dry
node tools/beta/file-findings.js <scratch>/run.json --label "5-11 Sep 2026"
```

Always `--dry` first and read the dedupe split. A finding that matches a still-open ticket is
posted as a recurrence comment, not filed again. A recurrence on a ticket that was closed last
cycle is the most important signal the cycle produces — call it out.

## 3. Fix

Order by severity, and dispatch `ticket-fixer` agents **in waves grouped by subsystem** so no
two concurrent fixers own the same files. Give each `isolation: "worktree"` and one ticket:
its ref, gid, title and full notes.

Suggested grouping — one wave each, checked against the actual tickets before you dispatch:

| Wave | Subsystem | Typical area |
|---|---|---|
| 1 | AI plan & milestones | `apps/server` goal/plan resolvers, milestone creation |
| 2 | Agents & redeem | agent lifecycle, points ledger, `redeemClick` |
| 3 | Goal completion & counters | completion gating, `countTaskCompleted` |
| 4 | Dashboard & goal-item UI | `apps/web-app` organisms |
| 5 | Everything else | polish, copy, formatting |

Keep a wave to about five agents. After each wave, merge its branches one at a time and run
the workspace's checks before starting the next — a wave that lands on a broken tree wastes
the next wave.

Then write the results back:

```bash
node tools/beta/report-fix.js <scratch>/fixes.json --dry
node tools/beta/report-fix.js <scratch>/fixes.json
```

Only `status: "fixed"` with a real commit completes a ticket. `invalid` and `notReproduced`
get flagged `[Needs re-verification]` and stay open for a human.

## 4. Retest

Dispatch `beta-tester` again, scoped this time: give it only the `retestHint` steps from the
fixes that landed. This run does not need seven days — it needs to prove each specific fix
holds through the UI, not just in a unit test.

A fix whose retest fails gets its ticket reopened with the failure, and the commit stays on
the branch for a human to judge. Do not quietly re-close it.

## 5. Ship

The fix work lands on `develop`, then goes to `master` as one MR:

```bash
git checkout develop && git merge --ff-only origin/master   # develop trails master
# merge the verified fix branches
git push origin develop
gh pr create --base master --head develop --title "Beta cycle <label>: <n> fixes" --body-file <scratch>/pr.md
```

The PR body must carry: the ticket list with status, what was verified and how, what was
retested through the UI, what is deliberately left open, and any `needsMigration` flag. A
reviewer should be able to tell from the body alone which fixes were proven and which were
only argued.

## Hard rules

- Mongo is the **live Atlas `routine` DB**. Every simulated day writes real records. Clean up
  test records, and report anything irreversible in the run's `residue`.
- Never claim a check ran that did not run. "Not available" is an acceptable result.
- Never close a ticket the retest did not cover.
- The Asana PAT lives in `ASANA_ACCESS_TOKEN` in the gitignored root `.env`. Never echo it,
  never commit it, never pass it in a prompt to a subagent.
