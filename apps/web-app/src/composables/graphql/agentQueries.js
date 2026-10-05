/**
 * Agents page GraphQL operations.
 *
 * WHAT IS *NOT* HERE, AND WHY
 * ---------------------------
 * The agent CRUD itself (`agents`, `agentByTaskRef`, `addAgent`, `updateAgent`,
 * `deleteAgent`, `recordAgentExecution`) already lives in
 * `composables/useAgentQueries.js` and runs through the `$agent` store, which is
 * the agent domain's single source of truth: the dashboard's status badges, the
 * quick-goal "Start Agent" button and the Service Worker replay all read it.
 * Re-declaring those operations here would give the same entity two owners —
 * precisely the drift ARCHITECTURE.md §3 exists to prevent. The Agents page
 * therefore reads the store and only owns the one read the store does not have:
 * the routine list it needs to turn a `taskRef` into "09:00 Start Work".
 *
 * (`queries.js` is deliberately untouched — it is shared by every other page.)
 */
import gql from 'graphql-tag';

/**
 * Routines an agent can be bound to. No variables, so every container that
 * declares it shares ONE normalized cache entry (the
 * `MissedDayRecovery`/`WeekdaySelector` precedent) rather than racing copies.
 */
export const AGENT_ROUTINE_ITEMS_QUERY = gql`
  query agentsRoutineItems {
    routineItems {
      id
      name
      time
    }
  }
`;

export default { AGENT_ROUTINE_ITEMS_QUERY };
