/**
 * The Routines (settings) screen's GraphQL — `/settings`.
 *
 * WHAT IS *NOT* HERE, AND WHY
 * ---------------------------
 * The linked year goal is read through `YEAR_GOALS_LIST_QUERY` in
 * `./yearGoalQueries.js`, not re-declared here. That query is already the
 * side-effect-free year read (`currentYearGoals` does not call
 * `autoCheckTaskPeriod`, so looking at this page cannot auto-tick a goal), it
 * already returns COMPLETE `goalItems` rather than a narrowed projection, and
 * re-declaring it would give one entity two owners — the drift
 * ARCHITECTURE.md §3 exists to prevent.
 *
 * The agent bound to a routine comes from the `$agent` store
 * (`composables/useAgentQueries.js`), which is the agent domain's single source
 * of truth. The dashboard badges, the Service Worker replay and this page all
 * read the same store.
 *
 * `queries.js` is deliberately untouched — it is shared by every other page.
 *
 * THE FIELD SET IS THE INTERESTING PART
 * -------------------------------------
 * A routine item's document is reused across days: `routine.tasklist` embeds
 * copies that keep the template's `_id`, so EVERY day's copy and the template
 * itself normalize into the one cache record `RoutineItem:<id>`.
 *
 * That makes `ticked` / `passed` / `wait` / `redeemed` / `passedPoints` /
 * `stimuli` per-DAY state living on a shared record, and the dashboard owns
 * them. The old settings page selected `ticked` and `passed` for a table that
 * printed neither — which let a settings refetch write the template's stale
 * `ticked: false` over a tick the user had just made on Home. So this page reads
 * only the template fields it actually renders, and the mutations return exactly
 * the same set. Nothing on `/settings` is a second writer of the day's state.
 *
 * Returning the same complete set from every mutation is what makes the cache
 * update free (ARCHITECTURE.md §3.2): Apollo normalizes `RoutineItem:<id>` and
 * every query holding that id updates at once. It is also what protects the save
 * from the revert race — `guardLink` confirms every scalar a mutation returns, so
 * a `cache-and-network` read that left before the save cannot overwrite it
 * (utils/cacheGuard.js). No control is ever disabled for a request in flight.
 */
import gql from 'graphql-tag';

/**
 * Every field the Routines screen renders off a routine template — and nothing
 * that belongs to a particular day. Shared by the read and all three writes so
 * the normalized record can never go partial.
 */
const ROUTINE_TEMPLATE_FIELDS = `
  id
  name
  description
  time
  points
  tags
  steps {
    id
    name
  }
`;

/**
 * The routine templates, in whatever order Mongo returns them — the dial and the
 * timeline both sort client-side (`utils/dayDial.sortByTime`), because that one
 * sort is what makes saving re-order the list and redraw the dial together.
 *
 * No variables, so every container that declares it observes ONE normalized
 * cache entry rather than racing copies (the `AGENT_ROUTINE_ITEMS_QUERY`
 * precedent).
 */
export const ROUTINE_SETTINGS_ITEMS_QUERY = gql`
  query routineSettingsItems {
    routineItems {
      ${ROUTINE_TEMPLATE_FIELDS}
    }
  }
`;

export const ADD_ROUTINE_ITEM_MUTATION = gql`
  mutation addRoutineItem(
    $name: String!
    $description: String!
    $time: String!
    $points: Int!
    $steps: [StepInputItem]!
    $tags: [String]!
  ) {
    addRoutineItem(
      name: $name
      description: $description
      time: $time
      points: $points
      steps: $steps
      tags: $tags
    ) {
      ${ROUTINE_TEMPLATE_FIELDS}
    }
  }
`;

export const UPDATE_ROUTINE_ITEM_MUTATION = gql`
  mutation updateRoutineItem(
    $id: ID!
    $name: String!
    $description: String!
    $time: String!
    $points: Int!
    $steps: [StepInputItem]!
    $tags: [String]!
  ) {
    updateRoutineItem(
      id: $id
      name: $name
      description: $description
      time: $time
      points: $points
      steps: $steps
      tags: $tags
    ) {
      ${ROUTINE_TEMPLATE_FIELDS}
    }
  }
`;

/**
 * Delete returns the removed routine's id only. Apollo 2.x has no `cache.evict`,
 * so the list is healed by refetching this page's one read — never by cloning
 * `routineItems` and writing a shortened copy back (ARCHITECTURE.md §3.1).
 */
export const DELETE_ROUTINE_ITEM_MUTATION = gql`
  mutation deleteRoutineItem($id: ID!) {
    deleteRoutineItem(id: $id) {
      id
    }
  }
`;

export default {
  ROUTINE_SETTINGS_ITEMS_QUERY,
  ADD_ROUTINE_ITEM_MUTATION,
  UPDATE_ROUTINE_ITEM_MUTATION,
  DELETE_ROUTINE_ITEM_MUTATION,
};
