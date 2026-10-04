<script>
/**
 * Write unit: tick / untick ONE goal item of any period, and nothing else.
 *
 * It delegates to `$goals.completeGoalItem`, which already owns this write's
 * optimistic response, its entity-level `writeFragment` patch and its
 * `guardFields` claim (`composables/useGoalMutations`). Re-implementing any of
 * that here would be a second source of truth for the same mutation.
 *
 * `taskRef` is `String!` on the server and a month / week / year goal has no
 * routine, so '' is passed — the resolver only reads it when
 * `period === 'day'`. That is also why `status` and `completedAt` come back for a
 * period item without having been persisted: only `isComplete` is saved above
 * day level. Nothing on this page reads a period item's `status`.
 *
 * `tick()` takes the plan `yearGoalModel.planTick` produced, so the cascade
 * crosses one level per mutation IN ORDER (day, then week, then month, then
 * year) — the same order the server's own `autoCheckTaskPeriod` would use, and
 * sequential because each parent's completion is a consequence of the child's.
 *
 * Nothing is disabled while a mutation is in flight (ARCHITECTURE § 3.7).
 */
export default {
  name: 'GoalPeriodTickContainer',

  render() {
    return null;
  },

  methods: {
    /**
     * @param {Array} ticks `planTick().ticks`
     * @returns {Promise<Array>} the mutation results, in the order applied
     */
    async tick(ticks) {
      const list = Array.isArray(ticks) ? ticks : [];
      const results = [];
      for (let i = 0; i < list.length; i += 1) {
        const t = list[i];
        if (t && t.id && t.date && t.period) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const result = await this.$goals.completeGoalItem({
              id: t.id,
              taskRef: t.taskRef || '',
              date: t.date,
              period: t.period,
              isComplete: !!t.isComplete,
              isMilestone: !!t.isMilestone,
            });
            results.push(result);
          } catch (error) {
            console.error('[GoalPeriodTickContainer] completeGoalItem failed:', error);
            this.$emit('error', { tick: t, error });
            throw error;
          }
        }
      }
      this.$emit('ticked', { ticks: list, results });
      return results;
    },
  },
};
</script>
