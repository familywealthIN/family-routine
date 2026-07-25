# Container Architecture

> Goal: stop Apollo cache corruption and let the app scale by isolating data
> ownership into small, single-responsibility containers instead of a
> ~2,500-line god component (`DashBoard.vue`) that owns every query, every
> mutation, and a ~1,000-line hand-rolled cache-surgery layer.

This is the reference every new feature should follow. It is deliberately
opinionated so that "where does this logic go?" always has one answer.

---

## 1. The pattern: Presentational / Container

(See patterns.dev — Presentational and Container Components.)

| Layer | Lives in | Knows about | Never does |
|-------|----------|-------------|------------|
| **Atom / Molecule / Organism** (presentational) | `packages/ui/**` | Props in, `$emit` out. Pure. Stateless w.r.t. the server. | No Apollo, no stores, no `fetch`, no routing, no cache. |
| **Container** | `apps/web-app/src/containers/**` | One organism + one GraphQL operation + its cache slice. | No presentational markup beyond mounting its organism. |
| **Page** | `apps/web-app/src/pages/**` | Layout + composition of containers. | No direct queries/mutations. Owns route + which containers render. |

A **presentational organism** is a function of its props. Give it the same
props → it renders the same thing. That is what makes it testable in
Storybook and immune to cache bugs.

A **container** is the *only* place that talks to Apollo. It adapts server
state ⇄ organism props/events.

---

## 2. The rule: one container = one organism = one CRUD op

Each container owns **exactly one** GraphQL responsibility:

- a **Read** container owns one scoped query and feeds an organism, **or**
- a **Write** container owns one mutation (`Create` / `Update` / `Delete`) and
  updates the cache for that one entity.

An organism that needs a read *and* several writes is composed from several
containers (a read container that renders the organism, whose write events are
handled by injected single-op mutation units). One container never reaches into
another entity's cache.

Why: when a file can only touch one operation and one entity, a bug in it can
only corrupt that one slice — never the whole dashboard. Blast radius = one
container.

### Naming

```
containers/
  <Feature><Entity><Op>Container.vue      // e.g. RoutineGoalItemsContainer.vue (Read)
  <Feature><Entity><Op>Container.vue      // e.g. GoalItemCompleteContainer.vue  (Update)
```

Read containers may drop the `<Op>` suffix (`...Container.vue`). Write
containers name the op (`...CompleteContainer`, `...DeleteContainer`).

---

## 3. Cache-safety principles (Apollo Client 2.x)

This app runs **Apollo Client 2.x** (vue-apollo). It has **no `typePolicies`
and no field `merge` functions** (those are Apollo 3). So cache correctness is
*our* responsibility and must follow these rules. Breaking them is how the
cache got corrupt.

1. **Write by entity id, never by cloning a whole query.**
   Use `cache.writeFragment({ id: 'GoalItem:<id>', fragment, data })` /
   `readFragment`. Do **not** `readQuery → cloneDeep → mutate → writeQuery`.
   Query-level rewrites are how the same entity in two queries
   (`optimizedDailyGoals` *and* `agendaGoals` both hold week goals) drift apart.
   See `composables/useEntityCache.js`.

2. **Mutations return the *complete* entity, with correct `__typename`.**
   If `completeGoalItem` returns `{ id, isComplete, status, completedAt,
   progress }`, Apollo normalizes it into `GoalItem:<id>` and **every** query
   that references that id updates for free — no manual surgery. Returning a
   partial `Goal { goalItems }` array *replaces* the normalized list and drops
   siblings. Never return a partial list field.

3. **Correct `__typename` on every embedded object.**
   Embedded (non-normalized) objects — `StimuliItem`, `SubTaskItem` — must carry
   their real `__typename`. A wrong one (`Stimulus`, `Task`) mints a mistyped
   object and corrupts the parent entry. (This caused the tick-revert bug.)

4. **Display queries are `cache-and-network`.**
   So a partial/stale/corrupt slice self-heals against the server on the next
   paint instead of lingering `cache-first` until an unrelated refetch fires.
   (This was the "goal items appear ~1s after expand" symptom.)

5. **One query, stable variables, per container.**
   A container's query variables are derived only from its props. No two
   containers write the same entity through two different queries.

6. **De-dupe list inputs by id before `v-for`.**
   Routine items reuse their `_id`; duplicate ids → duplicate `:key` → Vue
   renders one entity twice and patches unreliably. Containers hand organisms
   de-duped lists. (This caused the overlapping agent-status badges.)

