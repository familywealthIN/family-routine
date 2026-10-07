<template>
  <GoalCascade
    :shell="shell"
    :tab="view.tab"
    :ladder="view.ladder"
    :rule="view.rule"
    :rule-icon="view.ruleIcon"
    :list-title="view.listTitle"
    :list-done="view.listDone"
    :list-total="view.listTotal"
    :groups="view.groups"
    :empty="view.empty"
    :empty-text="pendingDate ? LOADING_TEXT : view.emptyText"
    :add-label="view.addLabel"
    :load-error="loadError"
    :retrying="retrying"
    @select-step="$emit('select-step', $event)"
    @toggle-row="onToggleRow"
    @edit-row="onEditRow"
    @delete-row="onDeleteRow"
    @open-year="$emit('open-year', $event.id)"
    @add="$emit('add')"
    @retry="refresh"
  >
    <!-- The calendar is fed by its own read, so the page passes it through. -->
    <template v-slot:calendar><slot name="calendar"></slot></template>
  </GoalCascade>
</template>

<script>
/**
 * Container home for the GoalCascade organism (see ARCHITECTURE.md § 2).
 *
 * ONE read: `agendaGoals(date)`. Every figure the ladder and the list draw is a
 * slot of that one payload — the selected day's goals plus the week, month, year
 * and lifetime goals containing it, each with the `progress` count the streak
 * bars and the roll-up rings render.
 *
 * It is called ONCE per date and never twice to compare two windows:
 * `agendaGoals` runs `autoCheckTaskPeriod`, which WRITES (it closes any goal that
 * already crossed its threshold). A second call to "see the before and after"
 * would be a second write.
 *
 * The arithmetic is not here. `utils/goalCascade.buildCascade` is the pure model
 * and `planRowTick` is the pure tick rule, so both are unit-tested without a
 * component and neither the organism nor the page holds a second copy of the
 * cascade.
 *
 * The WRITE is not here either. A tick fans out across levels — and, through the
 * server's G-stimulus award, into the routine — so it is page-orchestrated
 * (ARCHITECTURE § 6): this container emits the plan and the page applies it
 * through `GoalPeriodTickContainer`. Nothing is disabled while it is in flight
 * (§ 3.7).
 */
import moment from 'moment';
import GoalCascade from '@routine-notes/ui/organisms/GoalCascade/GoalCascade.vue';
import { AGENDA_GOALS_QUERY } from '../composables/graphql/goalsQueries';
import { buildCascade, planRowTick } from '../utils/goalCascade';

/** What the empty slot says while a newly picked day's read is still out. */
export const LOADING_TEXT = 'Loading goals…';

/**
 * The complete goal item a row stands for, out of this container's own read.
 *
 * Module-level and pure so the edit glyph and the delete glyph cannot resolve a
 * row two different ways. A year row resolves to nothing at all: it is acted on
 * from its own screen, where its months live, and this page only navigates to it.
 */
export function itemForRow(view, row) {
  if (!row || !row.id || row.period === 'year') return null;
  const items = (view && view.items && view.items[row.period]) || [];
  return items.find((candidate) => candidate.id === row.id) || null;
}

