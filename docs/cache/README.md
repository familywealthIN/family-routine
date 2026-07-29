# Dashboard cache integrity

Investigation of the three reported symptoms, the flow diagrams for both the
broken and corrected paths, the evidence, and the test harness that keeps it
fixed.

## The three reports, and what they actually were

| Reported | Root cause | Fixed by |
|----------|-----------|----------|
| "New Day first check goes green but it is not saved and have to tick again" | Two routine-creation paths raced on a new day — one atomic, one not — producing **duplicate Routine documents** for the same date. `routineDate()` is a `findOne`, so the tick landed on one document and the UI read the other. | atomic upsert in `findTodayandSort` + unique index on `{email, date}` + a per-date in-flight guard on `addNewDayRoutine()` + a `did` readiness guard on `checkClick` |
| "Routine should not have missed state if agent failed and ticked on time" | The completion window ended at the **next task in the list**, so two tasks sharing a start time gave the first a **zero-minute window** — always `missed`. And the window was built in the **server's** timezone but compared against an absolute timestamp. | `utils/goalItemStatus.js`: window closes at the next *distinct* time, graded in the **user's** timezone (13 unit tests) |
| "Goal creation modal / past-upcoming switch flickers or doesn't show until refresh" | `goalsByGoalRef` returned the **real `Goal:<id>`** with a **filtered** `goalItems` array. Apollo normalizes by id, so it replaced the shared list — a 14-item day goal collapsed to 2 across every query at once. | server returns the complete list; the three consumers scope client-side via `utils/goalRefScope.js` |

Plus the thing you actually named: **`GoalItemList` was not a dumb component.**
It kept a `pendingSubTaskUpdates` Set, `$set`-mutated cached `SubTaskItem`s,
wrote `period`/`date` onto cached `GoalItem`s (fields the type doesn't have), and
called `$forceUpdate()` to cover the resulting reactivity loss. It is now a pure
function of its props.

Making it pure exposed a fifth defect the local patching had been hiding:
**`completeSubTaskItem` is typed `GoalItem` but returned the sub-task's shape**
(`{_id, body, isComplete}`), so `id` and `subTasks` resolved to `null` and Apollo
could not normalize the response at all. The tick only ever survived because of
hand-written cache surgery — and the client's "sync UI to server" branch read
that `isComplete` (the *parent's*) and wrote it onto the *sub-task*. The resolver
now returns the complete parent goal item; guard R4.

## Documents

| File | What's in it |
|------|--------------|
| [`01-current-flow-broken.md`](./01-current-flow-broken.md) | Five flow diagrams of the current behaviour with every defect (B1–B17) marked on the diagram, plus a defect index |
| [`02-corrected-flow.md`](./02-corrected-flow.md) | The corrected flows (F1–F12), the "one writer per fact" rule, and a fix table ordered by impact ÷ risk |
| [`03-evidence.md`](./03-evidence.md) | The measurements — network logs, cache-write traces, IndexedDB dumps, the 4-of-8 race reproduction, and the 15 duplicate routine documents found in production |

## Test harness

| Path | Purpose |
|------|---------|
| `apps/web-app/e2e/cache-integrity.spec.js` | The intense soak: open → one activity → close → reopen, a different activity each cycle; a clock walk across every routine slot; a midnight rollover; and four regression guards (R1–R4) for the reported symptoms. Runs against the real database and **restores it afterwards** — it snapshots today's routine first and only resets a day that started with zero progress |
| `apps/web-app/e2e/helpers/cache.js` | Cache invariants (no truncated `Goal.goalItems`, no `Goal:temp-*` leaks, no unknown `__typename`s, no foreign fields on cached entities), checked against **both** the live store and the persisted IndexedDB copy |
| `apps/web-app/e2e/helpers/seed.js` | Builds a realistically stacked day (routine + week goals + day goals under every task). The bugs don't reproduce with one goal on one task. |
| `apps/server/src/utils/goalItemStatus.test.js` | The done/missed grading rule, including the shared-start-time and timezone cases |
| `apps/server/scripts/dedupe-routines.js` | Merges duplicate Routine documents and builds the unique index. **Dry-run by default.** |

```bash
cd apps/web-app && npx playwright test cache-integrity            # everything
cd apps/web-app && npx playwright test cache-integrity --grep R1  # one guard
cd apps/server  && npx jest src/utils/goalItemStatus.test.js
cd apps/server  && node scripts/dedupe-routines.js                # read-only report
```

## Pre-deployment check (2026-07-29)

| Check | Result |
|-------|--------|
| Server unit tests | 90/90 |
| Web-app unit tests | 254/254 |
| e2e cache-integrity | 6 passed, 1 skipped (R2 self-skips outside routine hours; the rule has 13 unit tests) |
| Production build | clean |
| `window.__APOLLO_CLIENT__` in prod bundle | absent — my guard is dead-code-eliminated and Apollo's own `connectToDevTools` compiles to `false` |
| Lint on changed files | clean (pre-existing debt in `taskPriority.test.js` / `e2e/helpers/api.js` left alone) |
| Unique-index build failure on cold start | **contained** — verified against production data: mongoose swallows the E11000, queries keep serving, no unhandled rejection (which on `nodejs18.x` would kill the invocation) |
| Real midnight rollover | survived with **exactly one** routine document |
| Live account after the run | restored to its pre-run state; balance unchanged, no XP written |

**Deploy note — the persisted cache is purged once.** `CACHE_SCHEMA_VERSION`
is 2, so every user's IndexedDB cache is dropped on first load after this ships.
That is deliberate: `sanitizeStore` can remove leaked and mistyped entities but
cannot detect an already-truncated `Goal.goalItems` list, and those are in users'
caches today. The cost is that a user who opens the app **offline** immediately
after updating sees an empty dashboard until they reconnect. One time, per user.

## Outstanding

1. **The unique index is declared but not yet built.** `RoutineSchema` declares
   `{email:1, date:1} unique`, but Mongo refuses to build it while duplicates
   exist. `grvpanchalus@gmail.com` has been merged; **five other accounts across
   thirteen dates have not** — see `03-evidence.md` E3. Run
   `node apps/server/scripts/dedupe-routines.js --apply` when you're ready to
   touch those accounts. Until then the code-level guards hold, but the database
   can't enforce the invariant.

2. **Deferred structural work** (see `02-corrected-flow.md`): derive
   `passed`/`wait` server-side (F8), extend mutation return shapes to the
   complete entity (F4) so `useApolloCacheUpdates.js` can be deleted (F5),
   version + purge the persisted cache (F6), and the pending-entity guard (F9)
   that would remove the need to disable controls during loads at all.
