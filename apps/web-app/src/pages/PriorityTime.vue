<template>
  <div class="rn-priority">
    <!--
      Priority, rebuilt to packages/design/Priority.dc.html on the redesign
      chassis (docs/redesign/chassis.md). The page composes containers and
      orchestrates the writes that cross domains — goal item, agent, routine item
      — exactly as containers/ARCHITECTURE.md § 6 prescribes.
    -->
    <app-shell
      :shell="shell"
      active="priority"
      title="Priority"
      :subtitle="subtitle"
      :points="points"
      :points-entitled="pointsEntitled"
      :points-loading="pointsLoading"
      :points-error="pointsError"
      :user="user"
      :streak-days="summary.streakDays"
      :scores="summary.scores"
      :year-average="summary.yearAverage"
      :status-bar="false"
      @navigate="onNavigate"
      @sign-out="onSignOut"
      @open-points="goTo('/progress')"
    >
      <priority-board
        ref="board"
        :date="date"
        :shell="shell"
        :agent-statuses="agentStatuses"
        :now="now"
        :skipped="skipped"
        @summary="onSummary"
        @assign="onAssign"
        @skip="onSkip"
        @toggle="onToggle"
        @action="onAction"
        @open="onOpenItem"
      />

      <app-toast
        :shell="shell"
        :title="toast.title"
        :sub="toast.sub"
        :icon="toast.icon"
        :icon-color="toast.iconColor"
        :seq="toast.seq"
        @done="clearToast"
      />
    </app-shell>

    <!-- Write units: one mutation each, no markup. The page drives them by ref
         so it holds no in-flight state of its own. -->
    <priority-quadrant-update ref="quadrant" @error="onQuadrantError" />
    <priority-item-complete ref="complete" :date="date" @error="onCompleteError" />
    <priority-routine-create ref="routineCreate" @error="onAutomateError" />

    <!-- Reused as-is: the agent editor (its own domain + routine options). A
         Priority row is still editable — the design draws no pencil, so the row
         body opens the goal sheet below. -->
    <agent-edit-modal ref="agentModal" :tasklist="tasklist" @saved="onAgentSaved" />
    <!-- Home's goal sheet, the one editor every page now shares. -->
    <goal-edit-sheet-container
      :open="goalDialogOpen"
      :shell="shell"
      :item="selectedGoalItem"
      :routines="tasklist"
      @close="onGoalEditorClosed"
      @toggle="onToggle"
      @changed="refetchBoard"
    />
  </div>
</template>

<script>
import moment from 'moment';
import AppShell from '@routine-notes/ui/organisms/AppShell/AppShell.vue';
import AppToast from '@routine-notes/ui/molecules/AppToast/AppToast.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import { ROUTINE_RULE, quadrantOf, quadrantToastColor } from '@routine-notes/ui/constants/priority';
import PriorityBoard from '../containers/PriorityBoardContainer.vue';
import PriorityQuadrantUpdate from '../containers/PriorityQuadrantUpdateContainer.vue';
import PriorityItemComplete from '../containers/PriorityItemCompleteContainer.vue';
import PriorityRoutineCreate from '../containers/PriorityRoutineCreateContainer.vue';
import AgentEditModal from '../containers/AgentEditModalContainer.vue';
import GoalEditSheetContainer from '../containers/GoalEditSheetContainer.vue';
import { XP_BALANCE_QUERY } from '../composables/graphql/queries';
import { NO_ROUTINE_KEY } from '../utils/priorityBoard';
import { signOut } from '../utils/signOut';
import eventBus, { EVENTS } from '../utils/eventBus';
import { describeWriteError } from '../containers/RoutineItemEditorContainer.vue';

const DAY_FORMAT = 'DD-MM-YYYY';
// The NOW badge only has to be right to the minute.
const NOW_TICK_MS = 60000;

const EMPTY_SUMMARY = {
  openTotal: 0,
  triageCount: 0,
  tasklist: [],
  scores: { D: 0, K: 0, G: 0 },
  streakDays: 0,
  yearAverage: 0,
  hasData: false,
  loaded: false,
  loadError: false,
};

