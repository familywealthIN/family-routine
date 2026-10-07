<template>
  <!--
    The Goals page (`packages/design/Goals.dc.html`), rebuilt.

    What changed: the forest-photo hero with five "Total … Tasks" counters is now a
    CASCADE LADDER — Today → Week → Month → Year → Life — and the ladder is the
    navigation: tapping a step swaps the list below it. The calendar's "N Goals"
    text became a ring per day. Every period's goals are grouped by routine in time
    order. Year goals open their own page instead of expanding. The two FABs became
    a header "+" and a Milestones icon.

    Layout + composition only (ARCHITECTURE.md § 1). Four containers own the data:
    the shell's points, the cascade read, the calendar read, the routine index —
    plus three write units (create, tick, delete) and the editor dialog. What the
    PAGE owns is the five things that are genuinely page state: which ladder step
    is showing, which day is selected, which MONTH the calendar is showing,
    whether the phone calendar is pulled open, and the toast.

    Why the tick is orchestrated here and not in a container: one tap on a day goal
    can close its week goal, that week's month goal and that month's year goal in
    the same gesture, and the server also moves the routine's G-stimulus for it. A
    write that fans out across domains belongs to the page (ARCHITECTURE § 6); the
    cascade container hands up the PLAN and `GoalPeriodTickContainer` applies it.
    A delete is page-orchestrated for the same reason: the server cascades to every
    transitive `goalRef` descendant, so both display reads go stale at once.

    The editor is Home's goal sheet (`GoalEditSheetContainer` around the same
    `GoalItemSheetContainer`), so a goal edited here looks and behaves exactly
    like one opened from a checklist row. Delete sits on the cascade ROW too.
  -->
  <app-shell-container
    active="goals"
    title="Goals"
    :subtitle="dateLabel"
    :year-average="yearAverage"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <template v-slot:header-actions>
      <button
        type="button"
        class="rn-shell__act"
        :class="labelledActions ? 'rn-shell__act--label' : 'rn-shell__act--icon'"
        title="Milestones"
        data-testid="goals-milestones"
        @click="openMilestones"
      >
        <i class="rn-mi rn-shell__act-glyph">widgets</i>
        <span v-if="labelledActions">Milestones</span>
      </button>
      <button
        type="button"
        class="rn-shell__act rn-shell__act--primary"
        :class="labelledActions ? 'rn-shell__act--label' : 'rn-shell__act--icon'"
        title="New goal"
        data-testid="goals-new"
        @click="openSheet"
      >
        <i class="rn-mi rn-shell__act-glyph">add</i>
        <span v-if="labelledActions">New goal</span>
      </button>
    </template>

    <!--
      Desktop only: the 264px nav sidebar lists the year goals, which is the same
      switcher the Year Goals screen mounts. One container, one query, two hosts.
    -->
    <template v-if="shell === 'desktop'" v-slot:sidebar>
      <year-goal-list-container compact @select="openYear" />
    </template>

    <goal-routine-index-container v-slot="{ routines }">
      <div class="goals-page" :class="`goals-page--${shell}`" data-testid="goals-page">
        <goals-cascade-container
          ref="cascade"
          :tab="tab"
          :selected-date="selectedDate"
          :today="today"
          :shell="shell"
          :routines="routines"
          :pop="pop"
          @select-step="selectStep"
          @tick="onTick"
          @edit="openEditor"
          @delete="confirmDelete"
          @open-year="openYear"
          @add="openSheet"
          @year-average="yearAverage = $event"
        >
          <template v-slot:calendar>
            <!--
              `month-date` is deliberately NOT `selected-date`: stepping a month
              must not move the selection, because the cascade read is keyed on
              the selected DATE and its resolver writes (`autoCheckTaskPeriod`).
              Browsing three months back would otherwise fire three auto-check
              passes for days the user never chose.
            -->
            <goal-calendar-container
              ref="calendar"
              :selected-date="selectedDate"
              :month-date="monthDate"
              :today="today"
              :collapsible="isPhone"
              :expanded="calendarOpen"
              :hint="isPhone ? '' : 'Tap a day'"
              @select-day="selectDay"
              @prev-month="shiftMonth(-1)"
              @next-month="shiftMonth(1)"
              @toggle="calendarOpen = !calendarOpen"
            />
          </template>
        </goals-cascade-container>

        <goal-item-create-container
          :open="sheetOpen"
          :shell="shell"
          :period="sheetPeriod"
          :task-ref="defaultTaskRef(routines)"
          :routines="routines"
          :selected-date="selectedDate"
          :today="today"
          @close="sheetOpen = false"
          @created="onCreated"
          @failed="onCreateFailed"
        />

        <!--
          The editor: Home's goal sheet — title, description, tags, subtasks,
          date. Its status toggle runs through the cascade's tick rule.
        -->
        <goal-edit-sheet-container
          :open="editorOpen"
          :shell="shell"
          :item="editItem"
          :routines="routines"
          @close="closeEditor"
          @toggle="$refs.cascade.toggleItem($event)"
          @changed="refreshReads"
        />

        <!-- The write units. Renderless: one mutation each and nothing else. -->
        <goal-period-tick-container ref="tick" />
        <goal-period-delete-container ref="remove" />

        <!-- Destructive, so it never happens without the dialog that names what
             the server cascade will take with it. -->
        <goal-delete-confirm-container ref="deleteConfirm" @confirm="removeGoalItem" />

        <!--
          Phone and tablet reach the year goals by tapping the Goals tab again —
          the design's "Go to" switcher. Desktop has the sidebar instead.
        -->
        <responsive-sheet
          v-if="!isDesktop"
          :open="switcherOpen"
          :shell="shell"
          title="Go to"
          @close="switcherOpen = false"
        >
          <year-goal-list-container
            compact
            @select="openYear"
            @open-overview="switcherOpen = false"
          />
        </responsive-sheet>

        <app-toast
          :shell="shell"
          :title="toast.title"
          :sub="toast.sub"
          :icon="toast.icon"
          :icon-color="toast.color"
          :seq="toast.seq"
        />
      </div>
    </goal-routine-index-container>
  </app-shell-container>
