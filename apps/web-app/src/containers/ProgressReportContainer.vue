<template>
  <ProgressReport
    :shell="shell"
    :period="safePeriod"
    :statement="statement"
    :efficiency="efficiency.value"
    :formula="efficiency.formula"
    :previous-efficiency="previousEfficiency"
    :previous-label="previousPeriodLabel"
    :series="series"
    :series-labels="seriesLabels"
    :point-names="pointNames"
    :selected-index="selectedIndex"
    :trend-note="trendNote"
    :balance="balance"
    :balance-heading="balanceHeading"
    :completed="completed"
    :completed-heading="completedHeading"
    :good="rankings.good"
    :bad="rankings.bad"
    :rank-empty-text="rankEmptyText"
    :route-for="routeFor"
    :history-route="historyRoute"
    :loading="loading"
    :load-error="loadError"
    :retrying="retrying"
    @change-period="$emit('change-period', $event)"
    @select-point="selectedIndex = $event"
    @open-routine="$emit('open-routine', $event)"
    @open-history="$emit('open-history')"
    @retry="refresh"
  />
</template>

<script>
/**
 * Container home for the ProgressReport organism (see ARCHITECTURE.md).
 *
 * Owns ONE read: `getProgress` for one window. Every figure on the screen is a
 * slot of that one report, so there is nothing else to own - no mutations, so
 * no cache writes and no pending-entity guarding either.
 *
 * Routine Efficiency is NOT computed here. It arrives as the report's
 * `efficiency` card - value and formula wording together - which is the single
 * definition /progress and /history both read since D-13. Reading the card is
 * the whole of this container's involvement with the metric.
 *
 * Three parts of the design have no source in the report, and are passed through
 * as honest absences rather than filled with a plausible number:
 *   - `series` / `seriesLabels` / `pointNames`: the trend needs a figure per day
 *     (per routine on the Day period). The report returns one figure for the
 *     window, and asking `getProgress` once per point would re-run a resolver
 *     that re-reads every routine and goal - and auto-ticks goals - per point.
 *   - `previousEfficiency`: same reason. It would be a second window.
 *   - the routines' scheduled `time`, the weekly hit `pattern` and the attention
 *     rows' `why`: the good/bad cards carry id, name and score only.
 *
 * Every figure reads `report`, never `progress` directly. vue-apollo keeps the
 * previous result when the variables change (and keeps it for good when the
 * new read fails), so `progress` can still be LAST period's report while the
 * labels already say the new one. `report` is the result only when it is the
 * window being asked for; until then the organism shows a loading state, and
 * a failed read shows the D-10 error state with a retry.
 */
import moment from 'moment';
import ProgressReport from '@routine-notes/ui/organisms/ProgressReport/ProgressReport.vue';
import { balanceScope, completedScope } from '@routine-notes/ui/constants/progress';
import { PROGRESS_REPORT_QUERY } from '../composables/graphql/progressQueries';
import {
  DATE_FORMAT,
  normalisePeriod,
  periodWindow,
  previousLabel,
  efficiencyOf,
  balanceOf,
  completedOf,
  rankingsOf,
} from '../utils/progressReport';

export default {
  name: 'ProgressReportContainer',

  components: { ProgressReport },

  props: {
    period: { type: String, default: 'week' },
    shell: { type: String, default: 'phone' },
    today: { type: String, default: () => moment().format(DATE_FORMAT) },
    /** `(row) => href` for an attention row. Routing stays with the page. */
    routeFor: { type: Function, default: null },
    historyRoute: { type: String, default: '/history' },
  },

  data() {
    return {
      progress: null,
      /** The last read of the current window failed (D-10). */
      readFailed: false,
      /** Which trend point the reader scrubbed to. Null = the latest one. */
      selectedIndex: null,
    };
  },

  computed: {
    safePeriod() {
      return normalisePeriod(this.period);
    },
    /** Not named `window`: a computed by that name shadows the global. */
    reportWindow() {
      return periodWindow(this.safePeriod, this.today);
    },
    /**
     * The fetched report, but only when it answers the window on screen. The
     * server echoes `period` but (today) not the dates - they come back null -
     * so a date is only compared when the report actually carries one.
     */
    report() {
      const { progress, safePeriod, reportWindow } = this;
      if (!progress || progress.period !== safePeriod) return null;
      const sameDate = (echoed, asked) => echoed == null || echoed === asked;
      const matches = sameDate(progress.startDate, reportWindow.startDate)
        && sameDate(progress.endDate, reportWindow.endDate);
      return matches ? progress : null;
    },
    /**
     * A failed read only becomes an error screen when there is no report for
     * this window to show: a failed REFETCH must not blank a working report.
     */
    loadError() {
      return this.readFailed && !this.report;
    },
    /** Waiting on this window's report - never "empty", never another period's. */
    loading() {
      return !this.report && !this.loadError;
    },
    /** Feeds the retry button's spinner only. */
    retrying() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.progress;
      return !!(query && query.loading) && this.loadError;
    },
    statement() {
      return (this.report && this.report.progressStatement) || '';
    },
    efficiency() {
      return efficiencyOf(this.report);
    },
    balance() {
      return balanceOf(this.report);
    },
    balanceHeading() {
      return `BALANCE · ${balanceScope(this.safePeriod)}`;
    },
    completed() {
      return completedOf(this.report);
    },
    completedHeading() {
      return `COMPLETED · ${completedScope(this.safePeriod)}`;
    },
    rankings() {
      return rankingsOf(this.report);
    },
    previousPeriodLabel() {
      return previousLabel(this.safePeriod, this.reportWindow.startDate);
    },
    /** No previous window is fetched, so there is no delta to print. */
    previousEfficiency() {
      return null;
    },
    series() {
      return [];
    },
    seriesLabels() {
      return [];
    },
    pointNames() {
      return [];
    },
    trendNote() {
      const unit = this.safePeriod === 'day' ? 'routine-by-routine' : 'day-by-day';
      return `No ${unit} trend yet — this report returns one figure for the whole ${this.safePeriod}.`;
    },
    rankEmptyText() {
      return `No routines scored in this ${this.safePeriod} yet.`;
    },
  },

  apollo: {
    progress: {
      query: PROGRESS_REPORT_QUERY,
      // Principle #4: a stale or partial report self-heals on the next paint.
      fetchPolicy: 'cache-and-network',
      variables() {
        return {
          period: this.safePeriod,
          startDate: this.reportWindow.startDate,
          endDate: this.reportWindow.endDate,
        };
      },
      update(data) {
        return data.getProgress;
      },
      skip() {
        return !this.$root.$data.email;
      },
      result({ data }) {
        if (data) this.readFailed = false;
      },
      error(error) {
        // eslint-disable-next-line no-console
        console.error('[ProgressReportContainer] getProgress query error:', error);
        this.readFailed = true;
      },
    },
  },

  watch: {
    // A new period is a new set of points; keeping index 4 would scrub to a
    // different day's figure under the same marker.
    safePeriod() {
      this.selectedIndex = null;
      // The failure was the OLD window's; the new one starts out loading.
      this.readFailed = false;
    },
  },

  methods: {
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.progress;
      if (query) query.refetch().catch(() => {});
    },
  },
};
</script>
