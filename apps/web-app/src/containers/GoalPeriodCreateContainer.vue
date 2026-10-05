<script>
/**
 * Write unit: create ONE month / week / day goal under a locked parent.
 *
 * `goalRef` is the parent's goal-item id and `isMilestone` is therefore always
 * true here — a goal created from inside a year goal's card exists to roll up
 * into it. The create sheet shows that parent as a locked chip precisely because
 * this container will not accept a different one.
 *
 * Delegates to `$goals.addGoalItem`, which owns the optimistic response and the
 * cache write for the `(date, period)` Goal document it lands in. Creates are
 * sequential at the call site (see `createMany`) because that cache write reads
 * the day/period goal it just wrote to.
 */
export default {
  name: 'GoalPeriodCreateContainer',

  render() {
    return null;
  },

  methods: {
    /**
     * @param {Object} draft `yearGoalModel.createDraft()` plus `{ body }`
     * @returns {Promise<Object|null>} the created goal item
     */
    create(draft) {
      const body = String((draft && draft.body) || '').trim();
      if (!body || !draft || !draft.period || !draft.date) return Promise.resolve(null);

      return this.$goals.addGoalItem({
        body,
        period: draft.period,
        date: draft.date,
        taskRef: draft.taskRef || undefined,
        goalRef: draft.goalRef || undefined,
        isComplete: false,
        isMilestone: !!draft.goalRef,
        tags: draft.tags || [],
        contribution: draft.contribution || '',
      })
        .then((created) => {
          this.$emit('created', { draft, created });
          return created;
        })
        .catch((error) => {
          console.error('[GoalPeriodCreateContainer] addGoalItem failed:', error);
          this.$emit('error', { draft, error });
          throw error;
        });
    },

    /**
     * Several goals at once — the chat's "Add N week goals".
     *
     * A LIST OF DRAFTS, not a list of bodies: consecutive week goals need
     * consecutive dates, and only the caller (which knows the month's existing
     * weeks) can number them. Sequential, and one failure does not abandon the
     * rest — the user asked for a plan, not for all-or-nothing.
     */
    async createMany(drafts) {
      const created = [];
      const list = Array.isArray(drafts) ? drafts : [];
      for (let i = 0; i < list.length; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const item = await this.create(list[i]);
          if (item && item.id) created.push(item);
        } catch (error) {
          console.error('[GoalPeriodCreateContainer] createMany item failed:', error);
        }
      }
      return created;
    },
  },
};
</script>
