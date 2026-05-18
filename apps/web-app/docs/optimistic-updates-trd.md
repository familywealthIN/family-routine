# Optimistic Updates — Technical Requirements Document

Owner: web-app · Status: in-progress (transitional fixes shipped) · Last updated: 2026-04-30

> **Update log (this revision)**
>
> The following targeted fixes have shipped while the broader Apollo
> `optimisticResponse + update` migration in §5.1 is still in flight.
> They address the user-visible bugs in §1 incrementally; §6 acceptance
> criteria remain the bar for "done".
>
> - **Week-stimuli optimistic cache** — new helper `updateWeekStimuliKInCache`
>   in `useApolloCacheUpdates.js` mirrors `updateRoutineTaskKEarnedInCache`
>   at the weekly aggregate level. `DashBoard.completeGoalItem` now writes
>   it alongside the routine-day cache so the WeekdaySelector dot updates
>   in the same frame as the tick. Reconciles via the existing refetch.
> - **Refetch fan-out for goal completions** — `completeGoalItem` and
>   `completeSubTask` now emit `EVENTS.ROUTINE_TICKED` on success so the
>   `WeekdaySelectorContainer` (which already listened on that channel)
>   refetches its aggregate. Without this the selector kept showing
>   stale K until something else nudged it.
> - **Subtask checkbox flicker** — the subtask `<AtomCheckbox>` in
>   `GoalItemList.vue` no longer keys on `subTask.isComplete`; it remounted
>   the input on every toggle, producing a hard flash. Vuetify's internal
>   transition handles the state change without a remount.
> - **Action-button icon swap smoothing** — the FAB inside the donut on
>   `CurrentTaskCard` and `UpcomingPastTasks` now wraps its icon in a
>   `<transition name="fr-icon-fade" mode="out-in">`, so optimistic →
>   refetch → reconciled icon transitions cross-fade instead of snap.
> - **Shared transition CSS** — `theme.css` now eases
>   `.v-progress-circular__overlay` (`stroke-dashoffset`),
>   `.task-action-btn` (background/colour/shadow), the `fr-icon-fade-*`
>   pair, and `.goal-item-title`/`.subtask-title` (strike-through). The
>   previously added `.v-input--checkbox .v-icon` rule was reverted —
>   it interfered with Vuetify's own state-layer animation and made
>   checkboxes appear unresponsive.
> - **Instant quick-add (AI Enhanced OFF)** — `AiSearchModal.handleSubmit`
>   no longer awaits the AI priority classify before emitting
>   `direct-task-create`. It ships with a placeholder `priority:do` and a
>   transient `_aiClassifyBody` hint; `AiSearchModalContainer.handleDirectTaskCreate`
>   strips the hint, fires `addGoalItem`, and runs `refinePriorityInBackground`
>   only after the goal item resolves. The priority dashboard self-corrects
>   within ~1 s without any UI wait. See §5.8.
> - **MISSED status semantics** — `taskStatus.determineTaskStatus` no
>   longer marks an *incomplete* task whose window has passed as MISSED.
>   MISSED is now exclusively for completions outside their scheduled
>   window (existing branch). Overdue-open items fall through to TODO.
>   Description in `TASK_STATUS_CONFIG` updated accordingly.



## 1. Problem statement

Two reproducible UX bugs on the Dashboard and Goals pages:

1. **Background-refetch flicker** — User checks a goal/routine task. The checkbox briefly appears unchecked again before settling checked. Worse case: it stays unchecked until the user re-clicks.
2. **Rapid-click flicker** — User checks 3+ goal tasks quickly. Some checkboxes flash between states; in extreme cases, one or two end up in the wrong final state and only correct after a full page refetch.

Both stem from the same architectural gap: **the cache is being written from too many uncoordinated sources**, and Apollo's first-class optimistic-response machinery is not used.

## 2. Current flow (as of 2026-04-30)

### 2.1 Goal completion (`completeGoalItem`)

Click handler: `apps/web-app/src/pages/DashBoard.vue:1580-1623`

