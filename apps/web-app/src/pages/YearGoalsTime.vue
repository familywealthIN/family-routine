<template>
  <app-shell-container
    active="goals"
    :title="shellTitle"
    :subtitle="shellSubtitle"
    :year-average="yearAverage"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <!--
      Desktop lists every year goal in the persistent sidebar, so there is no
      switcher overlay on that shell at all (Year Goals.dc.html § Desktop).
    -->
    <template v-if="shell === 'desktop'" v-slot:sidebar>
      <year-goal-list-container
        ref="list"
        compact
        :active-id="goalId"
        :sort="goalSort"
        :today="today"
        @select="switchGoal"
        @ids="onGoalIds"
      />
    </template>

    <div class="year-goals" :class="`year-goals--${shell}`">
      <year-goal-container
        ref="tree"
        :goal-id="goalId"
        :shell="shell"
        :selected-month="selectedMonth"
        :open-week-id="openWeekId"
        :about-open="aboutOpen"
        :index-label="indexLabel"
        :has-prev="hasPrev"
        :has-next="hasNext"
        :today="today"
        @tree="onTree"
        @retry="refetchGoalList"
        @select-month="selectMonth"
        @toggle-about="aboutOpen = !aboutOpen"
        @open-switcher="openSwitcher"
        @step="stepGoal"
        @expand="toggleWeek"
        @tick-day="onTickDay"
        @tick-week="onTickWeek"
        @tick-month="onTickMonth"
        @menu="openMenu"
        @edit-day="onEditDay"
        @add-month="openCreate('month')"
        @add-week="openCreate('week')"
        @add-day="onAddDay"
      >
        <template v-slot:chat>
          <year-goal-chat-container
            ref="chat"
            :goal="tree"
            :month="focusedMonth"
            @open-create="openCreate"
            @create-weeks="onCreateWeeksFromChat"
            @complete-week="onTickWeek"
            @toggle-item="onTickWeek"
            @model-error="onModelError"
          />
        </template>
        <template v-slot:composer>
          <routine-composer
            :value="chatText"
            :variant="shell"
            placeholder="Ask about this goal…"
            @input="chatText = $event"
            @send="sendChat"
            @add-task="openCreate('week')"
          />
        </template>
      </year-goal-container>
    </div>

    <!--
      Phone sheet / tablet shelf. Mounted on every paint, not only while open: the
      same list feeds the hero's ‹ › steppers and tells the page where to go when
      the route carries no goal id.
    -->
    <year-goal-list-container
      v-if="shell !== 'desktop'"
      ref="list"
      :open="switcherOpen"
      :shell="shell"
      :active-id="goalId"
      :sort="goalSort"
      :query="goalQuery"
      :today="today"
      @select="switchGoal"
      @ids="onGoalIds"
      @sort="goalSort = $event"
      @query="goalQuery = $event"
      @open-overview="goTo(GOALS_ROUTE)"
      @close="closeSwitcher"
    />

    <!--
      Create: the goal-item sheet every page adds goals with (Home, Goals). The
      plan fixes what a new goal rolls up into, so period, date and the parent
      are locked to the draft and shown read-only; the routine is the user's.
    -->
    <goal-routine-index-container v-slot="{ routines }">
      <goal-item-create-container
        :open="sheet === 'create' && !!draft"
        :shell="shell"
        :routines="routines"
        locked
        :period="createDraftFor.period"
        :date="createDraftFor.date"
        :task-ref="createDraftFor.taskRef || ''"
        :goal-ref="createDraftFor.goalRef || ''"
        :heading="createDraftFor.title || ''"
        :placeholder="createDraftFor.placeholder || ''"
        :locked-date-label="createDraftFor.periodLabel || ''"
        :locked-goal-ref-label="createDraftFor.parentLabel || ''"
        :selected-date="createDraftFor.date || today"
        :today="today"
        @close="closeSheet"
        @created="onDraftCreated"
        @failed="onDraftFailed"
      />
    </goal-routine-index-container>

    <!-- The ⋮ action sheet, and the delete confirmation it leads to. -->
    <responsive-sheet
      :open="sheet === 'menu' || sheet === 'confirm'"
      :shell="shell"
      :width="SHEET_WIDTH"
      :handle="sheet === 'menu'"
      @close="closeSheet"
    >
      <goal-action-menu
        :title="menuTitle"
        :items="menuItems"
        @select="onMenuSelect"
      />
    </responsive-sheet>

    <!--
      The editor for every level, month, week and day: Home's goal sheet
      (`GoalEditSheetContainer`), the same sheet adding uses, so a goal edited
      here looks and saves exactly like one opened from a checklist row. Its
      status toggle runs this page's own `applyTick`, which rolls the tick up
      the tree. Delete stays behind the ⋮ and its confirmation.
    -->
    <goal-routine-index-container v-slot="{ routines }">
      <goal-edit-sheet-container
        :open="editorOpen"
        :shell="shell"
        :item="editItem"
        :routines="routines"
        :readonly="editorReadonly"
        :readonly-note="editorReadonlyNote"
        @close="closeEditor"
        @toggle="applyTick(($event && $event.period) || 'day', $event && $event.id)"
        @changed="refetchTree"
      />
    </goal-routine-index-container>

    <app-toast
      :shell="shell"
      :title="toast.title"
      :sub="toast.sub"
      :icon="toast.icon"
      :icon-color="toast.color"
      :seq="toast.seq"
      @done="clearToast"
    />

    <!-- Single-op write units. Renderless: they own a mutation, not a pixel. -->
    <goal-period-tick-container ref="tick" />
    <goal-period-create-container ref="create" />
    <goal-period-delete-container ref="remove" />
  </app-shell-container>