7. **Gate write controls while their feeding query is in-flight.**
   A `cache-and-network` read that started *before* a tap resolves *after* it and
   overwrites the just-mutated entity — Apollo 2.x has no field `merge` to protect
   it. So disable the tick circle / goal checkbox on `$apollo.queries.<q>.loading`
   until the refetch lands. See DashBoard `isRoutineBusy` / `isGoalsBusy` and the
   `busy` organism prop threaded into `GoalItemList` / `AgendaTaskList`. The
   durable end-state is a **pending-entity guard** (skip overwriting an entity
   with an unconfirmed local mutation until a read issued *after* it confirms),
   which removes the need to disable at all. (This caused the tick/checkbox
   revert-on-open bug.)

---

## 4. Anatomy of a container

```vue
<template>
  <!-- exactly one organism; props down, events up -->
  <GoalItemList
    :goal="goal"
    :loading="$apollo.queries.goalSlice.loading && !goal"
    @complete-goal-item="onComplete"
    @delete-task-goal="onDelete"
  />
</template>

<script>
import GoalItemList from '@routine-notes/ui/organisms/GoalItemList/GoalItemList.vue';
import { GOAL_ITEMS_FOR_TASK_QUERY } from '../composables/graphql/queries';

export default {
  name: 'RoutineGoalItemsContainer',
  components: { GoalItemList },
  // props are the container's *only* input — never reads global state ad hoc
  props: {
    taskRef: { type: String, required: true },
    date:    { type: String, required: true },
    period:  { type: String, default: 'day' },
  },
  apollo: {
    goalSlice: {
      query: GOAL_ITEMS_FOR_TASK_QUERY,
      fetchPolicy: 'cache-and-network',        // principle #4
      variables() { return { taskRef: this.taskRef, date: this.date, period: this.period }; },
      update: (d) => d.goalItemsForTask,
      skip() { return !this.taskRef; },
    },
  },
  computed: {
    goal() { /* shape the slice for the organism */ },
  },
  methods: {
    // write ops delegate to single-op, entity-level cache-safe units
    onComplete(evt) { /* GoalItemComplete unit — writeFragment by id */ },
    onDelete(evt)   { /* GoalItemDelete unit   — evict by id */ },
  },
};
</script>
```

Rules the anatomy encodes:
- Input is **props only**. A container is a pure function of its props +
  server cache, so it is predictable and independently mountable.
- The organism import is the **only** child. No layout, no siblings.
- Mutations go through single-op cache-safe units, not inline `readQuery`
  surgery.

---

## 5. Migration plan (strangler fig — never a big-bang)

`DashBoard.vue` stays working the whole time. We wrap the fragile bits first.

1. **Robustness patches** (done): `routineDate` and `goals` are
   `cache-and-network`; `displayTasklist` de-dupes by id. Corruption now
   self-heals while we refactor.
2. **Entity-cache primitive** (`useEntityCache.js`): `writeFragment`-based
   update/evict helpers. New containers use this; old surgery is deleted as
   each flow migrates.
3. **Reference container**: the goal-items-on-expand flow becomes
   `RoutineGoalItemsContainer`. It is the template every other container copies.
4. **Migrate outward, one organism at a time**, each behind a feature-parity
   check: CurrentTaskCard goals → UpcomingPastTasks goals → AgendaTaskList →
   tick/redeem. Each migration deletes its slice of `useApolloCacheUpdates.js`.
5. **Server**: extend mutation return shapes to the complete entity so
   principle #2 lets us delete manual cache updates entirely.

Definition of done for a flow: its organism has zero Apollo imports, its
container owns one op, its cache writes go through `useEntityCache`, and the
matching `useApolloCacheUpdates` function is gone.

---

## 6. Cross-domain writes are page-orchestrated (by design)

Some dashboard actions fan out across domains: completing a goal item moves the
routine task's **K-stimulus**, nudges the **week-streak** aggregate, may fire the
task's **agent end-event**, and refetches daily goals. That orchestration
belongs to the **page**, not to any one container — forcing it into a single
container would couple unrelated domains, the exact opposite of "less
bug-prone". So the rule is applied like this:

- A container owns its **organism** + its **single-domain** read/write (e.g.
  `GoalItemListContainer` owns the goal-item write CRUD via the entity-cache
  path; `WeekGoalStreakContainer` owns the week-goal read).
- When an action crosses domains, the container emits it and the **page**
  coordinates the affected domains. `DashBoard.completeGoalItem` is a legitimate
  page-level orchestrator, not a container concern.
- Every organism still gets a **container home** that localizes its data-in /
  events-out contract into one file, so the page template is thin and each
  organism's integration lives in exactly one place.

## 6b. Data-provider: containers own their READ (provide/inject)

Every dashboard container's data is a **derived slice of one shared root**
(`routineDate` + `goals` + `xpBalance`) that the page *also* needs for
orchestration. Giving each container its own independent query would duplicate
that root and risk divergence. So the read is organised as a **data provider**:

