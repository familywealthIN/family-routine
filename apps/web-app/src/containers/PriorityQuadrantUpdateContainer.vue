<script>
/**
 * Write unit: move one goal item between Eisenhower quadrants.
 *
 * One container, one mutation (ARCHITECTURE § 2). Renderless — it is an
 * "injected single-op mutation unit", so the page calls `assign(item, quadrant)`
 * and holds no mutation state.
 *
 * CACHE SAFETY
 * ------------
 * The mutation returns the COMPLETE GoalItem (principle #2), so Apollo
 * normalizes `GoalItem:<id>` and every query holding that id — this page's
 * board, the dashboard's `optimizedDailyGoals`, `agendaGoals` — updates at once.
 * Nothing here reads a query, clones it and writes it back.
 *
 * `optimisticResponse` covers the in-flight window so the tile count and the
 * list move on the tap rather than on the round trip. The pending-entity guard
 * cannot extend that cover past the response: `tags` is a LIST, and
 * `utils/cacheGuard` guards scalars only on purpose (a client reordering a list
 * is how the cache got corrupt in the first place). A `cache-and-network` read
 * already on the wire can therefore show the old quadrant for one frame before
 * the mutation's own result lands — which is why nothing is disabled here. The
 * response yields to the user, not the other way round.
 */
import {
  SET_GOAL_ITEM_QUADRANT_MUTATION,
  buildQuadrantVariables,
} from '../composables/graphql/priorityQueries';
import { tagsWithQuadrant } from '../utils/priorityBoard';

export default {
  name: 'PriorityQuadrantUpdateContainer',
  render() {
    return null;
  },
  methods: {
    /**
     * @param {Object} item     a board row (utils/priorityBoard `toRow`)
     * @param {String} quadrant 'do' | 'plan' | 'delegate' | 'automate'
     * @returns {Promise<Object|null>} the updated GoalItem
     */
    assign(item, quadrant) {
      if (!item || !item.id || !quadrant) return Promise.resolve(null);
      const tags = tagsWithQuadrant(item.tags, quadrant);
      const variables = buildQuadrantVariables(item, tags);

      return this.$apollo.mutate({
        mutation: SET_GOAL_ITEM_QUADRANT_MUTATION,
        variables,
        optimisticResponse: {
          updateGoalItem: {
            __typename: 'GoalItem',
            id: item.id,
            body: variables.body,
            contribution: variables.contribution,
            deadline: variables.deadline,
            reward: variables.reward,
            tags,
            isComplete: !!item.isComplete,
            isMilestone: variables.isMilestone,
            status: item.status || null,
            taskRef: variables.taskRef,
            goalRef: variables.goalRef,
            originalDate: item.originalDate || null,
          },
        },
      })
        .then(({ data }) => {
          const updated = (data && data.updateGoalItem) || null;
          this.$emit('assigned', { item, quadrant, updated });
          return updated;
        })
        .catch((error) => {
          console.error('[PriorityQuadrantUpdateContainer] assign failed:', error);
          this.$emit('error', { item, quadrant, error });
          throw error;
        });
    },
  },
};
</script>
