<template>
  <!--
    Read container for the Priority board (ARCHITECTURE § 2 + § 4).
    One organism (PriorityBoard) + one GraphQL operation (PRIORITY_BOARD_QUERY).
    Every write leaves as an event — the page orchestrates them, because they
    cross domains (goal item, agent, routine item) and § 6 puts that on the page.

    Until the first payload lands there is no board to draw: an empty board
    reads as "Inbox clear / Nothing here", which is a claim about the user's
    data. So the states are derived from "is there a payload" (never from a
    loading flag — § 3.7): board, or the D-10 error state, or "Loading…".
  -->
  <PriorityBoard
    v-if="loaded"
    :shell="shell"
    :quadrants="board.quadrants"
    :triage="board.triage"
    v-on="$listeners"
  />

  <load-error-state
    v-else-if="loadError"
    class="rn-pboard-state"
    message="We couldn't load your priorities."
    :retrying="retrying"
    data-testid="priority-load-error"
    @retry="recover"
  />

  <div v-else class="rn-pboard-state" data-testid="priority-loading">Loading…</div>
</template>

<script>
import moment from 'moment';
import PriorityBoard from '@routine-notes/ui/organisms/PriorityBoard/PriorityBoard.vue';
import LoadErrorState from '@routine-notes/ui/molecules/LoadErrorState/LoadErrorState.vue';
import { QUADRANTS, ROUTINE_RULE } from '@routine-notes/ui/constants/priority';
import { PRIORITY_BOARD_QUERY } from '../composables/graphql/priorityQueries';
import { buildPriorityBoard, delegateAgentState } from '../utils/priorityBoard';
import { stimulusTotal } from '../utils/stimulusTotals';

// Same bar RoutineFocus uses: a day counts toward the streak at 3 ticks. The
// streak is not persisted anywhere yet, so both screens state it from the day.
const STREAK_TICKS = 3;