</template>

<script>
import moment from 'moment';
import AppToast from '@routine-notes/ui/molecules/AppToast/AppToast.vue';
import ResponsiveSheet from '@routine-notes/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import { MeasurementMixin } from '../utils/measurementMixins';
import AppShellContainer from '../containers/AppShellContainer.vue';
import GoalRoutineIndexContainer from '../containers/GoalRoutineIndexContainer.vue';
import GoalsCascadeContainer from '../containers/GoalsCascadeContainer.vue';
import GoalCalendarContainer from '../containers/GoalCalendarContainer.vue';
import GoalItemCreateContainer from '../containers/GoalItemCreateContainer.vue';
import GoalEditSheetContainer from '../containers/GoalEditSheetContainer.vue';
import GoalPeriodTickContainer from '../containers/GoalPeriodTickContainer.vue';
import GoalPeriodDeleteContainer from '../containers/GoalPeriodDeleteContainer.vue';
import GoalDeleteConfirmContainer from '../containers/GoalDeleteConfirmContainer.vue';
import YearGoalListContainer from '../containers/YearGoalListContainer.vue';
import { signOut } from '../utils/signOut';
import {
  DATE_FORMAT, currentRoutineId, goalDateFor, normaliseTab,
} from '../utils/goalCascade';

/** Routes this page can leave by. One place, so one line changes per route. */
export const MILESTONES_ROUTE = '/goals/milestones';
export const YEAR_GOAL_ROUTE = '/year-goals';
export const GOALS_ROUTE = '/goals';
export const LOGOUT_KEY = 'logout';
export const GOALS_NAV_KEY = 'goals';
/** How long the auto-ticked ladder step keeps its `rn-pop`. */
export const POP_MS = 700;

const noToast = () => ({
  title: '', sub: '', icon: 'check_circle', color: '#81c784', seq: 0,
});