1. Pre-mutation, Dashboard manually writes to **two** caches: `updateRoutineTaskKEarnedInCache` and `updateWeekStimuliKInCache` (lines 1591-1601).
2. `useGoalMutations.completeGoalItem` (`useGoalMutations.js:444-578`) is invoked.
3. Inside that, **two more** manual cache writes: `updateGoalItemCompletionInCache` (line 482) and `updateWeekGoalProgressInCache` (line 497).
4. Apollo `mutate` is called with **no `optimisticResponse` and no `update` callback** (lines 506-511).
5. On response, a *fifth* cache write reconciles the server `status` (line 526).
6. On success, `eventBus.$emit(EVENTS.ROUTINE_TICKED)` fires, which triggers `WeekdaySelectorContainer.refetch(WEEK_STIMULI_QUERY)`.

### 2.2 Routine task tick (`checkClick`)

Click handler: `apps/web-app/src/pages/DashBoard.vue:1713-1800`

1. Mutates the prop directly: `task.ticked = true` (line 1725) — fragile in Vue 2 if the parent's data is later replaced.
2. Manual cache write `updateRoutineTaskInCache` (line 1728).
3. `tickRoutineItem` mutation fires inline (lines 1738-1765) — also no `optimisticResponse`.
4. On success, **four** sequential refetches/effects run:
   - `fetchRoutine(date, { useCache: false })` (line 1774)
   - `routineDate.refetch()` (line 1777)
   - `goals.refetch()` (line 1784)
   - `eventBus.$emit(EVENTS.ROUTINE_TICKED)` (line 1787) → another refetch in WeekdaySelector
5. On error, the prop mutation is reverted: `task.ticked = false` (line 1790).

### 2.3 Quick-add (AI Enhanced OFF) — instant create

Modal: `packages/ui/organisms/AiSearchModal/AiSearchModal.vue::handleSubmit`
Container: `apps/web-app/src/containers/AiSearchModalContainer.vue::handleDirectTaskCreate`

Pre-fix flow (now retired): the modal awaited a 1.5 s AI priority
classify before emitting `direct-task-create`, blocking the close.

Current flow:

1. Modal builds payload synchronously, falls back to `priority:do` when
   the user hasn't picked a priority tag, and sets `_aiClassifyBody` to
   the raw query text.
2. Modal closes immediately on emit.
3. Container strips `_aiClassifyBody`, calls `$goals.addGoalItem(payload)`.
   Apollo's existing optimistic response makes the row appear in the
   list in the same tick.
4. After the mutation resolves, container calls
   `refinePriorityInBackground(savedItem, body)`. The function fires
   `classifyTaskPriority` (existing AI mutation) with optional routine
   context and, only when the result differs from `do`, issues
   `$goals.updateGoalItem` to swap the priority tag in place.
5. Failures of the background refinement are swallowed — the user
   already has a usable task tagged `priority:do`.

This is a stop-gap on the way to §5.1; it shows the desired latency
profile (zero-await emit) without restructuring the cache writes.

### 2.4 Apollo policy

`main.js:161-170`:

```js
defaultOptions: {
  watchQuery: { fetchPolicy: 'cache-and-network', errorPolicy: 'ignore' },
  query:      { fetchPolicy: 'cache-and-network', errorPolicy: 'all' },
}
```

Every smart query renders cache instantly **and** fires a network request. Combined with the `intelligentRefreshMixin` (30s background interval) and the post-mutation refetch chain in 2.2, there can be **5+ concurrent in-flight queries** at any moment.

## 3. Identified flaws

