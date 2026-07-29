# Evidence — how each defect was reproduced

Captured 2026-07-28 against the live dev stack (`localhost:3000` server +
`localhost:8080` web-app) and the real Atlas database, on
`grvpanchalus@gmail.com` stacked to a realistic shape: 7 routine tasks, 7 week
goals, 14 day goals.

Everything below is a measurement. Nothing is inferred from reading code alone.

---

## E1 — A new day genuinely starts with **no** routine document

The very first probe, before any seeding:

```
TODAY 28-07-2026
ROUTINE null
GOALS [ ...month and year goals only... ]
```

So `routineDate(date: today) → null` is the **normal** state at the start of a
day, not an edge case. Every new-day code path runs every day.

---

## E2 — One new-day open fires `addRoutine` three times, then a mutation storm

Network log from a single cold open on the new day (`fetch` instrumented before
app boot):

```
getRoutineDate    {date: 28-07-2026}  →  {"routineDate": null}
addRoutine        {date: 28-07-2026}  →  6a68a42ae468da9a79d4cf8a
addRoutine        {date: 28-07-2026}  →  6a68a42ae468da9a79d4cf8a     ← 2nd
addRoutine        {date: 28-07-2026}  →  6a68a42ae468da9a79d4cf8a     ← 3rd
getRoutineDate    {date: 28-07-2026}  →  {...routine...}
passRoutineItem   Wake Up
waitRoutineItem   Wake Up
passRoutineItem   Morning movement
waitRoutineItem   Morning movement
passRoutineItem   Jogging
waitRoutineItem   Jogging
passRoutineItem   Meditation
waitRoutineItem   Meditation
waitRoutineItem   Start Work
waitRoutineItem   Wake Up                ← duplicate
waitRoutineItem   Morning movement       ← duplicate
passRoutineItem   Morning movement       ← duplicate
waitRoutineItem   Morning movement       ← duplicate
passRoutineItem   Jogging                ← duplicate
passRoutineItem   Meditation             ← duplicate
waitRoutineItem   Morning movement       ← duplicate
```

**~20 mutations for one app open.** `Morning movement`'s `wait` visibly
oscillates `true → false → true` across the responses — the cache is fighting
itself. Cause: `passRoutineItem`'s `update()` writes the cache → the
`routineDate.tasklist` watcher re-fires → `setPassedWait()` runs again before the
earlier responses land (**B7/B8**).

---

## E3 — The new-day race produces duplicate Routine documents (4 of 8 runs)

Forced the exact concurrency a new-day open creates — three `addRoutine` calls
alongside one `completeGoalItem` (which auto-creates the routine through the
non-atomic `findTodayandSort`) — on eight clean dates:

```
run 1/8 13-02-2027: docs=2 K per doc=[5, 0]  <== DUPLICATE
run 2/8 14-02-2027: docs=2 K per doc=[5, 0]  <== DUPLICATE
run 3/8 15-02-2027: docs=1 K per doc=[5]
run 4/8 16-02-2027: docs=1 K per doc=[5]
run 5/8 17-02-2027: docs=1 K per doc=[5]
run 6/8 18-02-2027: docs=2 K per doc=[5, 0]  <== DUPLICATE
run 7/8 19-02-2027: docs=1 K per doc=[5]
run 8/8 20-02-2027: docs=2 K per doc=[5, 0]  <== DUPLICATE

>>> 4/8 runs produced duplicate Routine documents
```

`K per doc=[5, 0]` is the whole bug in one line: the tick's points are on one
document, and the other — which `routineDate()`'s `findOne` may equally return —
has nothing. **"The check goes green but it isn't saved; tick it again."**

### It is not hypothetical — it is in production

```
15 duplicated (email, date) group(s)

apptestnotes@gmail.com          / 08-04-2026   2 docs
apptestnotes@gmail.com          / 16-03-2026   2 docs
bdhm2h856g@privaterelay…        / 19-03-2026   2 docs
grvpanchalindia@gmail.com       / 22-02-2026   3 docs
grvpanchalus@gmail.com          / 27-01-2026   2 docs
lagnakaryavivahsanstha@…        / 04-03-2026   2 docs
sanjaylakhiwal1994@gmail.com    / 03-03, 04-03, 13-03, 14-03-2026
…
```