- The **page owns the smart queries** and exposes them via `provide()` as a
  reactive `routineData` facade (getters keep Vue 2 reactivity — a container
  computed that reads `routineData.goals` transparently subscribes to the page's
  `displayGoals`).
- The **display/derivation logic is a pure module** — `utils/routineTaskDisplay.js`
  (`getButtonIcon`, `getButtonDisabled`, `isRedeemable`, `getRedeemCost`,
  `canAffordRedeem`, `countTaskTotal/Completed/Percentage`,
  `filterTaskGoalsPeriod`, `getTaskStatus`). It is the single source of truth
  shared by the containers (the provider wires it with page state like
  `isTodaySelected`) AND the page's tick/redeem orchestration, and it's
  unit-tested in isolation. `enrichTasksForUpcomingPast` / `filterUpcomingPastTask`
  now live inside `UpcomingPastTasksContainer` (its sole consumer).
- Each container `inject: ['routineData']` and **derives its own slice** — its
  read — in its own computeds. The page no longer computes `upcomingTasksMeta`,
  `pastTasksMeta`, `weekGoalsForCurrentTask`, `currentAgentStatus`,
  `todayGoalItemsGrouped`, `nonTodayGoalItems`, nor threads them down as props.
- **Writes stay page-orchestrated**: containers forward events via
  `v-on="$listeners"`. Two-way `.sync` (tabs, goal-period) round-trips as
  `@update:*` — the container reads the value from the provider, the organism
  emits the change up, the page writes it back, and every container sees it.

**No server mutation change was needed:** containers read the *same* normalized
cache the page's queries + our entity-level cache updates already maintain, so
a mutation that updates `GoalItem:<id>` updates every container's derived read
at once. (A server-return change would only be required if a container ran a
*new* scoped query whose entities a mutation returned only partially — which
this provider approach deliberately avoids.)

## 7. Container catalog (dashboard)

| Container | Organism | Owns | Status |
|-----------|----------|------|--------|
| `GoalItemListContainer` | `GoalItemList` | goal-item write CRUD (entity-cache) | built + wired (GoalsTime) |
| `CurrentTaskContainer` | `CurrentTaskCard` | **derives** current-task read via inject | built + wired (DashBoard) |
| `UpcomingPastTasksContainer` | `UpcomingPastTasks` | **derives** upcoming/past meta via inject | built + wired (DashBoard) |
| `WeekGoalStreakContainer` | `WeekGoalStreak` | **derives** week-goal read + show/hide via inject | built + wired (DashBoard) |
| `AgendaTaskListContainer` | `AgendaTaskList` | **derives** grouped goals via inject (`mode`); **owns** agenda-mode goal writes (emits `changed`), forwards today-mode writes | built + wired (DashBoard, both views) |
| `StimulusSummaryContainer` | `StimulusSummary` (new organism) | **derives** D/K/G totals via inject (utils/stimulusTotals) | built + wired (DashBoard) |
| `AgentEditModalContainer` | `AgentEditModal` | **agent domain** (routine options + save refetch); imperative `open(taskRef)` | built + wired |
| `PaywallDrawerContainer` | `PaywallDrawer` | drawer open/cost state; imperative `open(cost)` | built + wired |
| `StepModalContainer` | (routine-steps dialog) | modal home (no GraphQL); `open(task)` | built + wired |
| `GoalDetailsModalContainer` | `GoalListContainer` | "Add Goal" dialog chrome (v-model) | built + wired |
| `GoalDisplayModalContainer` | `GoalCreationContainer` | goal-editor dialog chrome (v-model) | built + wired |
| `QuickTaskModalContainer` | `QuickGoalCreationContainer` | quick-task dialog chrome (v-model) | built + wired |

**Modal container convention:** an isolated-domain modal (agent) uses an
imperative `open()/close()` API so the page holds *no* modal state. A modal
that's toggled from many page flows (goal editor) keeps its boolean on the page
via `v-model` and the container owns only the dialog chrome + inner container.

**Which GraphQL moved:** only the **agent** domain (its sole consumer is
`AgentEditModalContainer`). `routineDate` / `goals` / `agendaGoals` / `xpBalance`
/ `redeem` stay page-owned — each feeds multiple organisms or the page's
redeem/completion orchestration (see §6).

Cache-safety primitive: `composables/useEntityCache.js` (`patchGoalItem` /
`patchRoutineItem`, writeFragment by id). `completeGoalItem` already patches
entity-level; `goals` + `routineDate` are `cache-and-network`.

**Next (incremental, live-verified between steps):** move each organism's read
into its container as a scoped query (so the page stops owning shared queries),
extend server mutation return shapes to the complete entity (principle #2), and
delete the matching slice of `useApolloCacheUpdates.js`. Existing containers
(`GoalListContainer`, `QuickGoalCreationContainer`, `AiSearchModalContainer`, …)
should be audited against §3 as they are touched.