export default {
  name: 'PriorityBoardContainer',
  components: { PriorityBoard, LoadErrorState },
  props: {
    /** Day the board shows, DD-MM-YYYY. The query's only variable. */
    date: { type: String, required: true },
    shell: { type: String, default: 'phone' },
    /** `$agent.statusByRoutineId` — the page owns the agent domain (§ 6). */
    agentStatuses: { type: Object, default: () => ({}) },
    /** Minute-resolution clock for the NOW badge; the page ticks it. */
    now: { type: [Object, Number, String], default: null },
    /** Ids deferred to the back of the triage queue by "Skip". */
    skipped: { type: Array, default: () => [] },
  },
  apollo: {
    priorityBoard: {
      query: PRIORITY_BOARD_QUERY,
      // Principle #4 — a stale or partial slice self-heals on the next paint.
      fetchPolicy: 'cache-and-network',
      variables() {
        return { date: this.date };
      },
      skip() {
        return !this.$root.$data.email || !this.date;
      },
      // The whole payload is kept: both root fields feed one organism.
      update(data) {
        return {
          goals: (data && data.optimizedDailyGoals) || [],
          routine: (data && data.routineDate) || null,
        };
      },
      result({ data }) {
        if (data) this.readFailed = false;
      },
      /**
       * Apollo 2 keeps a failed read's `networkError` in its query store until
       * that query fetches successfully again, and until then every cache
       * broadcast is re-delivered as the same error — so writes that land in the
       * cache never reach the board. `readFailed` is what lets `recover()` and
       * the `online` listener re-fetch it out of that state.
       */
      error(error) {
        console.error('[PriorityBoardContainer] priorityBoard query error:', error);
        this.readFailed = true;
        this.$emit('load-error', error);
      },
    },
  },
  data() {
    return {
      priorityBoard: null,
      readFailed: false,
    };
  },
  computed: {
    /** A payload has landed (cached or network). Never derived from `loading`. */
    loaded() {
      return !!this.priorityBoard;
    },
    /** D-10: the read failed AND there is nothing to show. */
    loadError() {
      return this.readFailed && !this.loaded;
    },
    /** Feeds the retry button's spinner only. */
    retrying() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.priorityBoard;
      return !!(query && query.loading) && this.loadError;
    },
    goals() {
      return (this.priorityBoard && this.priorityBoard.goals) || [];
    },
    tasklist() {
      const routine = this.priorityBoard && this.priorityBoard.routine;
      return (routine && routine.tasklist) || [];
    },
    /**
     * "Already a routine task" is read off the routine itself, not off a flag we
     * invented: `routineDate` re-syncs the day's tasklist from `routineItems` on
     * every read, so a routine item created by the AUTOMATE chip is visible here
     * the moment this query refetches.
     */
    routineNames() {
      const names = {};
      this.tasklist.forEach((task) => {
        if (task && task.name) names[String(task.name).trim().toLowerCase()] = true;
      });
      return names;
    },
    board() {
      return buildPriorityBoard({
        goals: this.goals,
        tasklist: this.tasklist,
        quadrants: QUADRANTS,
        now: this.now ? moment(this.now) : moment(),
        rule: ROUTINE_RULE,
        skipped: this.skipped,
        agentStateFor: (item) => delegateAgentState(item, this.agentStatuses),
        automatedFor: (item) => !!this.routineNames[String(item.body || '').trim().toLowerCase()],
      });
    },
    /**
     * What the page needs that is not the board itself: the header subtitle's
     * counts plus the chassis drawer's D/K/G trio and streak. Emitted rather
     * than queried a second time — the shared root stays in one place (§ 6b).
     */
    /**
     * The ring around the Goals nav glyph (chassis.md § Navigation). The board's
     * read already returns the year goals `optimizedDailyGoals` bundles, so the
     * ring is real here instead of an assumed zero.
     */
    yearAverage() {
      const items = this.goals
        .filter((goal) => goal && goal.period === 'year')
        .reduce((acc, goal) => acc.concat(goal.goalItems || []), []);
      if (!items.length) return 0;
      const sum = items.reduce((total, item) => total + (Number(item.progress) || 0), 0);
      return Math.round(sum / items.length);
    },
    summary() {
      const ticked = this.tasklist.filter((task) => task && task.ticked).length;
      return {
        openTotal: this.board.openTotal,
        triageCount: this.board.triage.length,
        tasklist: this.tasklist,
        scores: {
          D: stimulusTotal(this.tasklist, 'D', this.date),
          K: stimulusTotal(this.tasklist, 'K', this.date),
          G: stimulusTotal(this.tasklist, 'G', this.date),
        },
        streakDays: ticked >= STREAK_TICKS ? 1 : 0,
        yearAverage: this.yearAverage,
        /** False only until the first payload lands — never "a query is loading". */
        hasData: this.goals.length > 0 || this.tasklist.length > 0,
        /** The header must not state counts for a board it has not read. */
        loaded: !!this.loaded,
        loadError: !!this.loadError,
      };
    },
  },
  watch: {
    summary: {
      immediate: true,
      handler(value) {
        this.$emit('summary', value);
      },
    },
  },
  mounted() {
    window.addEventListener('online', this.recover);
  },
  beforeDestroy() {
    window.removeEventListener('online', this.recover);
  },
  methods: {
    /** The page calls this after a write whose entity this query must re-read. */
    refetch() {
      const query = this.$apollo.queries.priorityBoard;
      return query && typeof query.refetch === 'function' ? query.refetch() : null;
    },
    /**
     * Re-read the board ONLY if its last read failed — see the `error` hook. The
     * page calls this after every successful write (the server is evidently
     * back) and the browser calls it on `online`. A healthy read needs nothing:
     * the writes patch `GoalItem:<id>` and the cache broadcast repaints.
     */
    recover() {
      if (!this.readFailed) return null;
      const pending = this.refetch();
      return pending && typeof pending.catch === 'function' ? pending.catch(() => null) : pending;
    },
  },
};
</script>

<style>
/* Root-class prefixed: the loading / error placeholder in the board's slot. */
.rn-pboard-state {
  flex: 1;
  padding: 32px 16px;
  text-align: center;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .54);
  font-size: 14px;
}
</style>