</template>

<script>
/**
 * /year-goals and /year-goals/:id, rebuilt to packages/design/Year Goals.dc.html.
 *
 * WHAT THIS PAGE OWNS
 * -------------------
 * Layout, route (which goal), and the UI state that is nobody's server data:
 * which month is focused, which week is unfolded, which sheet is open, the toast.
 * Plus the one thing that genuinely belongs to a page — orchestration of a write
 * that crosses domains (ARCHITECTURE § 6): a single tick can complete a day, a
 * week, a month AND the year, and each crossing posts a chat event. The cascade
 * is PLANNED by a pure function (`utils/yearGoalModel.planTick`) and APPLIED by a
 * single-op write container, so neither the arithmetic nor the mutation lives
 * here — only the sequencing.
 *
 * WHY THE PAGE TICKS THE PARENTS
 * ------------------------------
 * The server does not reliably cascade on demand. `completeGoalItem` only runs
 * `autoCheckTaskPeriod` when `isComplete && moment(date).weekday() >= 4`, and for
 * a non-day item it persists `isComplete` alone. A user who finishes their fifth
 * day on a Monday would otherwise see the week stay empty until some unrelated
 * read happened to pass through `autoCheckTaskPeriod`. So the page ticks every
 * crossed parent explicitly, in child-to-parent order, which lands the same state
 * the server's own helper would — just when the user earned it.
 *
 * WHAT USED TO BE HERE AND IS NOT
 * -------------------------------
 * The old page held an inline `currentYearGoal` query, three mutations through
 * `$goals`, `confirm()`-based deletion and a fullscreen `GoalCreationContainer`
 * dialog. The query is now `YearGoalContainer`'s, each mutation is its own
 * single-op container, deletion is a sheet that states the cascade, and creating
 * is one text field with a locked parent.
 *
 * ONE SHEET, AND WHY
 * -------------------
 * Every goal on this page, month, week or day, is added and edited in the goal
 * sheet Home and Goals use (`GoalItemSheet`). Adding locks the period, date and
 * parent to what `yearGoalModel.createDraft` derives; the routine is picked.
 * A month that is over takes no new goals.
 */