export default {
  name: 'GoalsTime',

  /** The analytics the other pages emit — page view, dialog opens, goal writes. */
  mixins: [MeasurementMixin],

  components: {
    AppShellContainer,
    AppToast,
    ResponsiveSheet,
    GoalRoutineIndexContainer,
    GoalsCascadeContainer,
    GoalCalendarContainer,
    GoalItemCreateContainer,
    GoalEditSheetContainer,
    GoalPeriodTickContainer,
    GoalPeriodDeleteContainer,
    GoalDeleteConfirmContainer,
    YearGoalListContainer,
  },

  data() {
    return {
      /** Which ladder step is showing. Not in the URL: `/goals` takes no param. */
      tab: 'day',
      today: moment().format(DATE_FORMAT),
      selectedDate: moment().format(DATE_FORMAT),
      /**
       * Which month the calendar grid is on. Separate from `selectedDate` so the
       * prev/next chevrons can move the grid — and only the grid's own month read
       * — without re-running the cascade read's writing resolver for a day the
       * user never selected.
       */
      monthDate: moment().format(DATE_FORMAT),
      /** Phone only: the calendar starts folded to the selected week. */
      calendarOpen: false,
      sheetOpen: false,
      sheetPeriod: 'day',
      /** The full editor: its open flag and the item it is editing (null = new). */
      editorOpen: false,
      editItem: null,
      switcherOpen: false,
      /** Ladder steps replaying `rn-pop` after a cascade. */
      pop: [],
      popTimer: null,
      /** The year average the nav glyph's ring draws, from the cascade read. */
      // Unknown until the cascade reports it, so the shell hides the ring rather than draw 0%.
      yearAverage: null,
      toast: noToast(),
    };
  },

  computed: {
    /** The ONE breakpoint rule — `resolveShell`, never a second scheme. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    isPhone() {
      return this.shell === 'phone';
    },
    isDesktop() {
      return this.shell === 'desktop';
    },
    /** The phone header has room for glyphs only; the others carry labels. */
    labelledActions() {
      return !this.isPhone;
    },
    /** "Saturday, 12 September" — the shell's subtitle, always TODAY. */
    dateLabel() {
      return moment(this.today, DATE_FORMAT).format('dddd, D MMMM');
    },
    /**
     * The date a BLANK editor starts on — the same `period → date` rule the quick
     * sheet uses (`goalCascade.goalDateFor`), so a goal filed from either path
     * lands under the same Goal document.
     */
    editorDate() {
      return goalDateFor(normaliseTab(this.tab), this.selectedDate);
    },
  },

  mounted() {
    this.trackPageView('goals');
    this.trackUserInteraction('goals_page_mounted', 'lifecycle', {
      component: 'GoalsTime',
      shell: this.shell,
    });
  },

  beforeDestroy() {
    if (this.popTimer) clearTimeout(this.popTimer);
  },

  methods: {
    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    /**
     * Tapping the Goals tab while already on Goals opens the year-goal switcher
     * instead of re-pushing the route — the design's "Tap Goals again anytime to
     * open this". Desktop needs no sheet: its sidebar already lists them.
     */
    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      if (key === GOALS_NAV_KEY && this.$route.path === GOALS_ROUTE) {
        if (!this.isDesktop) this.switcherOpen = !this.switcherOpen;
        return;
      }
      this.goTo(item && item.route);
    },
    onSignOut() {
      signOut(this);
    },
    /** The mock only toasts "Opens /goals/milestones"; the route is real. */
    openMilestones() {
      this.trackUserInteraction('milestones_navigation', 'button_click', {
        from_page: 'goals',
        to_page: 'milestones',
      });
      this.goTo(MILESTONES_ROUTE);
    },
    /** A year goal NAVIGATES. It is never ticked from this page. */
    openYear(id) {
      if (!id) return;
      this.switcherOpen = false;
      this.goTo(`${YEAR_GOAL_ROUTE}/${id}`);
    },
    selectStep(key) {
      this.tab = normaliseTab(key);
    },
    selectDay(date) {
      if (!date) return;
      this.selectedDate = date;
      // The grid and the selection cannot disagree about the month once a day in
      // it has been chosen.
      this.monthDate = date;
      // Tapping a day means "show me that day", so the ladder follows it.
      this.tab = 'day';
    },
    /**
     * Step the calendar one month. `startOf('month')` because the 31st minus a
     * month is a different day in every month, and only the month is meant to
     * change — `GoalCalendarContainer` keys its read on the month's last day.
     */
    shiftMonth(step) {
      const next = moment(this.monthDate, DATE_FORMAT).add(step, 'month').startOf('month');
      if (!next.isValid()) return;
      this.monthDate = next.format(DATE_FORMAT);
    },
    openSheet() {
      this.trackUserInteraction('add_goal_dialog_open', 'button_click', {
        from_page: 'goals',
        period: normaliseTab(this.tab),
      });
      this.sheetPeriod = this.tab;
      this.sheetOpen = true;
    },
    /** The routine whose window contains now — the sheet's default choice. */
    defaultTaskRef(routines) {
      return currentRoutineId(routines, moment());
    },

    // ---- the tick, orchestrated -------------------------------------------
    /**
     * `plan` is what `goalCascade.planRowTick` resolved: the mutations to send, the
     * rollup toast and the ladder steps to pop. A blocked tick carries a toast and
     * no mutations, which is the whole of the "Ticked automatically" rule.
     */
    onTick(plan) {
      if (plan.toast) this.notify(plan.toast);
      this.playPop(plan.pop);
      if (!plan.ticks.length) return;
      this.$refs.tick.tick(plan.ticks)
        // The server recomputes every `progress` from its own goalRef links, so the
        // predicted counts in the toast are replaced by the real ones here.
        .then(() => this.refreshReads())
        .catch(() => {
          this.refreshReads();
          this.notify({
            icon: 'error_outline',
            color: '#ef9a9a',
            title: "Couldn't save that tick",
            sub: 'Nothing was changed — try again',
          });
        });
    },
    playPop(steps) {
      if (!steps || !steps.length) return;
      if (this.popTimer) clearTimeout(this.popTimer);
      this.pop = steps;
      this.popTimer = setTimeout(() => { this.pop = []; }, POP_MS);
    },
    /** Both display reads, because a tick changes a day count AND a streak. */
    refreshReads() {
      if (this.$refs.cascade) this.$refs.cascade.refresh();
      if (this.$refs.calendar) this.$refs.calendar.refresh();
    },
    // ---- the editor, and the delete behind it -----------------------------
    /**
     * Open the full editor on one goal item. The item arrives COMPLETE from the
     * cascade container's read — body, contribution, tags, subtasks, `goalRef`,
     * and the `period` + `date` of the Goal document that owns it, which is the
     * address every goal-item mutation is sent to.
     */
    openEditor(item) {
      this.editItem = item || null;
      this.editorOpen = true;
      this.trackUserInteraction('edit_goal_dialog_open', 'button_click', {
        from_page: 'goals',
        period: (item && item.period) || normaliseTab(this.tab),
        is_milestone: !!(item && item.isMilestone),
      });
    },
    closeEditor() {
      this.editorOpen = false;
      this.editItem = null;
    },
    /**
     * A save went through. Follow the goal to the level it now lives on (an edit
     * can move it), re-read both displays, and post the business event the old
     * page posted from the same place.
     */
    onGoalSaved({ goalItem, created }) {
      const item = goalItem || {};
      const tagsCount = Array.isArray(item.tags) ? item.tags.length : 0;
      if (created) {
        this.trackBusinessEvent('goal_created', {
          period: item.period,
          is_milestone: !!item.isMilestone,
          has_deadline: !!item.deadline,
          tags_count: tagsCount,
          goal_length: (item.body || '').length,
        });
      } else {
        this.trackBusinessEvent('goal_updated', {
          goal_id: item.id,
          period: item.period,
          is_milestone: !!item.isMilestone,
          has_deadline: !!item.deadline,
          tags_count: tagsCount,
        });
      }
      if (item.period) this.tab = normaliseTab(item.period);
      this.refreshReads();
    },
    /**
      * Asked for by the cascade ROW's delete glyph (never by the editor — the
      * dashboard puts delete on the goal list too). Destructive: nothing is sent
      * until the dialog that names the server cascade is confirmed.
      */
    confirmDelete(target) {
      if (target && this.$refs.deleteConfirm) this.$refs.deleteConfirm.open(target);
    },
    removeGoalItem(target) {
      this.closeEditor();
      this.$refs.remove.remove(target)
        // The server cascade also removed the item's milestones, which this
        // page's two reads know nothing about until they are re-read.
        .then(() => {
          this.refreshReads();
          this.notify({
            icon: 'delete_outline',
            color: '#90caf9',
            title: 'Goal deleted',
            sub: 'It and anything hanging off it is gone',
          });
        })
        .catch(() => {
          this.refreshReads();
          this.notify({
            icon: 'error_outline',
            color: '#ef9a9a',
            title: "Couldn't delete that goal",
            sub: 'Nothing was changed — try again',
          });
        });
    },
    onCreated({
      period, body, goalRef, tags,
    }) {
      this.trackBusinessEvent('goal_created', {
        period,
        is_milestone: !!goalRef,
        has_deadline: false,
        tags_count: (tags || []).length,
        goal_length: (body || '').length,
      });
      this.tab = normaliseTab(period);
      this.refreshReads();
    },
    onCreateFailed() {
      this.notify({
        icon: 'error_outline',
        color: '#ef9a9a',
        title: "Couldn't add that goal",
        sub: 'It was not saved — try again',
      });
    },
    /** Toast copy is always title + sub, the sub carrying the consequence. */
    notify({
      title, sub, icon, color,
    }) {
      this.toast = {
        title,
        sub,
        icon: icon || 'check_circle',
        color: color || '#81c784',
        seq: this.toast.seq + 1,
      };
    },
  },
};
</script>

<!-- Unscoped on purpose: the header buttons render into AppShell's own slot, which
     a scoped block cannot address. Every selector carries the page's root class or
     its own `goals-page__` prefix, so nothing leaks into the legacy layouts (see
     the web-app CSS convention). -->
<style>
.goals-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Tablet and desktop give the two columns the body's full height to divide, so
   each scrolls on its own instead of the page scrolling as one sheet.
   `height: 100%` rather than `flex: 1`: `.rn-shell__body` is a BLOCK with a
   resolved height (flex:1 of the 100vh shell column), not a flex container, so a
   flex-grow on this child would do nothing. */
.goals-page--tablet,
.goals-page--desktop {
  height: 100%;
  overflow: hidden;
}

.goals-page--tablet > .rn-gcas,
.goals-page--desktop > .rn-gcas {
  flex: 1;
  min-height: 0;
}