export default {
  name: 'GoalsCascadeContainer',

  components: { GoalCascade },

  props: {
    /** Which ladder step is showing: day | week | month | year | lifetime. */
    tab: { type: String, default: 'day' },
    /** DD-MM-YYYY — the day the calendar selected. */
    selectedDate: { type: String, required: true },
    today: { type: String, required: true },
    shell: { type: String, default: 'phone' },
    /** `[{ id, name, time }]` from GoalRoutineIndexContainer. */
    routines: { type: Array, default: () => [] },
    /** Ladder steps to replay `rn-pop` on, owned by the page for ~700ms. */
    pop: { type: Array, default: () => [] },
    /** Injected by tests; production reads the clock for the NOW badge. */
    now: { type: Object, default: null },
  },

  data() {
    return {
      goals: [], readFailed: false, loadedDate: '', LOADING_TEXT,
    };
  },

  apollo: {
    goals: {
      query: AGENDA_GOALS_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { date: this.selectedDate };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return (data && data.agendaGoals) || [];
      },
      result({ data }) {
        if (data) {
          this.readFailed = false;
          this.loadedDate = this.selectedDate;
        }
      },
      error(error) {
        console.error('[GoalsCascadeContainer] agendaGoals query error:', error);
        this.readFailed = true;
      },
    },
  },

  computed: {
    /**
     * D-10: the read failed AND nothing is cached. Derived from "there is no
     * data", never from "a request is in flight" (ARCHITECTURE § 3.7) — a refetch
     * that fails while goals are on screen must leave them there.
     */
    loadError() {
      // A failed read for a day we never got an answer for is also an error:
      // `goals` then still holds the previous day's payload, and showing it
      // would claim "Nothing planned yet" about a day we know nothing of.
      return this.readFailed && (!this.goals.length || this.loadedDate !== this.selectedDate);
    },
    /**
     * The calendar moved to a day this read has not answered for yet. Until it
     * does, `goals` still holds the previous day's payload, so the day list
     * filters to nothing — and "Nothing planned yet" would be a claim about data
     * we do not have (the D-10 rule). Only the empty copy reads this: rows that
     * are already on screen stay, and no checkbox is gated (§ 3.7).
     */
    pendingDate() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.goals;
      return !!(query && query.loading) && this.loadedDate !== this.selectedDate;
    },
    /** Feeds the retry button's spinner only. It gates no goal checkbox. */
    retrying() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.goals;
      return !!(query && query.loading) && this.loadError;
    },
    yearAverageOut() {
      return this.loadedDate ? this.view.yearAverage : null;
    },
    view() {
      return buildCascade({
        tab: this.tab,
        goals: this.goals,
        routines: this.routines,
        selectedDate: this.selectedDate,
        today: this.today,
        now: this.now || moment(),
        pop: this.pop,
        loadError: this.loadError,
      });
    },
  },

  watch: {
    /**
     * The year average is the nav glyph's ring as well as the Year step, and the
     * shell is the page's. One figure, computed once here, handed up — rather than
     * a second year query behind the chip.
     */
    // Null (unknown, so the shell hides the ring) until a read has answered;
    // an empty payload would otherwise report a confident 0%.
    yearAverageOut: {
      immediate: true,
      handler(value) {
        this.$emit('year-average', value);
      },
    },
  },

  methods: {
    onToggleRow(row) {
      const plan = planRowTick({
        row,
        items: this.view.items,
        routines: this.routines,
        isToday: this.view.isToday,
      });
      if (plan.navigate) {
        this.$emit('open-year', plan.navigate);
        return;
      }
      this.$emit('tick', plan);
    },
    /**
     * The edit sheet's status toggle, run through the same tick rule as a tap
     * on the row (a day tick can close the week, month and year above it).
     */
    toggleItem(item) {
      if (!item || !item.id) return;
      this.onToggleRow({
        id: item.id,
        period: item.period,
        date: item.date,
        taskRef: item.taskRef || '',
        done: !!item.isComplete,
        isMilestone: !!item.isMilestone,
      });
    },
    /**
     * A row carries only what it draws. The editor needs the WHOLE goal item —
     * contribution, tags, subtasks, `goalRef` — plus the `period` + `date` of the
     * Goal document that owns it, which is the address its mutations are sent to.
     * `buildCascade` already stamps both onto every item in `view.items`, so the
     * row id is resolved back here rather than the page reaching into this
     * container's read.
     *
     * A year row is acted on from its own screen, where its months live — this
     * page only navigates to it, so neither glyph resolves one.
     */
    onEditRow(row) {
      const item = itemForRow(this.view, row);
      if (item) this.$emit('edit', item);
    },
    /**
     * Delete is only ever ASKED for. The server cascades it to every transitive
     * `goalRef` descendant and leaves BOTH of this page's display reads stale, so
     * it is page-orchestrated (ARCHITECTURE § 6): the page runs it through
     * `GoalDeleteConfirmContainer` + `GoalPeriodDeleteContainer`. What goes up is
     * the address the delete mutation needs, plus the body the dialog names.
     */
    onDeleteRow(row) {
      const item = itemForRow(this.view, row);
      if (!item) return;
      this.$emit('delete', {
        id: item.id,
        period: item.period,
        date: item.date,
        body: item.body || '',
      });
    },
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.goals;
      if (query) query.refetch().catch(() => {});
    },
  },
};
</script>