import moment from 'moment';
import AppToast from '@routine-notes/ui/molecules/AppToast/AppToast.vue';
import ResponsiveSheet from '@routine-notes/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue';
import GoalActionMenu from '@routine-notes/ui/molecules/GoalActionMenu/GoalActionMenu.vue';
import RoutineComposer from '@routine-notes/ui/organisms/RoutineComposer/RoutineComposer.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import YearGoalContainer from '../containers/YearGoalContainer.vue';
import YearGoalListContainer from '../containers/YearGoalListContainer.vue';
import YearGoalChatContainer from '../containers/YearGoalChatContainer.vue';
import GoalEditSheetContainer from '../containers/GoalEditSheetContainer.vue';
import GoalPeriodTickContainer from '../containers/GoalPeriodTickContainer.vue';
import GoalPeriodCreateContainer from '../containers/GoalPeriodCreateContainer.vue';
import GoalItemCreateContainer from '../containers/GoalItemCreateContainer.vue';
import GoalRoutineIndexContainer from '../containers/GoalRoutineIndexContainer.vue';
import GoalPeriodDeleteContainer from '../containers/GoalPeriodDeleteContainer.vue';
import { signOut } from '../utils/signOut';
import {
  TH, DATE_FORMAT, createDraft, planTick, nextWeekDate,
  itemForRow,
} from '../utils/yearGoalModel';

/** Year Goals' sheets are 480px on tablet and desktop — chassis.md § Sheet vs dialog. */
export const SHEET_WIDTH = 480;
export const GOALS_ROUTE = '/goals';
export const LOGOUT_KEY = 'logout';
export const GOALS_NAV_KEY = 'goals';

const noToast = () => ({
  title: '', sub: '', icon: 'check_circle', color: '#4CAF50', seq: 0,
});

