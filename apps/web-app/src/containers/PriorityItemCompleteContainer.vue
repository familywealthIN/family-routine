<script>
/**
 * Write unit: tick / untick one Priority row.
 *
 * One container, one op — `$goals.completeGoalItem`, which already owns the
 * optimistic response, the entity-level cache patch and the `guardFields` claim
 * (see composables/useGoalMutations). Re-implementing any of that here would be
 * a second source of truth for the same write, so this container only adapts the
 * row shape to the op's parameters and reports the outcome.
 *
 * Nothing is disabled while the mutation is in flight: the pending-entity guard
 * handles the race (ARCHITECTURE principle #7) and the `busy` prop is gone.
 */
export default {
  name: 'PriorityItemCompleteContainer',
  props: {
    /** The day the board is showing — the cache's `dayDate` for the patch. */
    date: { type: String, required: true },
  },
  render() {
    return null;
  },
  methods: {
    /**
     * @param {Object} item a board row (utils/priorityBoard `toRow`)
     * @returns {Promise<Object|null>}
     */
    toggle(item) {
      if (!item || !item.id) return Promise.resolve(null);
      const isComplete = !item.isComplete;

      return this.$goals.completeGoalItem({
        id: item.id,
        taskRef: item.taskRef || '',
        date: item.date,
        period: item.period,
        isComplete,
        isMilestone: !!item.isMilestone,
        dayDate: this.date,
      })
        .then((result) => {
          this.$emit('completed', { item, isComplete, result });
          return result;
        })
        .catch((error) => {
          console.error('[PriorityItemCompleteContainer] toggle failed:', error);
          this.$emit('error', { item, isComplete, error });
          throw error;
        });
    },
  },
};
</script>