Six accounts, fourteen dates. Every duplicate pair was created **within the same
second** (adjacent ObjectIds) and none carries earned points — consistent with a
creation race, not user activity.

The server already had a workaround for the symptom: `weekStimuli` picks
"the one with the highest total earned points" when it sees duplicates, with the
comment *"can happen due to race conditions in addRoutine"*.

---

## E4 — A single tick truncates the shared day Goal from 14 items to 2

`cache.write` was instrumented before app boot to log every `Goal` object written
and how many `goalItems` it carried. One click on a goal-item checkbox:

```json
[
  { "n": 14, "period": "day",  "path": "result.optimizedDailyGoals[0]" },
  { "n": 14, "period": "day",  "path": "result.agendaGoals[0]" },
  { "n": 2,  "path": "result.goalsByGoalRef[0]" },        ← the corrupting write
  { "n": 2,  "path": "result.optimizedDailyGoals[0]" },   ← cemented by cache surgery
  { "n": 14, "period": "day",  "path": "result.optimizedDailyGoals[0]" }
]
```

Write sizes for the day Goal, in order: **`14 → 14 → 2 → 2 → 14`.**

- The `n:2` write comes from `goalsByGoalRef`, which returns **the real
  `Goal:<id>`** with `goalItems` filtered to the requested `goalRef`. Apollo
  normalizes by id, so it replaced the 14-item list everywhere at once.
- The second `n:2` is `updateGoalItemCompletionInCache`, whose
  `readQuery → cloneDeep → writeQuery` read the already-truncated list and wrote
  it back into `optimizedDailyGoals`.
- The final `14` is the refetch healing it — **the flicker**.

### The visible symptom

Immediately after the truncating write, the current-task card rendered:

> **Meditation** · 06:40 – 0/2
> *No goal or activity logged.*

…despite both `[e2e-cache] Meditation — step 1` and `step 2` having been on
screen a second earlier.

### And it survives a restart

Reading the persisted Apollo cache straight out of IndexedDB
(`routine-notes` → `apollo_cache` → `apollo-cache-persist`):

```json
{
  "persistedTodayKey": "optimizedDailyGoals({\"date\":\"28-07-2026\"})",
  "persistedTodayRefs": [
    { "id": "Goal:6a68a3a2836f9a5734734299", "pd": "day/28-07-2026", "items": 2 },
    { "id": "Goal:6a68a3a1836f9a5734734291", "pd": "week/31-07-2026", "items": 7 }
  ]
}
```

**`items: 2`** — the server holds 14. The truncated list was written to disk and
would be restored on the next cold open. That is *"they don't show until
refresh."*

---

## E5 — Leaked optimistic entities, persisted for days

Same IndexedDB blob:

```json
{
  "tempGoals": [
    "Goal:temp-1784926878068-day",    // 2026-07-24
    "Goal:temp-1784932579395-week",   // 2026-07-24
    "Goal:temp-1784982393521-day"     // 2026-07-25
  ],
  "mistyped": ["RoutineItemRef:69786b1f2194f43110ac1529"],
  "totalEntities": 280
}
```

`addGoalItemToCache` mints `Goal:temp-${Date.now()}-${period}` when it can't find
the period goal, and nothing ever evicts them. Four-day-old placeholders were
still shadowing real goals (`Goal:temp-1784926878068-day` sits alongside the real
`Goal:6a63d29da079096e3838b83e`, same date, same period).