export default {
  name: 'YearGoalsTime',

  components: {
    AppShellContainer,
    YearGoalContainer,
    YearGoalListContainer,
    YearGoalChatContainer,
    GoalEditSheetContainer,
    GoalPeriodTickContainer,
    GoalPeriodCreateContainer,
    GoalItemCreateContainer,
    GoalRoutineIndexContainer,
    GoalPeriodDeleteContainer,
    RoutineComposer,
    ResponsiveSheet,
    GoalActionMenu,
    AppToast,
  },

  props: {
    /** Kept from the old page: `views/YearGoals.vue` still passes it. Unused by
     *  the rebuild — the goal comes from the route id, not a tag. */
    tag: { type: String, default: '' },
  },

  data() {
    return {
      SHEET_WIDTH,
      GOALS_ROUTE,
      /** The tree the read container derived, so the page can plan a cascade. */
      tree: null,
      /**
       * Today, DD-MM-YYYY, read once. One definition for the whole page — the
       * tree, the switcher rows and the create dates all take it — and a test can
       * set it to a fixed day instead of mocking the clock.
       */
      today: moment().format(DATE_FORMAT),
      selectedMonth: moment().month(),
      openWeekId: '',
      aboutOpen: false,
      switcherOpen: false,
      goalQuery: '',
      goalSort: 'routine',
      goalIds: [],
      /** 'create' | 'menu' | 'confirm' | null */
      sheet: null,
      draft: null,
      menu: null,
      /**
       * The day-goal editor. The flag lives here, not in the container, because
       * the editor is opened from more than one place on this page — the same
       * split `GoalsTime` uses.
       */
      editorOpen: false,
      /** The COMPLETE goal-item record being edited, never a row view-model. */
      editItem: null,
      /** The editor opened on a past month's goal: same sheet, view only. */
      editorReadonly: false,
      chatText: '',
      toast: noToast(),
    };
  },

  computed: {
    /** The one breakpoint rule — `constants/navigation.resolveShell`. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    /** `props: true` on both routes, but only `/year-goals/:id` carries one. */
    goalId() {
      return (this.$route && this.$route.params && this.$route.params.id) || '';
    },
    shellTitle() {
      return (this.tree && this.tree.body) || 'Year goals';
    },
    shellSubtitle() {
      if (!this.tree) return '';
      return `Year goal · ${this.tree.year} · ${this.tree.monthsDone}/${TH.year} months`;
    },
    /** The Goals nav ring reads the focused year goal's own percentage; null
        (unknown, ring hidden) until the tree has loaded, never a fake 0%. */
    yearAverage() {
      return this.tree ? (this.tree.percent || 0) : null;
    },
    focusedMonth() {
      if (!this.tree) return null;
      return this.tree.months[this.selectedMonth] || null;
    },
    goalIndex() {
      return this.goalIds.indexOf(this.goalId);
    },
    indexLabel() {
      if (this.goalIndex < 0 || this.goalIds.length < 2) return '';
      return `${this.goalIndex + 1} of ${this.goalIds.length}`;
    },
    hasPrev() {
      return this.goalIndex > 0;
    },
    hasNext() {
      return this.goalIndex > -1 && this.goalIndex < this.goalIds.length - 1;
    },
    /** The open create draft, or an empty one so the sheet's props stay defined. */
    createDraftFor() {
      return this.draft || { period: 'day', date: '' };
    },
    /**
     * The address a blank editor would start on. Only ever a day here: the
     * editor is opened from a day row, and the item it is handed already carries
     * the `period` + `date` of the Goal document that owns it, which is what the
     * mutation is addressed with. These two are the fallback, not the source.
     */
    editorPeriod() {
      return (this.editItem && this.editItem.period) || 'day';
    },
    editorDate() {
      return (this.editItem && this.editItem.date) || this.today;
    },
    menuTitle() {
      if (!this.menu) return '';
      if (this.sheet === 'confirm') {
        return this.menu.kind === 'month'
          ? `Delete “${this.menu.item.body}”? Its week and day goals go too.`
          : `Delete “${this.menu.item.body}”? Its day goals go too.`;
      }
      return this.menu.item.body;
    },
    editorReadonlyNote() {
      const month = this.focusedMonth;
      return month ? `View only · ${month.name} is over` : 'View only';
    },
    menuItems() {
      if (!this.menu) return [];
      if (this.sheet === 'confirm') {
        return [
          {
            key: 'confirm-delete', icon: 'delete', label: 'Delete anyway', color: '#d32f2f',
          },
          { key: 'cancel', icon: 'close', label: 'Keep it' },
        ];
      }
      const isMonth = this.menu.kind === 'month';
      // A month that is over takes no new goals, so its menus offer no Add.
      const add = (this.focusedMonth && this.focusedMonth.isPast) ? [] : [
        { key: 'add', icon: 'add_task', label: isMonth ? 'Add week goal' : 'Add day goal' },
      ];
      const noun = isMonth ? 'month goal' : 'week goal';
      // A month that is over is history: its goals open view only.
      const view = (this.focusedMonth && this.focusedMonth.isPast)
        ? { key: 'edit', icon: 'visibility', label: `View ${noun}` }
        : { key: 'edit', icon: 'edit', label: `Edit ${noun}` };
      return [
        view,
        ...add,
        {
          key: 'delete',
          icon: 'delete',
          label: isMonth ? 'Delete month goal' : 'Delete',
          color: '#d32f2f',
        },
      ];
    },
  },

  watch: {
    /**
     * Switching goals resets the view but NOT the thread: each goal's chat is a
     * separate `routineChat(date, taskRef)` cache entry keyed by the goal's own
     * id and date, so coming back finds the conversation where it was left.
     */
    goalId() {
      this.selectedMonth = moment(this.today, DATE_FORMAT).month();
      this.openWeekId = '';
      this.aboutOpen = false;
      this.chatText = '';
      this.closeSheet();
      this.closeEditor();
      this.switcherOpen = false;
    },
  },

  methods: {
    // =====================================================================
    // Route + nav
    // =====================================================================
    goTo(route) {
      if (!route || (this.$route && this.$route.path === route)) return;
      this.$router.push(route).catch(() => {});
    },
    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      // Tapping Goals while already here opens the switcher rather than leaving
      // the page — the phone tab and the tablet rail are how you change goal.
      // Desktop has the whole list in its sidebar, so there it just navigates.
      if (key === GOALS_NAV_KEY && this.shell !== 'desktop') {
        this.switcherOpen = !this.switcherOpen;
        return;
      }
      this.goTo(item && item.route);
    },
    onSignOut() {
      signOut(this);
    },
    onGoalIds(ids) {
      this.goalIds = Array.isArray(ids) ? ids : [];
      // `/year-goals` with no id: land on the first goal rather than render an
      // empty page the user has to guess their way out of.
      if (!this.goalId && this.goalIds.length) {
        this.$router.replace(`/year-goals/${this.goalIds[0]}`).catch(() => {});
      }
    },
    switchGoal(id) {
      this.switcherOpen = false;
      if (!id || id === this.goalId) return;
      this.goTo(`/year-goals/${id}`);
    },
    stepGoal(delta) {
      const next = this.goalIndex + Number(delta || 0);
      if (this.goalIndex < 0 || next < 0 || next >= this.goalIds.length) return;
      this.switchGoal(this.goalIds[next]);
    },
    openSwitcher() {
      if (this.shell === 'desktop') return;
      this.switcherOpen = true;
    },
    closeSwitcher() {
      this.switcherOpen = false;
    },

    // =====================================================================
    // View state
    // =====================================================================
    onTree(tree) {
      this.tree = tree;
    },
    selectMonth(index) {
      this.selectedMonth = index;
      // A different month's weeks are different rows; keeping one unfolded would
      // leave an open panel belonging to a month that is no longer on screen.
      this.openWeekId = '';
    },
    toggleWeek(week) {
      this.openWeekId = this.openWeekId === week.id ? '' : week.id;
    },

    // =====================================================================
    // The cascade
    // =====================================================================
    onTickDay({ day }) {
      return this.applyTick('day', day && day.id);
    },
    onTickWeek(week) {
      return this.applyTick('week', week && week.id);
    },
    onTickMonth(month) {
      return this.applyTick('month', month && month.goal && month.goal.id);
    },

    /**
     * One gesture: plan it, apply it, log one chat event per crossing, show one
     * rollup toast, then re-read. Nothing is disabled while this runs — the
     * pending-entity guard stops a late query payload from reverting the tick.
     */
    async applyTick(level, id) {
      if (!this.tree || !id) return;
      const plan = planTick(this.tree, { level, id });

      // Blocked, not ignored: a week that already has its 5 done days says so.
      if (plan.blocked) {
        this.showToast(plan.toast);
        return;
      }
      if (!plan.ticks.length) return;

      try {
        await this.$refs.tick.tick(plan.ticks);
      } catch (error) {
        this.showToast({
          icon: 'error_outline',
          color: '#ef9a9a',
          title: "That tick didn't save",
          sub: 'Nothing was lost — check your connection and tap it again.',
        });
        this.refetchTree();
        return;
      }

      await this.postEvents(plan.events);
      if (plan.toast) this.showToast(plan.toast);
      this.refetchTree();
    },

    postEvents(events) {
      const { chat } = this.$refs;
      if (!chat || !events || !events.length) return Promise.resolve();
      return events.reduce(
        (chain, event) => chain.then(() => chat.postEvent({
          text: event.text, tone: event.tone, icon: event.icon,
        })),
        Promise.resolve(),
      );
    },

    refetchTree() {
      if (this.$refs.tree) this.$refs.tree.refetch();
    },
    /**
     * The main card's Retry re-reads the goal list too: one outage fails both
     * reads, and recovering only the card would leave the switcher wrong.
     */
    refetchGoalList() {
      if (this.$refs.list) this.$refs.list.refetch();
    },

    // =====================================================================
    // Create / rename / delete
    // =====================================================================
    /**
     * @param {string} kind 'month' | 'week' | 'day'
     * @param {Object} [context] `{ weekId }` for a day goal
     */
    openCreate(kind, context) {
      if (this.refusePastMonth()) return;
      const draft = createDraft(this.tree, kind, {
        monthIndex: this.selectedMonth,
        weekId: (context && context.weekId) || '',
        today: this.today || undefined,
      });
      if (!draft) {
        const month = this.focusedMonth;
        if (kind === 'week' && month && month.goal) {
          // The month has a goal but no week left in it (`nextWeekDate`).
          this.showToast(this.monthFullToast(month));
          return;
        }
        // Otherwise: asking for a week under a month with no goal.
        this.showToast({
          icon: 'flag',
          color: '#90caf9',
          title: 'Set the month goal first',
          sub: 'Weeks and days roll up into a month goal.',
        });
        return;
      }
      this.draft = draft;
      this.sheet = 'create';
    },
    monthFullToast(month) {
      return {
        icon: 'event_available',
        color: '#90caf9',
        title: `${month.name} is fully planned`,
        sub: 'Its last week goal already reaches the end of the month.',
      };
    },
    /** A month that is over takes no new goals. Says so instead of opening. */
    refusePastMonth() {
      const month = this.focusedMonth;
      if (!month || !month.isPast) return false;
      this.showToast({
        icon: 'lock',
        color: '#90caf9',
        title: `${month.name} is over`,
        sub: 'Goals can only be added to this month or later.',
      });
      return true;
    },
    onAddDay(week) {
      this.openCreate('day', { weekId: week && week.id });
    },
    openMenu(payload) {
      const item = payload.kind === 'month'
        ? payload.month && payload.month.goal
        : payload.week;
      if (!item) return;
      this.menu = { kind: payload.kind, item };
      this.sheet = 'menu';
    },
    onMenuSelect(key) {
      const { kind, item } = this.menu || {};
      if (!item) return undefined;
      if (key === 'edit') return this.editGoal(item);
      if (key === 'add') {
        if (kind === 'month') this.openCreate('week');
        else this.openCreate('day', { weekId: item.id });
        return undefined;
      }
      if (key === 'delete') {
        this.sheet = 'confirm';
        return undefined;
      }
      // Returned, not fired and forgotten: the caller (and the test) needs to
      // know when the delete has actually landed.
      if (key === 'confirm-delete') return this.removeGoal(item);
      if (key === 'cancel') this.closeSheet();
      return undefined;
    },
    /**
     * The ONE edit path for every level of the ladder, so the ⋮'s Edit and the
     * day row's edit glyph cannot drift into opening two different things: the
     * goal sheet, the same one adding uses. `openEditor` resolves the row to
     * its complete record, whatever its period.
     *
     * @param {Object} row the ROW that was acted on, not a record
     */
    editGoal(row) {
      return this.openEditor(row);
    },
    /** The day row's edit glyph. `.stop` there kept the row tap as the tick. */
    onEditDay(payload) {
      return this.openEditor(payload && payload.day);
    },
    /**
     * Open the full editor on the COMPLETE record a row stands for.
     *
     * A row carries only what it draws, and the editor needs the whole goal item
     * plus the `period` + `date` of the Goal document that owns it — the address
     * every goal-item mutation is sent to. `itemForRow` is the single pure
     * resolution of row → record (`GoalsCascadeContainer` solves the same problem
     * the same way), so nothing here reaches into the read container.
     */
    openEditor(row) {
      const item = itemForRow(this.tree, row);
      if (!item) return undefined;
      // The sheets and the fullscreen editor are two layers over the same board;
      // leaving a sheet open underneath it would be two forms for one goal.
      this.closeSheet();
      this.editItem = item;
      // A month that is over opens its goals view only, every input disabled.
      this.editorReadonly = !!(this.focusedMonth && this.focusedMonth.isPast);
      this.editorOpen = true;
      return undefined;
    },
    closeEditor() {
      this.editorOpen = false;
      this.editItem = null;
      this.editorReadonly = false;
    },
    /**
     * A save went through the same mutation the dashboard runs, so the normalized
     * `GoalItem:<id>` is already right. What is NOT is this page's arithmetic: the
     * week's `n/5`, the month's `n/3` and the year ring are all derived from the
     * milestone TREE, and an edit can move an item to another week entirely — so
     * the tree is re-read and every count above the row follows.
     */
    onGoalSaved({ goalItem, created } = {}) {
      const item = goalItem || {};
      // Follow the goal: a re-parented day goal belongs to a different week now,
      // and the one it moved to is the one worth looking at.
      if (item.period === 'day' && item.goalRef) this.openWeekId = item.goalRef;
      this.showToast({
        icon: created ? 'add_task' : 'edit',
        color: '#90caf9',
        title: created ? 'Day goal added' : 'Saved',
        sub: item.body || '',
      });
      this.refetchTree();
    },

    /** The create sheet saved. It reports before closing, so `draft` is still set. */
    async onDraftCreated({ body }) {
      const { draft } = this;
      if (!draft) return;
      await this.afterCreate(draft, body);
    },

    onDraftFailed() {
      this.showToast({
        icon: 'error_outline',
        color: '#ef9a9a',
        title: "That goal didn't save",
        sub: 'Check your connection and try again.',
      });
    },

    async afterCreate(draft, body) {
      // A day goal was added to a week, so show that week's rows straight away.
      if (draft.kind === 'day') this.openWeekId = draft.goalRef;

      this.showToast(this.createdToast(draft, body));
      await this.postEvents([{
        icon: draft.kind === 'month' ? 'flag' : 'add_task',
        tone: 'blue',
        text: draft.kind === 'month'
          ? `${draft.periodLabel}: ${body}`
          : `${draft.periodLabel}: ${body}`,
      }]);
      this.refetchTree();
    },

    createdToast(draft, body) {
      if (draft.kind === 'month') {
        return {
          icon: 'flag',
          color: '#90caf9',
          title: `${draft.periodLabel} goal set`,
          sub: `Rolls up into ${this.tree ? this.tree.body : 'this year goal'}`,
        };
      }
      return {
        icon: 'add_task',
        color: '#90caf9',
        title: draft.kind === 'week' ? 'Week goal added' : 'Day goal added',
        sub: `${body} · ${draft.periodLabel}`,
      };
    },

    async removeGoal(item) {
      this.closeSheet();
      const result = await this.$refs.remove.remove(item).catch(() => null);
      if (!result) {
        this.showToast({
          icon: 'error_outline',
          color: '#ef9a9a',
          title: "That goal wasn't deleted",
          sub: 'Nothing has changed — try again.',
        });
        return;
      }
      if (this.openWeekId === item.id) this.openWeekId = '';
      this.showToast({
        icon: 'delete',
        color: '#ef9a9a',
        title: 'Deleted',
        sub: `${item.body} · its milestones went with it`,
      });
      this.refetchTree();
    },

    closeSheet() {
      this.sheet = null;
      this.draft = null;
      this.menu = null;
    },

    // =====================================================================
    // Chat
    // =====================================================================
    sendChat(text) {
      const { chat } = this.$refs;
      if (!chat) return;
      this.chatText = '';
      chat.send(text);
    },
    /**
     * The model proposed week goals. Only the page can number them: consecutive
     * weeks need consecutive dates, derived from the ones the month already has.
     */
    async onCreateWeeksFromChat({ bodies, done }) {
      const month = this.focusedMonth;
      if (!this.tree || !month || !month.goal || this.refusePastMonth()) {
        done([]);
        return;
      }
      const taken = month.weeks.map((week) => ({ date: week.date }));
      const drafts = [];
      let overflow = 0;
      (bodies || []).forEach((body) => {
        const text = String(body || '').trim();
        if (!text) return;
        const date = nextWeekDate(
          this.tree.year,
          { ...month, weeks: taken },
          this.today || undefined,
        );
        // No week left in this month: never file one from the next month here.
        if (!date) {
          overflow += 1;
          return;
        }
        taken.push({ date });
        drafts.push({
          kind: 'week',
          period: 'week',
          date,
          goalRef: month.goal.id,
          body: text,
        });
      });
      if (overflow) this.showToast(this.monthFullToast(month));
      if (!drafts.length) {
        done([]);
        return;
      }

      const created = await this.$refs.create.createMany(drafts);
      done(created.map((item) => item.id));
      if (created.length) this.refetchTree();
    },
    onModelError(message) {
      this.showToast({
        icon: 'cloud_off',
        color: '#90caf9',
        title: 'The model could not answer',
        sub: String(message || 'Try again in a moment.'),
      });
    },

    // =====================================================================
    // Toast
    // =====================================================================
    showToast(toast) {
      if (!toast || !toast.title) return;
      this.toast = {
        title: toast.title,
        sub: toast.sub || '',
        icon: toast.icon || 'check_circle',
        color: toast.color || '#4CAF50',
        seq: this.toast.seq + 1,
      };
    },
    clearToast() {
      this.toast = { ...this.toast, title: '', sub: '' };
    },
  },
};
</script>

<style>
/*
  Root-class prefixed: this page renders the chassis shell, so nothing here may
  leak into the legacy toolbar layouts (MEMORY: web-app CSS lives inline in
  organisms).
*/
.year-goals {
  min-width: 0;
}

/* Tablet and desktop give the board the shell body's full height, because its
   two columns scroll independently of each other. */
.year-goals--tablet,
.year-goals--desktop {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.year-goals--tablet > *,
.year-goals--desktop > * {
  flex: 1;
  min-height: 0;
}
</style>
