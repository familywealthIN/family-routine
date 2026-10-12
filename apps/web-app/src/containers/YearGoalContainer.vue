<template>
  <year-goal-board
    v-if="tree"
    :goal="tree"
    :tiles="tiles"
    :month="month"
    :open-week-id="openWeekId"
    :shell="shell"
    :thresholds="thresholds"
    :index-label="indexLabel"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :about-open="aboutOpen"
    :empty-sub="emptySub"
    :chat-subline="chatSubline"
    v-on="$listeners"
  >
    <template v-slot:chat><slot name="chat"></slot></template>
    <template v-slot:composer><slot name="composer"></slot></template>
  </year-goal-board>

  <load-error-state
    v-else-if="failed"
    class="year-goal-container__state"
    message="We couldn't load this year goal."
    @retry="retry"
  />

  <div v-else-if="!loading" class="year-goal-container__state" data-testid="year-goal-missing">
    <div class="year-goal-container__state-title">No year goal here</div>
    <div class="year-goal-container__state-sub">
      Create a year goal from the Goals page, then plan its months, weeks and days here.
    </div>
  </div>

  <div v-else class="year-goal-container__state" data-testid="year-goal-loading">Loading…</div>
</template>

<script>
/**
 * Read container for ONE year goal and its milestone tree (ARCHITECTURE § 2).
 *
 * One query — `currentYearGoal` — chosen because it does not call
 * `autoCheckTaskPeriod`, which writes while it reads. Every count the board
 * renders is derived from the returned tree by `utils/yearGoalModel`, since
 * `progress` / `milestonesComplete` are never persisted and this resolver does
 * not compute them.
 *
 * Writes are not here. They cross domains — one day tick can complete a week, a
 * month and the year, and it also posts chat events — so the page orchestrates
 * them through the single-op write containers (ARCHITECTURE § 6). This container
 * emits its derived tree upward (`@tree`) so the page can plan that cascade
 * against the same data the board is painting, and exposes `refetch()` for after
 * the writes land.
 *
 * Nothing here is disabled while the query is loading: the skeleton is derived
 * from "there is no tree", never from `loading`, and the pending-entity guard
 * protects the tick from a late `cache-and-network` payload (§ 3.7).
 */
import YearGoalBoard from '@routine-notes/ui/organisms/YearGoalBoard/YearGoalBoard.vue';
import LoadErrorState from '@routine-notes/ui/molecules/LoadErrorState/LoadErrorState.vue';
import { YEAR_GOAL_TREE_QUERY } from '../composables/graphql/yearGoalQueries';
import {
  TH, buildYearGoal, monthTiles, yearPercent,
} from '../utils/yearGoalModel';

export default {
  name: 'YearGoalContainer',

  components: { YearGoalBoard, LoadErrorState },

  props: {
    goalId: { type: String, default: '' },
    shell: { type: String, default: 'phone' },
    /** 0-11. The page owns which month is focused — it is route-free UI state. */
    selectedMonth: { type: Number, default: 0 },
    openWeekId: { type: String, default: '' },
    aboutOpen: { type: Boolean, default: false },
    indexLabel: { type: String, default: '' },
    hasPrev: { type: Boolean, default: false },
    hasNext: { type: Boolean, default: false },
    /** DD-MM-YYYY. Injected so the tree is testable on a fixed day. */
    today: { type: String, default: '' },
  },

  data() {
    return { yearGoal: null, failed: false, thresholds: TH };
  },

  apollo: {
    yearGoal: {
      query: YEAR_GOAL_TREE_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { id: this.goalId };
      },
      skip() {
        return !this.$root.$data.email || !this.goalId;
      },
      update(data) {
        this.failed = false;
        return data.currentYearGoal || null;
      },
      error(error) {
        console.error('[YearGoalContainer] currentYearGoal query error:', error);
        this.failed = true;
      },
    },
  },

  computed: {
    loading() {
      const query = this.$apollo.queries.yearGoal;
      return !!(query && query.loading) && !this.yearGoal;
    },
    tree() {
      return buildYearGoal(this.yearGoal, this.today || undefined);
    },
    month() {
      if (!this.tree) return null;
      return this.tree.months[this.safeMonthIndex] || null;
    },
    safeMonthIndex() {
      const i = Number(this.selectedMonth);
      return i >= 0 && i <= 11 ? i : 0;
    },
    tiles() {
      return monthTiles(this.tree, this.safeMonthIndex);
    },
    /**
     * The empty month's explanation. Past reads as closed (no adding into a
     * month that is over); future as an invitation, with how many months the
     * year still needs.
     */
    emptySub() {
      if (!this.tree || !this.month) return '';
      if (this.month.isPast) {
        return `${this.month.name} passed without a month goal.`;
      }
      const left = Math.max(0, TH.year - this.tree.monthsDone);
      return `Months roll up into “${this.tree.body}”. ${left} more needed this year.`;
    },
    /** The tablet/desktop chat panel's subline. */
    chatSubline() {
      if (!this.tree || !this.month) return '';
      const pct = yearPercent(this.tree.monthsDone);
      const state = this.month.goal
        ? `${this.month.weeksDone}/${TH.month} weeks`
        : 'no goal yet';
      return `${this.month.name} · ${state} · year ${pct}%`;
    },
  },

  watch: {
    tree: {
      immediate: true,
      handler(tree) {
        this.$emit('tree', tree);
      },
    },
  },

  methods: {
    /** The error state's Retry: re-read here, and tell the page so it can
     *  re-read whatever else the same outage failed (the goal list). */
    retry() {
      this.refetch();
      this.$emit('retry');
    },
    refetch() {
      this.failed = false;
      const query = this.$apollo.queries.yearGoal;
      if (query) query.refetch().catch(() => {});
    },
  },
};
</script>

<style>
.year-goal-container__state {
  padding: 32px 16px;
  text-align: center;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .54);
  font-size: 14px;
}

.year-goal-container__state-title {
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, .87);
  margin-bottom: 4px;
}

.year-goal-container__state-sub {
  max-width: 320px;
  margin: 0 auto;
  line-height: 1.5;
}
</style>
