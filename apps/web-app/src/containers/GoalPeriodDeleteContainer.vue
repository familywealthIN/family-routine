<script>
/**
 * Write unit: delete ONE goal item (the ⋮ sheet's "Delete").
 *
 * The server cascades: `deleteGoalItem` removes every transitive `goalRef`
 * descendant, so deleting a month goal takes its weeks and their days with it.
 * The sheet's copy has to say so — this container only performs it.
 *
 * Apollo 2.x has no `cache.evict`, and the mutation returns `{ id, date, period }`
 * and nothing else, so the deleted entity cannot be patched into a complete
 * shape. The removal therefore lands through the display query's
 * `cache-and-network` refetch, which the page triggers on `deleted`. No
 * hand-cloned list write (ARCHITECTURE § 3.1).
 */
export default {
  name: 'GoalPeriodDeleteContainer',

  render() {
    return null;
  },

  methods: {
    remove(item) {
      if (!item || !item.id || !item.date || !item.period) return Promise.resolve(null);

      return this.$goals.deleteGoalItem({
        id: item.id,
        date: item.date,
        period: item.period,
      })
        .then((result) => {
          this.$emit('deleted', { item, result });
          return result;
        })
        .catch((error) => {
          console.error('[GoalPeriodDeleteContainer] deleteGoalItem failed:', error);
          this.$emit('error', { item, error });
          throw error;
        });
    },
  },
};
</script>