| # | Site | Flaw | Severity |
|---|------|------|----------|
| F1 | `useGoalMutations.js:506` | `mutate()` has no `optimisticResponse`. Apollo doesn't know about the manual cache writes — if a refetch returns first, it overwrites silently. | **Critical** |
| F2 | `DashBoard.vue:1738` | `tickRoutineItem` mutate has no `optimisticResponse`. Same issue. | **Critical** |
| F3 | `useApolloCacheUpdates.js: updateWeekGoalProgressInCache` | Uses `delta: ±1`. Not idempotent — calling twice with the same direction (e.g. duplicate optimistic write + reconciliation) double-counts. | **High** |
| F4 | `DashBoard.vue:1725` | `task.ticked = true` mutates the prop directly. Subsequent refetch can replace `task` with a new object whose `ticked` came from server (still false), overwriting the local mutation. | **High** |
| F5 | `DashBoard.vue:1774-1787` | Four chained refetches per tick; each has its own race window. If a second tick is initiated while these are running, its optimistic state is overwritten by the first tick's refetch. | **High** |
| F6 | `useGoalMutations.js:452` | `goalStore.setCompletingGoal(true)` is global — does not disable just *the goal being mutated*. Doesn't actually prevent rapid clicks on different goals because it's set/unset per call, allowing overlap. | **Medium** |
| F7 | `useGoalMutations.js:526` | Reconciliation cache write only updates `isComplete/status/completedAt/progress` — does not include `__typename: 'GoalItem'` wrapper. Apollo's normalizer can fail silently on partial subdocs. | **Medium** |
| F8 | `useGoalMutations.js:463` | `currentTaskStore.currentTask` captured at start; if the user navigates dates before the mutation resolves, `optimisticStatus` is computed from stale context. | **Medium** |
| F9 | `intelligentRefreshMixin` | 30s background timer can trigger refetch in the middle of a tap sequence, dropping the optimistic state of any in-flight mutation. | **High** |
| F10 | `main.js:163,167` | Default `cache-and-network` for all queries means even `goalsList` UI navigation triggers background fetches that race optimistic writes. | **Medium** |

## 4. Goals & non-goals

**Goals**

- Zero flicker on single click.
- Zero flicker on N rapid clicks (per-item or across items).
- Optimistic state never lost to a background refetch while a mutation is in flight.
- Server reconciliation still corrects bad optimistic guesses (e.g. `done` → `missed`) within one render cycle.
- Network-error rollback still works (revert checkbox to original state on failure).

**Non-goals**

- We don't change the underlying GraphQL schema or server logic.
- We don't restructure Apollo Client across all queries — we change the policy for completion/tick mutations only.
- We don't introduce a new state-management library.

## 5. Design

### 5.1 First-class Apollo optimistic responses

Replace the manual pre-mutation cache writes for `completeGoalItem` and `tickRoutineItem` with Apollo's `optimisticResponse + update` pattern:

```js
apolloClient.mutate({
  mutation: COMPLETE_GOAL_ITEM_MUTATION,
  variables: { id, taskRef, date, period, isComplete, isMilestone },
  optimisticResponse: {
    __typename: 'Mutation',
    completeGoalItem: {
      __typename: 'GoalItem',
      id,
      isComplete,
      status: optimisticStatus,
      completedAt: optimisticCompletedAt,
      progress: isComplete ? 100 : 0,
    },
  },
  update: (cache, { data: { completeGoalItem: result } }) => {
    // single source of cache truth, runs both optimistically AND on real response
    applyGoalCompletionToCache(cache, { id, date, period, dayDate, result });
  },
});
```

Apollo guarantees: while the optimistic mutation is in flight, **no concurrent refetch can erase the optimistic state from the cache**. When the real response arrives, Apollo rolls back the optimistic write and re-applies `update` with the real data — atomically.

### 5.2 Pending-mutation gate for refetch overlay

Even with `optimisticResponse`, a refetch that *completes after* the optimistic write but *before* the real mutation response can still race because Apollo merges the refetch into the cache. To prevent this, we add a small in-memory `pendingMutations` set keyed by `goalId` / `taskId`. Before applying a refetch result, we filter out items whose IDs are pending.

Implementation: a `pendingMutationsPlugin` exposed as `this.$pending`. The completion functions call `this.$pending.add('goal:' + id)` before the mutation and `.remove(...)` in the `update` callback (which fires on real response). The smart queries that consume goal/routine data wrap their `result` callback to filter pending IDs from the just-arrived server payload before merging.

### 5.3 Per-item click coalescing

To eliminate same-item rapid-click flicker, requests for the *same* goal/task ID are coalesced:

- If a mutation for goal X is in flight and another click on goal X arrives, we record the *intended final state* but don't fire a second mutation.
- When the in-flight one resolves, if the recorded final state differs from the server response, we fire a *single* corrective mutation.

This keeps server load bounded, eliminates checkbox flicker, and is correct for the canonical "user changed their mind twice" pattern.

### 5.4 Idempotent week-goal progress

Replace `updateWeekGoalProgressInCache(..., delta)` with `setWeekGoalProgressInCache(..., absoluteProgress)`. Caller computes the absolute progress from the cached subtask completion counts, so duplicate calls are safe.

### 5.5 Reduced refetch fan-out

After successful tick:
- Drop `fetchRoutine(useCache: false)` and `routineDate.refetch()` and `goals.refetch()`.
- Apollo's `update` callback already wrote the correct cache. Smart queries re-render automatically.
- Keep `eventBus.$emit(EVENTS.ROUTINE_TICKED)` because aggregate week-stimuli is computed server-side from data not present in the tick mutation response.
- Make the `WeekdaySelector` refetch **debounced** (250 ms) so 3 fast ticks fire 1 refetch.

### 5.6 Disable intelligent-refresh during in-flight mutations

`intelligentRefreshMixin` checks `this.$pending.size === 0` before refetching. If anything is pending, the timer is silently skipped that tick.

### 5.7 Fix prop mutation in `checkClick`

`task.ticked = true` is removed. Vue's reactivity should be driven by the Apollo cache → the smart query's reactive `routineDate.tasklist` re-renders the checkbox after the optimistic `update` has run.

## 6. Acceptance criteria

End-to-end (Playwright) tests must pass for `grvpanchalus@gmail.com` (auth bypass via JWT injection) on a real backend:

| ID | Scenario | Expected |
|----|----------|----------|
| AC1 | Click 1 goal checkbox once | Stays checked. No flicker frame within 1 s. |
| AC2 | Click 1 goal checkbox 3× in 250 ms | Final state matches the third click. No intermediate "unchecked" frame after the first click is acked. ≤ 2 mutation calls in network log (coalescing). |
| AC3 | Click 5 different goals in 500 ms | All 5 end checked. No flicker on any. ≤ 5 mutation calls. |
| AC4 | Click goal, then immediately navigate the date selector | New date renders without checkbox flicker. Old-date mutation finishes silently. |
| AC5 | Throttle network to 3G slow, click goal, wait | Stays checked through the full latency. |
| AC6 | Inject 500 error on `completeGoalItem`, click goal | Reverts to unchecked + toast. No phantom intermediate state. |
| AC7 | Click routine task tick | Stays ticked. K stimulus updates. WeekdaySelector dot updates within 1 s. |
| AC8 | Click goal that has a parent week goal; verify week-goal progress updates and matches server post-refetch (no double count) | After 2 s, optimistic value === server value (no correction flash). |

## 7. Rollout

- Behind no flag — straight replace. Manual cache update functions are kept for the few legitimate cases (delete from cache, etc.) but completion paths route exclusively through Apollo `optimisticResponse + update`.
- Unit tests for `useApolloCacheUpdates` adjusted to reflect the new contract (apply-from-graphql-result instead of imperative `delta`).
- Playwright suite runs in CI (extension to `.github/workflows/ci.yml`).

## 8. Risk register

| Risk | Mitigation |
|------|-----------|
| Apollo's optimistic rollback can briefly flash if the `update` writes have side-effects on `WEEK_STIMULI_QUERY` that aren't in the optimistic response. | We update only the directly mutated entity in `update`; aggregate queries refetch via the debounced event-bus path post-success. |
| `pendingMutations` filter could mask a legitimate server correction. | The pending bit is cleared *as soon as* the real response arrives — corrections still flow into cache via Apollo's `update`. |
| Existing tests for `useApolloCacheUpdates` exercise the imperative cache helpers which we're partially replacing. | We keep the helpers for non-completion paths (add/delete) — only `updateGoalItemCompletionInCache` is superseded by the Apollo `update` callback. |
