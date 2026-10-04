<script>
/**
 * Write unit: rename ONE goal item (the ⋮ sheet's "Edit …").
 *
 * `updateGoalItem` types nine of its arguments NonNull, including `taskRef`,
 * `goalRef`, `deadline`, `contribution` and `reward` — so every one has to be
 * echoed back or the mutation is rejected, and an omitted field would be sent as
 * '' and wipe what is stored. The original item is therefore required, not
 * optional, and only `body` is allowed to differ.
 *
 * Editing the parent or the period is deliberately NOT possible here: a period
 * change would make the server delegate to `moveGoalItem` and re-file the item
 * under another Goal document, which is a different act than renaming it.
 */
export default {
  name: 'GoalPeriodUpdateContainer',

  render() {
    return null;
  },

  methods: {
    /**
     * @param {Object} item the goal item as read (id, period, date, …)
     * @param {string} body the new body
     */
    rename(item, body) {
      const next = String(body || '').trim();
      if (!item || !item.id || !next || next === item.body) return Promise.resolve(null);

      return this.$goals.updateGoalItem({
        id: item.id,
        body: next,
        period: item.period,
        date: item.date,
        isMilestone: !!item.isMilestone,
        // NonNull on the server — echo what is stored rather than send nothing.
        deadline: item.deadline || '',
        contribution: item.contribution || '',
        reward: item.reward || '',
        taskRef: item.taskRef || '',
        goalRef: item.goalRef || '',
        tags: item.tags || [],
      })
        .then((result) => {
          this.$emit('renamed', { item, body: next, result });
          return result;
        })
        .catch((error) => {
          console.error('[GoalPeriodUpdateContainer] updateGoalItem failed:', error);
          this.$emit('error', { item, error });
          throw error;
        });
    },
  },
};
</script>
