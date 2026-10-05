<template>
  <year-goal-switcher
    :rows="rows"
    :sort-chips="sortChips"
    :sort="sort"
    :query="query"
    :open="open"
    :shell="shell"
    :compact="compact"
    :year="year"
    :year-threshold="thresholds.year"
    :failed="failed"
    v-on="$listeners"
    @retry="refetch"
  />
</template>

<script>
/**
 * Read container for the year-goal switcher — the phone sheet, the tablet shelf
 * and the desktop sidebar all mount this one container (ARCHITECTURE § 2).
 *
 * One query: `currentYearGoals`. Like `currentYearGoal` it does not call
 * `autoCheckTaskPeriod`, so opening the switcher cannot complete anybody's goal.
 *
 * Search and sort are NOT server-side. They are derived from the one full read by
 * `yearGoalModel.yearGoalRows`, because a filtered query would hand Apollo the
 * same `Goal` ids with a shorter `goalItems` list and replace the real one — the
 * exact shape of the `goalsByGoalRef` truncation that collapsed a 14-item goal to
 * 2 (ARCHITECTURE § 3.1).
 */
import YearGoalSwitcher from '@routine-notes/ui/organisms/YearGoalSwitcher/YearGoalSwitcher.vue';
import { YEAR_GOALS_LIST_QUERY } from '../composables/graphql/yearGoalQueries';
import { TH, SORT_CHIPS, yearGoalRows } from '../utils/yearGoalModel';

export default {
  name: 'YearGoalListContainer',

  components: { YearGoalSwitcher },

  props: {
    activeId: { type: String, default: '' },
    /** 'routine' | 'progress' — the page owns the chip, this derives from it. */
    sort: { type: String, default: 'routine' },
    query: { type: String, default: '' },
    /** Overlay visibility on phone/tablet. The organism stays mounted either way. */
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    compact: { type: Boolean, default: false },
    /** DD-MM-YYYY, injected for tests. */
    today: { type: String, default: '' },
  },

  data() {
    return {
      yearGoals: [], failed: false, sortChips: SORT_CHIPS, thresholds: TH,
    };
  },

  apollo: {
    yearGoals: {
      query: YEAR_GOALS_LIST_QUERY,
      fetchPolicy: 'cache-and-network',
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        this.failed = false;
        return data.currentYearGoals || [];
      },
      error(error) {
        console.error('[YearGoalListContainer] currentYearGoals query error:', error);
        // A failed read must not read as "No year goals yet." — the switcher
        // shows an error with a Retry instead.
        this.failed = true;
      },
    },
  },

  computed: {
    rows() {
      return yearGoalRows(this.yearGoals, {
        activeId: this.activeId,
        query: this.query,
        sort: this.sort,
        today: this.today || undefined,
      });
    },
    /**
     * Ids only, in list order, so the page can step ‹ › through them.
     *
     * From the UNFILTERED list: the switcher's search narrows the sheet's rows,
     * never the hero's ‹ › and "n of N" — a query that excluded the open goal
     * would otherwise hide them.
     */
    ids() {
      return yearGoalRows(this.yearGoals, {
        activeId: this.activeId,
        sort: this.sort,
        today: this.today || undefined,
      }).filter((row) => !row.header).map((row) => row.id);
    },
    year() {
      const first = (this.yearGoals || [])[0];
      const date = first && first.date;
      const year = date ? Number(String(date).slice(-4)) : 0;
      return year || new Date().getFullYear();
    },
  },

  methods: {
    refetch() {
      this.failed = false;
      const query = this.$apollo.queries.yearGoals;
      if (query) query.refetch().catch(() => {});
    },
  },

  watch: {
    ids: {
      immediate: true,
      handler(ids) {
        // The page needs the ordered ids for the ‹ › steppers and to land on a
        // goal when the route carries none. It never needs the rows themselves.
        this.$emit('ids', ids);
      },
    },
  },
};
</script>
