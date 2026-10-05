<template>
  <GoalCalendar
    :month-label="monthLabel"
    :cells="cells"
    :collapsible="collapsible"
    :expanded="expanded"
    :hint="hint"
    :load-error="loadError"
    v-on="$listeners"
    @retry="refresh"
  />
</template>

<script>
/**
 * Container home for the GoalCalendar molecule (see ARCHITECTURE.md § 2).
 *
 * ONE read: a month of day goals. It is a separate container from the cascade
 * list because it asks a different question — the list needs the five periods
 * around ONE date, the grid needs one period across THIRTY dates — and because
 * `goalsOptimized` is the only field that answers the second one.
 *
 * It must not be `goalsOptimized` with `progress` selected: that resolver never
 * computes the field, and both reads normalize into the same `GoalItem:<id>`
 * records, so asking for it would write null over the count the cascade read
 * just published. See `graphql/goalsQueries.js` for the whole argument.
 *
 * Month navigation lives on `monthDate`, NOT on `selectedDate`. The month in
 * view is this container's variable alone, so a step back three months is three
 * reads of THIS query and none of the cascade's — which matters because the
 * cascade's resolver writes (`autoCheckTaskPeriod`), and browsing must not
 * auto-tick days the user never selected. `goalsOptimized` already returns every
 * day of the asked-for month "including past", so a past month needs no second
 * query (`goalsPast` would be a second cache owner for records this one already
 * holds — see `graphql/goalsQueries.js`).
 *
 * No mutations, so no cache writes and nothing to guard.
 */
import moment from 'moment';
import GoalCalendar from '@routine-notes/ui/molecules/GoalCalendar/GoalCalendar.vue';
import { GOALS_CALENDAR_QUERY } from '../composables/graphql/goalsQueries';
import { DATE_FORMAT, calendarCells } from '../utils/goalCascade';

export default {
  name: 'GoalCalendarContainer',

  components: { GoalCalendar },

  props: {
    /** DD-MM-YYYY — the day that is highlighted in the grid. */
    selectedDate: { type: String, required: true },
    /**
     * DD-MM-YYYY — any day of the month the grid is SHOWING. Falls back to the
     * selection, which is where the month starts before anyone steps it.
     */
    monthDate: { type: String, default: '' },
    today: { type: String, required: true },
    /** Phone folds the month to the selected week; the other shells never do. */
    collapsible: { type: Boolean, default: false },
    expanded: { type: Boolean, default: false },
    hint: { type: String, default: '' },
  },

  data() {
    return { monthGoals: [], readFailed: false };
  },

  apollo: {
    monthGoals: {
      query: GOALS_CALENDAR_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { currentMonth: this.monthEnd };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return (data && data.goalsOptimized) || [];
      },
      result({ data }) {
        if (data) this.readFailed = false;
      },
      error(error) {
        console.error('[GoalCalendarContainer] goalsOptimized query error:', error);
        this.readFailed = true;
      },
    },
  },

  computed: {
    /**
     * D-10: the read failed AND nothing is cached, so the grid would draw thirty
     * empty rings and claim the month was never planned. Derived from "there is no
     * data", never from "a request is in flight" (ARCHITECTURE § 3.7).
     */
    loadError() {
      return this.readFailed && !this.monthGoals.length;
    },
    /** The month on screen — stepped by the chevrons, seeded by the selection. */
    month() {
      return this.monthDate || this.selectedDate;
    },
    /** The server keys a month by its LAST day (DD-MM-YYYY). */
    monthEnd() {
      return moment(this.month, DATE_FORMAT).endOf('month').format(DATE_FORMAT);
    },
    monthLabel() {
      return moment(this.month, DATE_FORMAT).format('MMMM YYYY');
    },
    cells() {
      return calendarCells({
        monthDate: this.month,
        dayGoals: this.monthGoals,
        selectedDate: this.selectedDate,
        today: this.today,
      });
    },
  },

  methods: {
    /**
     * Re-read after a write the page orchestrated. The page calls this rather
     * than the container listening for a global event, so the only thing that can
     * refetch this query is its own owner.
     */
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.monthGoals;
      if (query) query.refetch().catch(() => {});
    },
  },
};
</script>