`RoutineItemRef:` is not a type any query declares — a mistyped `__typename`
minted a phantom entity (**B17**, ARCHITECTURE.md §3 principle #3).

---

## E6 — An on-time-looking tick graded `missed`

Completing a `Wake Up` day goal through the real mutation:

```
STEP 3  completeGoalItem -> {"id":"6a68a3a2836f9a573473429a",
                             "isComplete":true,
                             "status":"missed",          ← here
                             "completedAt":"1785242727802"}
```

`Wake Up` (06:00) is immediately followed by `Morning movement` (06:00), so
`nextTime === taskTime` and the completion window was **zero minutes wide** — the
task graded `missed` for *any* completion time, including 06:00:00 exactly
(**B9**).

Separately, the window was built with `moment(task.time,'HH:mm')` — the
**server's** local zone — and compared against an absolute `completedAt`
(**B10**). The account's stored zone is `America/New_York`; on a UTC Lambda with
an IST user that is a 5h30m error.

---

## Verification after the fixes

```
Running 3 tests using 1 worker
[seed] 7 routine tasks, 7 week goals, 14 day goals on 28-07-2026
  ✓  R1 new day: exactly one Routine document is created for a fresh date (5.8s)
  ✓  R2 on-time tick is never recorded as missed (4.0s)
  ✓  R3 a scoped goal query never returns a truncated copy of a shared Goal (1.1s)
  3 passed (42.7s)
```

Unit coverage for the grading rule (`apps/server/src/utils/goalItemStatus.test.js`):

```
  windowEndMinutes
    √ skips tasks that share the same start time
    √ uses the next distinct time for ordinary slots
    √ runs the last slot to end of day
  deriveGoalItemStatus
    √ grades a tick inside the window as done
    √ grades a tick after the window as missed
    √ does not mark a shared-start-time task missed when ticked on time
    √ closes the shared window at the next distinct time
    √ treats an early tick as done, not missed
    √ grades in the user timezone, not the server timezone
    √ accepts legacy offset-style timezone values
    √ marks a completion on a later local day as missed
    √ defaults to done when the task is not in the list
    √ defaults to done without a completedAt

Tests: 13 passed
```

Regression suites: `apps/server` 90/90 passed, `apps/web-app` 248/248 passed.

The intense suite, run against the fixes:

```
✓ soak: open -> one activity -> close -> reopen never corrupts the cache   (2.5m)
    12 cycles, each: cold open → assert → one activity → assert →
    close → reopen → assert (live store AND persisted IndexedDB copy)
✓ clock walk: every routine slot across the day keeps the cache honest     (1.3m)
    9 stops (05:30 → 23:05), each with a tick and a 30s refresh-timer run
✓ midnight rollover: a tick right after the day flips is not lost          (8.2s)
    [rollover] routineDateKeys: ["…28-07-2026","…29-07-2026"]
```

### Measured before/after on a cold new-day open

| | before | after |
|---|---|---|
| `addRoutine` calls | 3 | **1** |
| `passRoutineItem` + `waitRoutineItem` | ~20 (with duplicates, `wait` oscillating) | 15, one per task per flag |
| total network ops | ~30 | 30 on the new-day path, **13** once the routine exists |
| day `Goal.goalItems` in cache | 14 → **2** → 14 | **14** throughout |
| leaked `Goal:temp-*` entities | 3 (4 days old) | **0** |
| phantom `__typename` entities | 1 (`RoutineItemRef:…`) | **0** |
| persisted cache entities | 280 | 98 |

**Honest caveat on the pass/wait storm:** the duplicate-dispatch loop is gone
(in-flight guards per task, plus a `pendingMutations` check so a tick in flight
can no longer be graded `passed`), but a new-day open still issues one
`passRoutineItem`/`waitRoutineItem` per eligible task. Removing them entirely
requires **F8** — deriving `passed`/`wait` server-side on read — which is listed
as outstanding in `02-corrected-flow.md`, not done here.

---

## How to re-run any of this

```bash
# the three regression guards
cd apps/web-app && npx playwright test cache-integrity --grep "R1|R2|R3"

# the intense open/close soak + clock walk + midnight rollover
cd apps/web-app && npx playwright test cache-integrity

# the grading rule
cd apps/server && npx jest src/utils/goalItemStatus.test.js

# duplicate routine documents (read-only)
cd apps/server && node scripts/dedupe-routines.js
```
