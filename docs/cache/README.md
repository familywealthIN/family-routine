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

### The load window is now interactive

The first pass closed the revert race by **disabling** the tick circle and every
goal-item checkbox while a feeding query was in flight (a `busy` prop). That
works, but it costs a tap on every single app-open — the dashboard is at its most
tappable exactly when it is also refetching, and a tap that does nothing reads as
a broken app.

The `busy` gate is gone. In its place, **F9's pending-entity guard**
(`utils/cacheGuard.js` + `apollo/guardLink.js`) makes the *response* yield
instead of the user: a query payload that left before a local write is confirmed
can no longer overwrite that write on the way into the cache. Controls stay live
throughout, and `checkClick` / `skipClick` now **wait** for the routine document
id instead of refusing the tap with "Routine is still loading".

Measured: optimistic feedback at 19–153 ms; the tap survives every response
already on the wire. See `02-corrected-flow.md` F9 for the rule and its two
halves, and guard R5 below.

**And the skeletons were doing the same thing.** Removing `busy` exposed a
second gate: `passive` is driven by `showGoalsSkeleton`, which was
`loading && firstLoad` with **no `!hasData` clause** (unlike
`showRoutineSkeleton`, which always had one). Because every display query is
`cache-and-network`, `loading` stays true while cached data is already on
screen — so on every cold open the skeleton *replaced* perfectly good cached
goals for a full round trip, and disabled every checkbox underneath. Two more
bindings (`AgendaTaskList`'s `:loading` on the non-today view,
`CurrentTaskCard`'s `:loading`) went straight to `queries.*.loading` with no
guard at all, so a refetch blanked the list on **every tick**.

All four now derive from "there is no data", never "a query is loading". A warm
cache paints straight through with no loading state at all.

The one unavoidable exception is the **first open after this ships**, because
`CACHE_SCHEMA_VERSION = 2` purges the persisted cache once (see the deploy note
below). Every open after that is instant.

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
| `apps/web-app/e2e/cache-integrity.spec.js` | The intense soak: open → one activity → close → reopen, a different activity each cycle; a clock walk across every routine slot; a midnight rollover; and five regression guards (R1–R5) for the reported symptoms. Runs against the real database and **restores it afterwards** — it snapshots today's routine first and only resets a day that started with zero progress |
| `apps/web-app/e2e/helpers/cache.js` | Cache invariants (no truncated `Goal.goalItems`, no `Goal:temp-*` leaks, no unknown `__typename`s, no foreign fields on cached entities), checked against **both** the live store and the persisted IndexedDB copy |
| `apps/web-app/e2e/helpers/seed.js` | Builds a realistically stacked day (routine + week goals + day goals under every task). The bugs don't reproduce with one goal on one task. |
| `apps/web-app/src/apollo/__tests__/guardLink.test.js` | The revert race run inside a real Apollo Client + cache — **with a control that asserts the unguarded chain still reverts**, so the test can't quietly stop proving anything |
| `apps/web-app/src/utils/__tests__/cacheGuard.test.js` | The guard registry: hold/confirm/release, sequence ordering, TTL expiry, scalar-only rule, registry cap |
| `apps/server/src/utils/goalItemStatus.test.js` | The done/missed grading rule, including the shared-start-time and timezone cases |
| `apps/server/scripts/dedupe-routines.js` | Merges duplicate Routine documents and builds the unique index. **Dry-run by default.** |

```bash
cd apps/web-app && npx playwright test cache-integrity            # everything
cd apps/web-app && npx playwright test cache-integrity --grep R1  # one guard
cd apps/server  && npx jest src/utils/goalItemStatus.test.js
cd apps/server  && node scripts/dedupe-routines.js                # read-only report
```

## Pre-deployment check (2026-07-30)

| Check | Result |
|-------|--------|
| Server unit tests | 90/90 |
| Web-app unit tests | 285/285 |
| e2e cache-integrity | **8/8 passed** (R2 ran rather than self-skipping this time) |
| Production build | clean |
| Dev-only globals in prod bundle | `__APOLLO_PERSISTOR__` / `__CACHE_GUARD__` absent (dead-code-eliminated; only source maps mention them). The one `__APOLLO_CLIENT__` hit is Apollo's own `connectToDevTools` in chunk-vendors, not ours |
| Lint on changed files | clean (pre-existing debt in `taskPriority.test.js` / `e2e/helpers/api.js` left alone) |

### Test-timing note

`actTickGoalItem` used to sleep a fixed 1500 ms after clicking. That is not long
enough: the invariants read `cache.extract()`, which deliberately **excludes**
the optimistic layer, and the first mutation against a cold dev server measured
**3158 ms** round trip (mongoose connect + first query plan) where warm ones take
~240 ms. It now polls for the real condition (`waitForConfirmed`), which is
strictly stronger — a genuine revert still fails, on timeout, instead of being
slept through.
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
   `passed`/`wait` server-side (F8), and extend mutation return shapes to the
   complete entity (F4 — done for `completeSubTaskItem`, still open for
   `completeGoalItem`) so `useApolloCacheUpdates.js` can be deleted (F5).
   F6 and F9 have since shipped.
