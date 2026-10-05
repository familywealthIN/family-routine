<script>
/**
 * Read container: which year goal each routine is working towards.
 *
 * The Routines screen shows this twice — a `flag` chip on a timeline row and the
 * LINKED year-goal row inside the editor — so it is one read with one owner
 * rather than two components asking.
 *
 * Renderless with a scoped slot (the `XpBalanceContainer` pattern): the thing it
 * feeds is not one organism but a map two organisms consume, and the page is
 * where a cross-organism value belongs.
 *
 * WHY THIS QUERY
 * --------------
 * `YEAR_GOALS_LIST_QUERY` is reused, never re-declared (see
 * `graphql/routineSettingsQueries.js`). It matters which year read this is:
 * `currentYearGoals` is one of only two goal reads that do NOT call
 * `autoCheckTaskPeriod`, which mutates while it reads — so opening /settings
 * cannot auto-complete somebody's goals as a side effect of drawing a chip. It
 * also returns each year `Goal`'s COMPLETE `goalItems`, so nothing here is a
 * narrowed projection reusing an entity's id (the `goalsByGoalRef` truncation).
 *
 * The percentage is derived, not read: `progress` is never persisted and this
 * resolver does not compute it, so `buildYearGoal` counts the month milestones
 * and `yearPercent` rounds the RATIO — 5 of 6 months is 83%, not 84%
 * (chassis.md § "The goal cascade").
 */
import { YEAR_GOALS_LIST_QUERY } from '../composables/graphql/yearGoalQueries';
import { buildYearGoal, isYearGoalItem, yearItemIdsOf } from '../utils/yearGoalModel';

export default {
  name: 'RoutineYearGoalLinksContainer',

  data() {
    return { yearGoals: [] };
  },

  apollo: {
    yearGoals: {
      query: YEAR_GOALS_LIST_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) {
        return (data && data.currentYearGoals) || [];
      },
    },
  },

  computed: {
    /**
     * routine id -> `{ id, body, pct }`.
     *
     * A year goal with no `taskRef` is not linked to a routine and is skipped;
     * a year item that is a step toward a sibling year goal is skipped too
     * (`isYearGoalItem`). `isMilestone` is deliberately NOT the test: a year goal
     * hung off a lifetime goal carries it, and filtering on the flag is what
     * made every such routine read "No year goal linked". First one wins when
     * two goals name the same routine — the row has space for one.
     */
    links() {
      const map = {};
      const yearIds = yearItemIdsOf(this.yearGoals);
      (this.yearGoals || []).forEach((goal) => {
        ((goal && goal.goalItems) || []).forEach((item) => {
          if (!isYearGoalItem(item, yearIds) || !item.taskRef) return;
          const key = String(item.taskRef);
          if (map[key]) return;
          const tree = buildYearGoal({ ...item, period: 'year', date: item.date || goal.date });
          if (!tree) return;
          map[key] = { id: tree.id, body: tree.body, pct: tree.percent };
        });
      });
      return map;
    },
  },

  watch: {
    links: {
      immediate: true,
      handler(map) {
        this.$emit('links', map);
      },
    },
  },

  render() {
    const slot = this.$scopedSlots.default;
    return slot ? slot({ links: this.links }) : null;
  },
};
</script>