export default {
  name: 'PriorityTime',
  components: {
    AppShell,
    AppToast,
    PriorityBoard,
    PriorityQuadrantUpdate,
    PriorityItemComplete,
    PriorityRoutineCreate,
    AgentEditModal,
    GoalEditSheetContainer,
  },
  apollo: {
    xpBalance: {
      query: XP_BALANCE_QUERY,
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.xpBalance;
      },
      result({ data }) {
        if (data) this.xpBalanceError = false;
      },
      // A failed load leaves the balance unknown, not zero (D-10).
      error(error) {
        console.error('[PriorityTime] xpBalance query error:', error);
        this.xpBalanceError = true;
      },
    },
  },
  data() {
    return {
      date: moment().format(DAY_FORMAT),
      now: Date.now(),
      nowTimer: null,
      xpBalance: null,
      xpBalanceError: false,
      summary: { ...EMPTY_SUMMARY },
      // Triage ids deferred to the back of the queue. Session-only on purpose:
      // "Skip" is an ordering preference for this sitting, not a stored decision
      // (it assigns no quadrant, so there is nothing to persist).
      skipped: [],
      toast: {
        title: '', sub: '', icon: 'check_circle', iconColor: '#4CAF50', seq: 0,
      },
      goalDialogOpen: false,
      selectedGoalItem: null,
    };
  },
  computed: {
    /** The ONE breakpoint rule — never re-derived here (chassis.md § shells). */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    longDate() {
      return moment(this.date, DAY_FORMAT).format('dddd, D MMMM');
    },
    subtitle() {
      // No counts until the board has been read — "0 open" would be a claim.
      if (!this.summary.loaded) return this.longDate;
      const open = `${this.summary.openTotal} open`;
      if (this.shell === 'phone') return `${this.longDate} · ${open}`;
      return `${this.longDate} · ${open} · ${this.summary.triageCount} to triage`;
    },
    user() {
      return {
        name: this.$root.$data.name || '',
        email: this.$root.$data.email || '',
        picture: this.$root.$data.picture || '',
      };
    },
    points() {
      return (this.xpBalance && this.xpBalance.available) || 0;
    },
    pointsEntitled() {
      return !!(this.xpBalance && this.xpBalance.entitled);
    },
    pointsLoading() {
      const query = this.$apollo.queries.xpBalance;
      return !!(query && query.loading) && !this.xpBalance;
    },
    pointsError() {
      return this.xpBalanceError && !this.xpBalance;
    },
    /** Day-scoped agent badges, keyed by routine taskRef. */
    agentStatuses() {
      return this.$agent.statusByRoutineId;
    },
    /** The day's routine tasks, as the board read them — the agent editor's options. */
    tasklist() {
      return this.summary.tasklist || [];
    },
  },
  created() {
    // Ids whose AUTOMATE create (mutation + board re-read) is still in flight.
    // Non-reactive on purpose: it guards a double tap, it paints nothing.
    this.automating = new Set();
  },
  mounted() {
    // Agents are keyed by routine task; the DELEGATE chip needs to know which
    // tasks actually have one before it can hand anything over.
    this.$agent.fetchAll();
    this.nowTimer = setInterval(() => { this.now = Date.now(); }, NOW_TICK_MS);
    eventBus.$on(EVENTS.GOALS_SAVED, this.refetchBoard);
    eventBus.$on(EVENTS.TASK_CREATED, this.refetchBoard);
  },
  beforeDestroy() {
    if (this.nowTimer) clearInterval(this.nowTimer);
    eventBus.$off(EVENTS.GOALS_SAVED, this.refetchBoard);
    eventBus.$off(EVENTS.TASK_CREATED, this.refetchBoard);
  },
  methods: {
    // =====================================================================
    // Shell
    // =====================================================================
    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onNavigate(key, item) {
      this.goTo(item && item.route);
    },
    onSignOut() {
      signOut(this);
    },

    // =====================================================================
    // Toast — always title + sub, the sub carrying the consequence
    // =====================================================================
    showToast({
      title, sub, icon = 'check_circle', iconColor = '#4CAF50',
    }) {
      this.toast = {
        title, sub, icon, iconColor, seq: this.toast.seq + 1,
      };
    },
    clearToast() {
      this.toast = { ...this.toast, title: '', sub: '' };
    },

    // =====================================================================
    // Board plumbing
    // =====================================================================
    onSummary(summary) {
      this.summary = { ...EMPTY_SUMMARY, ...summary };
    },
    refetchBoard() {
      const { board } = this.$refs;
      return board ? board.refetch() : null;
    },
    /**
     * After a write lands: a board whose last read failed is stuck in Apollo's
     * error state and ignores the cache patch, so it has to re-read (a healthy
     * board is a no-op — the cache broadcast already repainted it).
     */
    recoverBoard() {
      const { board } = this.$refs;
      return board && typeof board.recover === 'function' ? board.recover() : null;
    },
    routineFor(taskRef) {
      if (!taskRef || taskRef === NO_ROUTINE_KEY) return null;
      return (this.tasklist || []).find((task) => task && task.id === taskRef) || null;
    },

    // =====================================================================
    // Triage + move (one write: the item's priority tag)
    // =====================================================================
    onAssign({ item, quadrant, fromTriage }) {
      const token = quadrantOf(quadrant) || {};
      this.showToast({
        title: `${fromTriage ? 'Triaged' : 'Moved'} to ${token.label || quadrant}`,
        sub: item.body,
        icon: token.icon || 'bolt',
        iconColor: quadrantToastColor(quadrant),
      });
      // The item leaves the triage queue by growing a tag, so its skip entry is
      // dead weight — drop it or a later re-triage would start at the back.
      this.skipped = this.skipped.filter((id) => id !== item.id);
      const unit = this.$refs.quadrant;
      if (unit) unit.assign(item, quadrant).then(() => this.recoverBoard()).catch(() => {});
    },
    /** Defer, do not assign: the item goes to the BACK of the triage queue. */
    onSkip(item) {
      if (!item || !item.id) return;
      this.skipped = [...this.skipped.filter((id) => id !== item.id), item.id];
    },
    onQuadrantError({ item }) {
      this.showToast({
        title: "Couldn't move that",
        sub: `${item.body} stayed where it was`,
        icon: 'error_outline',
        iconColor: '#e57373',
      });
    },

    // =====================================================================
    // Tick (one write: completion)
    // =====================================================================
    onToggle(item) {
      const isComplete = !item.isComplete;
      const token = quadrantOf(item.quadrant) || {};
      this.showToast({
        title: isComplete ? 'Done' : 'Reopened',
        sub: `${item.body} · ${token.label || 'Priority'}`,
        icon: isComplete ? 'check_circle' : 'undo',
        iconColor: isComplete ? '#4CAF50' : '#90a4ae',
      });
      const unit = this.$refs.complete;
      if (unit) unit.toggle(item).then(() => this.recoverBoard()).catch(() => {});
    },
    onCompleteError({ item }) {
      this.showToast({
        title: "Couldn't save that tick",
        sub: `${item.body} is unchanged`,
        icon: 'error_outline',
        iconColor: '#e57373',
      });
    },

    // =====================================================================
    // Row chips — the DELEGATE and AUTOMATE state machines
    // =====================================================================
    onAction({ item, type }) {
      if (type === 'hand-to-agent') this.handToAgent(item);
      else if (type === 'view-result') this.viewAgentResult(item);
      else if (type === 'automate') this.automate(item);
    },
    /**
     * Agents hang off a ROUTINE TASK, so "hand to agent" fires that task's real
     * start event with this row as the goal id — the same op Home uses. A task
     * with no agent yet has nothing to fire, so the gesture opens the agent
     * editor prefilled with it instead of failing silently.
     */
    handToAgent(item) {
      const routine = this.routineFor(item.taskRef);
      const agent = this.$agent.getByTaskRef(item.taskRef);
      const hasStart = !!(agent && agent.startEvent && agent.startEvent.value);

      if (!hasStart) {
        this.showToast({
          title: 'No agent on this routine yet',
          sub: `Give ${(routine && routine.name) || 'it'} a start event and hand it over`,
          icon: 'smart_toy',
          iconColor: '#64b5f6',
        });
        if (this.$refs.agentModal) this.$refs.agentModal.open(item.taskRef);
        return;
      }

      this.showToast({
        title: 'Handed to agent',
        sub: `${item.body} · start event sent`,
        icon: 'smart_toy',
        iconColor: '#64b5f6',
      });
      this.$agent.fireStartEventIfPresent({
        taskRef: item.taskRef,
        goalId: item.id,
        goalDate: item.date,
        goalPeriod: item.period,
        implicit: false,
      }).catch(() => {});
    },
    /** The saved transcript rides on the item's `reward`; App.vue hosts the modal. */
    viewAgentResult(item) {
      if (item.reward) {
        this.$agent.showSavedResult(item.taskRef || item.id, item.reward);
        return;
      }
      this.$agent.openResultModal(item.taskRef);
    },
    onAgentSaved() {
      this.showToast({
        title: 'Agent saved',
        sub: 'Its routine can hand work over now',
        icon: 'smart_toy',
        iconColor: '#64b5f6',
      });
    },
    /**
     * AUTOMATE: create the real recurring routine task. The chip then reads
     * "Routine task" because the refetched tasklist contains it — no local flag.
     */
    automate(item) {
      const routine = this.routineFor(item.taskRef);
      const unit = this.$refs.routineCreate;
      if (!unit) return null;
      // The chip only flips to "Routine task" once the board re-reads, so a
      // second tap in that window would create a duplicate routine item.
      if (this.automating.has(item.id)) return null;
      this.automating.add(item.id);
      this.showToast({
        title: 'Now a routine task',
        sub: `${item.body} · ${ROUTINE_RULE}${routine ? ` in ${routine.name}` : ''}`,
        icon: 'autorenew',
        iconColor: quadrantToastColor('automate'),
      });
      const release = () => { this.automating.delete(item.id); };
      return unit.automate(item, routine)
        .then(() => this.refetchBoard())
        .catch(() => {})
        .then(release);
    },
    onAutomateError({ item, error }) {
      // The server's own reason when it gave one (e.g. the 100-point day budget
      // is full); otherwise the generic line.
      const reason = describeWriteError(error, '');
      this.showToast({
        title: "Couldn't make that a routine",
        sub: reason || `${item.body} is still a one-off`,
        icon: 'error_outline',
        iconColor: '#e57373',
      });
    },

    // =====================================================================
    // Goal editor (reused container)
    // =====================================================================
    onOpenItem(item) {
      this.selectedGoalItem = {
        id: item.id,
        body: item.body,
        progress: item.progress,
        isComplete: item.isComplete,
        taskRef: item.taskRef,
        goalRef: item.goalRef,
        contribution: item.contribution || '',
        reward: item.reward || '',
        tags: item.tags || [],
        status: item.status,
        isMilestone: item.isMilestone,
        subTasks: item.subTasks || [],
        date: item.date,
        period: item.period,
      };
      this.goalDialogOpen = true;
    },
    onGoalEditorClosed() {
      this.goalDialogOpen = false;
      this.selectedGoalItem = null;
      this.refetchBoard();
    },
  },
};
</script>

<style>
/* The shell owns the frame; the page only has to stop the old layout's gutters
   from doubling up on it. Root-class prefixed so nothing leaks. */
.rn-priority {
  height: 100%;
  min-height: 0;
}

.rn-priority .rn-shell__body {
  display: flex;
  flex-direction: column;
}

/* Tablet and desktop render all four quadrant cards at once, so the board has to
   fill the body rather than scroll inside it. */
.rn-priority .rn-shell--tablet .rn-shell__body,
.rn-priority .rn-shell--desktop .rn-shell__body {
  overflow: hidden;
}

.rn-priority .rn-pboard--tablet,
.rn-priority .rn-pboard--desktop {
  flex: 1;
  min-height: 0;
}
</style>
