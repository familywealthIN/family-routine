<template>
  <div class="rn-home" :class="`rn-home--${shell}`">
    <!-- ================= PHONE ================= -->
    <template v-if="shell === 'phone'">
      <routine-top-bar
        ref="topbar"
        title="Home"
        :ticked="!!(focusRow && focusRow.ticked)"
        :routine-name="focusRow ? focusRow.name : ''"
        :flying="!!fly"
        :mini-color="miniColor"
        :mini-glyph="miniGlyph"
        :mini-title="miniTitle"
        :mini-breathing="agentLive"
        :mini-ring-ms="agentRingMs"
        :available="(xpBalance && xpBalance.available) || 0"
        :pending-today="(xpBalance && xpBalance.pendingToday) || 0"
        :entitled="!!(xpBalance && xpBalance.entitled)"
        :points-loading="$apollo.queries.xpBalance.loading && !xpBalance"
        :points-error="xpBalanceError && !xpBalance"
        :picture="profileImage"
        :user-name="userName"
        :inbox-count="inboxCount"
        :subtitle="daySummary"
        @open-drawer="drawerOpen = true"
        @mini-click="onMiniClick"
        @open-points="goTo('/progress')"
        @open-inbox="inboxOpen = true"
      />

      <!-- Always shown: the owner wants the week in view, not behind a grab handle. -->
      <div class="rn-home__week" :style="weekStripStyle" data-testid="week-strip">
        <weekday-selector-container
          :selectedDate="date"
          :skipped-dates="skippedDates"
          :today-date="todayDate"
          @date-selected="handleDateSelected"
          @long-press="onDayLongPress"
        />
      </div>

      <div class="rn-home__phone-body">
        <!-- Pull down from the top of the card to refetch the day. -->
        <pull-to-refresh :refreshing="refreshing" @refresh="pullRefresh">
          <routine-deck
            :peeks="deckPeeks"
            :has-prev="focusIndex > 0"
            :has-next="focusIndex < rows.length - 1"
            @prev="focusPrev"
            @next="focusNext"
            @focus-routine="setFocus"
          >
            <routine-focus-card v-if="focusRow" ref="card" v-bind="cardProps" v-on="cardHandlers">
              <template #thread>
                <routine-chat-container v-bind="chatProps" ref="chat" v-on="chatHandlers" />
              </template>
            </routine-focus-card>
            <div v-else class="rn-home__empty">
              <p>{{ emptyMessage }}</p>
              <button type="button" class="rn-home__empty-btn" @click="goTo('/settings')">
                Open Routine Settings
              </button>
            </div>
          </routine-deck>
        </pull-to-refresh>

        <routine-composer
          v-if="focusRow"
          v-model="chatText"
          variant="phone"
          :placeholder="composerPlaceholder"
          @send="sendChat"
          @focus="onComposerFocus(true)"
          @add-task="openAiSearch"
        />
      </div>

      <nav class="rn-home__nav">
        <div
          v-for="item in navItems"
          :key="item.route"
          class="rn-home__nav-item"
          :style="{ color: item.active ? '#288bd5' : 'rgba(0,0,0,.54)' }"
          @click="goTo(item.route)"
        >
          <i class="rn-mi rn-home__nav-icon">{{ item.icon }}</i>
          <span class="rn-home__nav-label">{{ item.label }}</span>
        </div>
      </nav>
    </template>

    <!-- ================= TABLET / DESKTOP ================= -->
    <!--
      The rail (tablet) and sidebar (desktop) are the chassis' — the same
      AppShell every other page renders — so nav, hover, More and the profile
      row cannot drift from the rest of the app again. Home keeps its own main
      column through the `main` slot: its date header and 3:2 checklist/chat
      split are measured to the design and the generic head/body cannot hold them.
    -->
    <app-shell-container
      v-else
      class="rn-home__shell"
      active="home"
      :more-initially-open="false"
      :scores="stimulusTotals"
      :streak-days="streakDays"
      :streak-hint="streakHint"
      @navigate="onShellNavigate"
    >
      <!-- Desktop only: the shell renders `sidebar` under the nav. -->
      <template v-slot:sidebar>
        <routine-rail
          class="rn-home__rail"
          layout="rows"
          :routines="rows"
          :ticked-count="tickedCount"
          :day-label="railDayLabel"
          @focus-routine="setFocus"
        />
      </template>

      <template v-slot:main>
        <div class="rn-home__main">
          <header class="rn-home__header">
            <div class="rn-home__header-text">
              <div class="rn-home__date">{{ longDate }}</div>
              <div class="rn-home__header-sub">
                {{ daySummary }}
              </div>
            </div>
            <div class="rn-home__header-week">
              <!--
                Both large shells draw the header strip at the same size: the
                design's iPad (6a) and desktop (6b) frames each put a 28px ring in
                a 38px cell. Desktop used to ask for 36 — the phone ring — which
                made the whole strip read a size too big.
              -->
              <weekday-selector-container
                :selectedDate="date"
                :ring-size="headerRingSize"
                :skipped-dates="skippedDates"
                :today-date="todayDate"
                @date-selected="handleDateSelected"
                @long-press="onDayLongPress"
              />
            </div>
            <div
              class="rn-home__inbox"
              title="Inbox"
              data-testid="header-inbox"
              @click="inboxOpen = true"
            >
              <i class="rn-mi">inbox</i>
              <span
                v-if="inboxCount"
                class="rn-home__inbox-badge"
                data-testid="header-inbox-badge"
              >{{ inboxCount }}</span>
            </div>
            <focus-points-chip
              :available="(xpBalance && xpBalance.available) || 0"
              :pending-today="(xpBalance && xpBalance.pendingToday) || 0"
              :entitled="!!(xpBalance && xpBalance.entitled)"
              :loading="$apollo.queries.xpBalance.loading && !xpBalance"
              :error="xpBalanceError && !xpBalance"
              :size="28"
              @click="goTo('/progress')"
            />
          </header>

          <routine-rail
            v-if="shell === 'tablet'"
            layout="chips"
            :routines="rows"
            :ticked-count="tickedCount"
            @focus-routine="setFocus"
          />

          <div class="rn-home__content">
            <routine-focus-card v-if="focusRow" ref="card" v-bind="cardProps" v-on="cardHandlers" />
            <div v-else class="rn-home__empty rn-home__empty--pane">
              <p>{{ emptyMessage }}</p>
              <button type="button" class="rn-home__empty-btn" @click="goTo('/settings')">
                Open Routine Settings
              </button>
            </div>

            <section v-if="focusRow" class="rn-home__chat-pane">
              <header class="rn-home__chat-head">
                <div
                  class="rn-home__chat-avatar"
                  :style="{ background: focusRow.stimulusTint, color: focusRow.stimulusColor }"
                >
                  <i class="rn-mi">forum</i>
                </div>
                <div class="rn-home__chat-head-text">
                  <div class="rn-home__chat-name">{{ focusRow.name }}</div>
                  <div class="rn-home__chat-sub">{{ chatSubline }}</div>
                </div>
              </header>
              <div class="rn-home__chat-body rn-hidescroll">
                <routine-chat-container v-bind="chatProps" ref="chat" v-on="chatHandlers" />
              </div>
              <routine-composer
                v-model="chatText"
                :variant="shell"
                :placeholder="composerPlaceholder"
                @send="sendChat"
                @focus="onComposerFocus(false)"
                @add-task="openAiSearch"
              />
            </section>
          </div>
        </div>
      </template>
    </app-shell-container>

    <!-- ================= SHARED OVERLAYS ================= -->
    <user-drawer
      :value="drawerOpen"
      :name="userName"
      :email="userEmail"
      :picture="profileImage"
      :stimulus-totals="stimulusTotals"
      :streak-days="streakDays"
      :streak-hint="streakHint"
      :nav-items="drawerNavItems"
      @input="drawerOpen = $event"
      @navigate="onDrawerNavigate"
    />

    <!--
      The Start Work sheet. It owns its own chassis sheet now (`sheet` prop) rather
      than being wrapped in `RoutineSheet`, because the design gives it a header of
      its own — routine name plus "09:00 – 12:30 · earns +12 pts" — and no close
      button, which an outer titled sheet cannot express.

      The quick-task form, not a bare button row: an agent has nothing to run
      against until the routine has a goal item, so the sheet that starts a routine
      must be able to create one. Type the task, pick the parent goal it rolls up
      into, and Start Task / Start Agent create it before ticking. Same container
      the classic dashboard's quick-task modal mounts (inline there — `sheet`
      defaults to false), so it brings the already-passed points note, the Related
      Goals timeline and the action buttons with it.

      `v-if` keeps the mount/unmount semantics `RoutineSheet` had, so the container
      still refetches on each open via the `actionSheetKey` bump.
    -->
    <quick-goal-creation
      v-if="actionSheetOpen"
      :key="actionSheetKey"
      sheet
      :open="actionSheetOpen"
      :shell="shell"
      :routine-name="focusRow ? focusRow.name : ''"
      :routine-time="focusRow ? focusRow.time : ''"
      :routine-end-time="focusWindowInfo.endTime"
      :earn-points="focusRow ? focusRow.points : 0"
      :description="focusRow ? focusRow.description : ''"
      :goals="displayGoals"
      :date="date"
      period="day"
      :tasklist="tasklist"
      :selectedTaskRef="focusRow ? focusRow.id : ''"
      :redeem-cost="actionRedeemCost"
      :open-item-count="focusOpenItemCount"
      allow-start-without-task
      @close="actionSheetOpen = false"
      @start-quick-goal-task="onStartTask"
      @start-agent="onStartAgent"
      @build-agent="onBuildAgent"
    />

    <!--
      Tapping a checklist row opens the goal item itself — the goal-item page
      (`sheetGoal`). It replaced a read-only summary sheet: the row was the only
      way into an item from this screen, and it could not change anything, so
      every edit meant leaving Home for the classic dashboard.

      Always mounted, visibility driven by `:open`. It must NOT be `v-if`-ed on
      the open item: delete and "move to tomorrow" both close the sheet while
      their mutation is still in flight, and a container torn down underneath a
      pending promise never reports the change the page refetches on.
    -->
    <goal-item-sheet-container
      :open="!!openGoalItem"
      :shell="shell"
      :item="openGoalItem"
      :date="openGoalItemDate"
      period="day"
      :period-label="goalSheetPeriodLabel"
      :routine-label="goalSheetRoutineLabel"
      :goal-ref-label="goalSheetGoalRefLabel"
      :date-label="goalSheetDateLabel"
      :date-locked="isPastDay"
      :date-options="goalSheetDateOptions"
      :tag-universe="tagUniverse"
      :tag-usage="tagUsage"
      :reward-meta="goalSheetRewardMeta"
      :reward-new="goalSheetRewardNew"
      :routines="tasklist"
      @close="closeGoalItem"
      @toggle-item="toggleOpenGoalItem"
      @open-transcript="openTranscript"
      @reward-seen="markRewardSeen"
      @changed="onGoalItemChanged"
    />

    <!-- Tasks with no routine. The checklist groups by routine, so without this
         sheet an item created without one is invisible on this screen. -->
    <inbox-sheet-container
      :open="inboxOpen"
      :shell="shell"
      :items="inboxItems"
      :current-routine="inboxTargetRoutine"
      :routines="inboxRoutines"
      :date="date"
      period="day"
      @close="inboxOpen = false"
      @changed="refetchGoals"
      @pending-count="inboxPendingCount = $event"
    />

    <skip-day-container
      :open="skipSheetOpen"
      :shell="shell"
      :day-label="skipDayLabel"
      :skipped="isSkippedDay"
      :routine-id="did"
      @close="skipSheetOpen = false"
      @changed="onSkipChanged"
    />

    <!--
      The same form the Agents page and Routine Settings use. Home used to mount
      `AgentEditModal` — a second Vuetify agent form with its own save path and
      its own idea of which routines are free (it offered routines that already
      have an agent, which the unique index then refuses). One form, one rule.
    -->
    <agent-form-container
      ref="agentForm"
      :shell="shell"
      @saved="onAgentSaved"
      @removed="onAgentSaved"
    />

    <paywall-drawer
      v-model="paywallDrawerOpen"
      :cost="paywallCost"
      :available="(xpBalance && xpBalance.available) || 0"
      :show-purchase="showPaywallPurchase"
    />

    <!-- Tick flight: a ghost ring (and title) arcing to the header centre. -->
    <template v-if="fly">
      <div
        v-if="fly.name"
        class="rn-home__fly-title"
        :style="flyTitleStyle"
      >{{ fly.name }}</div>
      <div class="rn-home__fly-ring" :style="flyRingStyle">
        <i class="rn-mi rn-home__fly-glyph">check</i>
      </div>
    </template>
  </div>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';
import gql from 'graphql-tag';

import RoutineFocusCard from '@routine-notes/ui/organisms/RoutineFocusCard/RoutineFocusCard.vue';
import RoutineDeck from '@routine-notes/ui/organisms/RoutineDeck/RoutineDeck.vue';
import RoutineComposer from '@routine-notes/ui/organisms/RoutineComposer/RoutineComposer.vue';
import RoutineTopBar from '@routine-notes/ui/organisms/RoutineTopBar/RoutineTopBar.vue';
import UserDrawer from '@routine-notes/ui/organisms/UserDrawer/UserDrawer.vue';
import { PaywallDrawer } from '@routine-notes/ui/organisms';
import { buildTagUniverse } from '@routine-notes/ui/utils/tags';
import RoutineRail from '@routine-notes/ui/molecules/RoutineRail/RoutineRail.vue';
import FocusPointsChip from '@routine-notes/ui/molecules/FocusPointsChip/FocusPointsChip.vue';
import PullToRefresh from '@routine-notes/ui/molecules/PullToRefresh/PullToRefresh.vue';
import { FOCUS_NAV, agentStageOf, AGENT_LIVE_STAGES } from '@routine-notes/ui/constants/routineFocus';

import WeekdaySelectorContainer from '../containers/WeekdaySelectorContainer.vue';
import RoutineChatContainer from '../containers/RoutineChatContainer.vue';
import QuickGoalCreation from '../containers/QuickGoalCreationContainer.vue';
import GoalItemSheetContainer from '../containers/GoalItemSheetContainer.vue';
import InboxSheetContainer from '../containers/InboxSheetContainer.vue';
import SkipDayContainer from '../containers/SkipDayContainer.vue';
import AgentFormContainer from '../containers/AgentFormContainer.vue';
import AppShellContainer from '../containers/AppShellContainer.vue';
import {
  ROUTINE_DATE_QUERY,
  DAILY_GOALS_QUERY,
  XP_BALANCE_QUERY,
  GOALS_BY_GOAL_REF_QUERY,
  REDEEM_ROUTINE_ITEM_MUTATION,
} from '../composables/graphql/queries';
import { XP_PAYWALL_PURCHASE } from '../config/featureFlags';
import {
  updateRoutineTaskInCache,
  updateRoutineTaskKEarnedInCache,
  updateWeekStimuliKInCache,
} from '../composables/useApolloCacheUpdates';
import eventBus, { EVENTS } from '../utils/eventBus';
import { MeasurementMixin } from '../utils/measurementMixins';
import intelligentRefreshMixin from '../mixins/intelligentRefreshMixin';
import { routinePassWaitMixin } from '../mixins/routinePassWaitMixin';
import { dashboardContextMixin } from '../mixins/dashboardContextMixin';
import { pendingMutations } from '../utils/pendingMutations';
import { guardFields, releaseEntity } from '../utils/cacheGuard';
import { startAgentWhenReady } from '../utils/agentStart';
import { runNewDayReset } from '../utils/newDay';
import { describeRedeemFailure, describeRedeemReceipt } from '../utils/routineTaskDisplay';
import { scopeGoalsToRef } from '../utils/goalRefScope';
import { threshold } from '../utils/getDates';
import {
  buildRoutineRows, findCurrentRoutine, focusWindow, buildCascade, pickCascadeItem,
} from '../utils/routineFocusModel';

// How long the fly ghost lives (keyframes run 0.8s).
const FLY_MS = 820;
// A day counts toward the streak once this many routines are ticked.
const STREAK_TICKS = 3;
// The ring inside a tablet/desktop header day cell. Both large frames (6a, 6b)
// draw 28px; only the phone's own strip runs at 36.
// TODO move to packages/ui/constants/routineFocus.js — a per-shell token.
const HEADER_RING_SIZE = 28;
// The phone strip's height. The design declares it as a token
// (`weekMaxH: '80px'`) rather than letting the cells decide, so the card below
// it does not shift as the rings change size.
// TODO move to packages/ui/constants/routineFocus.js — a per-shell token.
const WEEK_STRIP_OPEN_PX = 80;
// Which agent transcripts have been looked at, so the orange NEW pill is about
// this user and not about this page load. Ids only — the transcript itself lives
// on the goal item.
const REWARD_SEEN_KEY = 'rn-reward-seen';
// Day-goal quick-picks on the goal-item page: today, tomorrow, and the start of
// next week (the design's "Mon").
const DATE_PICKS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
];

export default {
  name: 'RoutineFocus',
  components: {
    RoutineFocusCard,
    RoutineDeck,
    RoutineComposer,
    RoutineTopBar,
    UserDrawer,
    RoutineRail,
    FocusPointsChip,
    PullToRefresh,
    QuickGoalCreation,
    PaywallDrawer,
    WeekdaySelectorContainer,
    RoutineChatContainer,
    GoalItemSheetContainer,
    InboxSheetContainer,
    SkipDayContainer,
    AgentFormContainer,
    AppShellContainer,
  },
  mixins: [
    MeasurementMixin,
    intelligentRefreshMixin,
    routinePassWaitMixin,
    dashboardContextMixin,
  ],
  apollo: {
    routineDate: {
      query: ROUTINE_DATE_QUERY,
      // Routine tasks reuse the same _id across days, so Apollo normalises
      // them to one entity per task; without a network reconcile a new day
      // could show the previous day's cached stimuli.
      fetchPolicy: 'cache-and-network',
      skip() {
        return !this.$root.$data.email;
      },
      variables() {
        return { date: this.date };
      },
      update(data) {
        this.routineFirstLoad = false;
        if (data.routineDate) {
          this.did = data.routineDate.id || '';
          this.$routine.setSkipDay(!!data.routineDate.skip);
          return data.routineDate;
        }
        if (data.routineDate === null) this.addNewDayRoutine();
        return null;
      },
      result({ data }) {
        if (data) this.loadError = false;
      },
      error(error) {
        console.error('[RoutineFocus] routine query error:', error);
        this.loadError = true;
      },
    },
    goals: {
      query: DAILY_GOALS_QUERY,
      skip() {
        return !this.$root.$data.email;
      },
      variables() {
        return { date: this.date };
      },
      update(data) {
        this.goalsFirstLoad = false;
        return data.optimizedDailyGoals;
      },
      error(error) {
        console.error('[RoutineFocus] daily goals query error:', error);
      },
    },
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
      // A failed load leaves the balance unknown, not zero.
      error(error) {
        console.error('[RoutineFocus] xpBalance query error:', error);
        this.xpBalanceError = true;
      },
    },
    cascadeChildren: {
      query: GOALS_BY_GOAL_REF_QUERY,
      skip() {
        return !this.$root.$data.email || !this.cascadeGoalItemId;
      },
      variables() {
        return { goalRef: this.cascadeGoalItemId };
      },
      // The server returns the COMPLETE goalItems list on purpose — filtering
      // it server-side would overwrite the same normalized Goal entity the
      // dashboard reads (see utils/goalRefScope.js). Scope it here.
      update(data) {
        return scopeGoalsToRef(data.goalsByGoalRef, this.cascadeGoalItemId);
      },
      error(error) {
        console.error('[RoutineFocus] cascade children query error:', error);
      },
    },
  },
  data() {
    return {
      date: moment().format('DD-MM-YYYY'),
      todayDate: moment().format('DD-MM-YYYY'),
      now: moment(),
      nowTimerId: null,
      did: '',
      // Which routine the screen is concentrated on. Empty = "follow the clock".
      focusRoutineId: '',
      period: 'day',
      checklistOpen: true,
      // Pull-to-refresh refetch in flight (phone).
      refreshing: false,
      drawerOpen: false,
      actionSheetOpen: false,
      // Bumped each time the action sheet opens so <quick-goal-creation>
      // remounts fresh — clears stale loading state and refetches the Goal
      // Task dropdown, which picks up week goals added since the app loaded.
      actionSheetKey: 0,
      // The checklist row the goal sheet is showing, by id. Held as an id, not
      // the object: the sheet edits the item, and a captured object would keep
      // rendering the values from the moment it was tapped.
      openGoalItemId: '',
      inboxOpen: false,
      // Unrouted tasks the Inbox sheet holds that `inboxItems` (today's goal
      // items with no routine) does not — reported by the container.
      inboxPendingCount: 0,
      skipSheetOpen: false,
      rewardSeen: {},
      paywallDrawerOpen: false,
      paywallCost: 0,
      showPaywallPurchase: XP_PAYWALL_PURCHASE,
      chatText: '',
      // Transient tick-flight geometry (phone only).
      fly: null,
      flyTimer: null,
      // taskRefs whose END event is on the wire — the design's `firing` stage.
      endEventFiring: {},
      routineFirstLoad: true,
      goalsFirstLoad: true,
      // True while the day's routine document is being created. Without it the
      // gap between "no routine for today" and "created + refetched" paints the
      // empty state, which reads as "you have no routine items".
      preparingRoutine: false,
      loadError: false,
      xpBalanceError: false,
      dispatchedRouteAction: '',
      mountTime: Date.now(),
    };
  },
  computed: {
    // --- shell ------------------------------------------------------------
    /**
     * phone < 600 · tablet 600–1263 (iPad mini landscape is 1133) · desktop ≥ 1264.
     */
    shell() {
      const bp = this.$vuetify.breakpoint;
      if (bp.xsOnly) return 'phone';
      return bp.width >= 1264 ? 'desktop' : 'tablet';
    },
    isToday() {
      return this.date === this.todayDate;
    },
    /**
     * Pass/wait maintenance writes to the document `did` names, deciding
     * "passed" from the time of day alone — so it must only run when the loaded
     * document IS today's. Around a day switch or midnight `date` can already
     * say today while `routineDate`/`did` still hold another day, and that
     * used to stamp tomorrow's morning routines "Missed".
     */
    canMaintainPassWait() {
      const doc = this.routineDate;
      return this.isToday
        && !!doc && doc.date === this.todayDate
        && !!this.did && this.did === doc.id;
    },
    /**
     * Strictly behind today. A future day still accepts checklist items, so it
     * is not "past" for the purposes of the chat brief's Add pills.
     */
    isPastDay() {
      if (this.isToday) return false;
      return moment(this.date, 'DD-MM-YYYY')
        .isBefore(moment(this.todayDate, 'DD-MM-YYYY'), 'day');
    },
    /** The rail header names the viewed day; only today is "TODAY". */
    railDayLabel() {
      if (this.isToday) return 'TODAY';
      return moment(this.date, 'DD-MM-YYYY').format('ddd D MMM').toUpperCase();
    },
    longDate() {
      return moment(this.date, 'DD-MM-YYYY').format('dddd, D MMMM');
    },
    userName() {
      return this.$root.$data.name || '';
    },
    userEmail() {
      return this.$root.$data.email || '';
    },
    profileImage() {
      return this.$root.$data.picture || '/img/default-user.png';
    },

    // --- routine + goal data ---------------------------------------------
    /**
     * A routineDate.tasklist can repeat the same task id, which gives duplicate
     * v-for keys and two cards rendering the same routine. Dedupe on read.
     */
    tasklist() {
      const list = (this.routineDate && this.routineDate.tasklist) || [];
      const seen = {};
      return list.filter((task) => {
        if (!task || !task.id || seen[task.id]) return false;
        seen[task.id] = true;
        return true;
      });
    },
    dayGoalItems() {
      return (this.goals || [])
        .filter((goal) => goal && goal.period === 'day')
        .reduce((acc, goal) => acc.concat(goal.goalItems || []), []);
    },
    itemsByTask() {
      const map = {};
      this.dayGoalItems.forEach((item) => {
        if (!item || !item.taskRef) return;
        if (!map[item.taskRef]) map[item.taskRef] = [];
        map[item.taskRef].push(this.decorateItem(item));
      });
      return map;
    },
    rows() {
      return buildRoutineRows(this.tasklist, {
        now: this.now,
        itemsByTask: this.itemsByTask,
        isToday: this.isToday,
        isPastDay: this.isPastDay,
        focusId: this.resolvedFocusId,
      });
    },
    /**
     * Which routine the clock says is current.
     *
     * Derived from the tasklist, NOT from `rows`: `rows` is built with
     * `resolvedFocusId`, and resolving the focus through a row would make
     * rows → resolvedFocusId → rows a circular computed.
     */
    currentRoutineId() {
      if (!this.isToday) return '';
      const current = findCurrentRoutine(this.tasklist, this.now);
      return current ? current.id : '';
    },
    currentRow() {
      return this.rows.find((row) => row.isCurrent) || null;
    },
    /** An explicit focus wins; otherwise follow the clock. */
    resolvedFocusId() {
      if (this.focusRoutineId
        && this.tasklist.some((task) => task.id === this.focusRoutineId)) {
        return this.focusRoutineId;
      }
      if (this.currentRoutineId) return this.currentRoutineId;
      return this.tasklist.length ? this.tasklist[0].id : '';
    },
    focusIndex() {
      return this.rows.findIndex((row) => row.id === this.resolvedFocusId);
    },
    focusRow() {
      return this.rows[this.focusIndex] || null;
    },
    focusItems() {
      return (this.focusRow && this.focusRow.items) || [];
    },
    focusWindowInfo() {
      return focusWindow(this.rows, this.focusIndex, this.now, { isToday: this.isToday });
    },
    tickedCount() {
      return this.rows.filter((row) => row.ticked).length;
    },
    routinesLeft() {
      return this.rows.filter((row) => !row.ticked).length;
    },
    /**
     * The day's task count is the sum of each routine card's "x of y done":
     * y is the server's slot count (one task per 2 hours of the window, see
     * routineSlotCount) or the checklist length when that is larger.
     */
    dayDoneCount() {
      return this.rows.reduce((sum, row) => sum + row.doneCount, 0);
    },
    dayTotalCount() {
      return this.rows.reduce((sum, row) => sum + row.totalCount, 0);
    },
    /** "5 routines left · 7/9 tasks" — the large shells' header line, which the
        phone top bar now shows too. */
    daySummary() {
      return `${this.routinesLeft} routines left · ${this.dayDoneCount}/${this.dayTotalCount} tasks`;
    },
    showBackToNow() {
      return !!this.currentRoutineId && this.resolvedFocusId !== this.currentRoutineId;
    },
    deckPeeks() {
      return this.rows.slice(this.focusIndex + 1, this.focusIndex + 3);
    },
    emptyMessage() {
      if (this.preparingRoutine) return 'Setting today up…';
      if (this.loadError) {
        return "We couldn't load today's routine. Check your connection and pull to refresh.";
      }
      if (this.routineFirstLoad || this.routineLoading) return 'Loading today…';
      return 'No routine items yet. Add them in Routine Settings and today gets its shape.';
    },
    routineLoading() {
      const query = this.$apollo.queries.routineDate;
      return !!(query && query.loading);
    },

    // --- stimuli / streak -------------------------------------------------
    stimulusTotals() {
      return { D: this.countTotal('D'), K: this.countTotal('K'), G: this.countTotal('G') };
    },
    /**
     * Streak is not persisted anywhere yet, so it is stated from what this day
     * can actually prove: whether today clears the 3-tick bar.
     */
    streakDays() {
      return this.tickedCount >= STREAK_TICKS ? 1 : 0;
    },
    streakHint() {
      const left = STREAK_TICKS - this.tickedCount;
      return left <= 0
        ? `Today counts — ${this.tickedCount} routines ticked`
        : `Tick ${left} more routine${left === 1 ? '' : 's'} to count today`;
    },

    // --- agent ------------------------------------------------------------
    /**
     * The focused routine's agent stage, as the ring draws it. 'firing' is
     * derived rather than stored: the store has no distinct end-event status,
     * so the page marks the taskRefs whose end event IT put on the wire.
     */
    agentStage() {
      const id = this.resolvedFocusId;
      if (!id) return 'none';
      if (this.endEventFiring[id]) return 'firing';
      return this.effectiveAgentStatus(id) || 'none';
    },
    agentLive() {
      return AGENT_LIVE_STAGES.indexOf(this.agentStage) !== -1;
    },
    /** Any of today's routines has an agent mid-run (badge running/listening). */
    anyAgentLiveToday() {
      if (!this.isToday) return false;
      return this.tasklist.some((task) => {
        const status = this.effectiveAgentStatus(task.id);
        return status === 'running' || status === 'listening';
      });
    },
    agentRingMs() {
      const stage = agentStageOf(this.agentStage);
      return stage ? stage.ringMs : 1800;
    },
    agentFinished() {
      return this.agentStage === 'finished';
    },
    miniColor() {
      const stage = agentStageOf(this.agentStage);
      return this.agentLive && stage ? stage.color : '#4CAF50';
    },
    miniGlyph() {
      const stage = agentStageOf(this.agentStage);
      return this.agentLive && stage ? stage.glyph : 'check';
    },
    miniTitle() {
      if (this.agentLive) return 'Agent working';
      if (this.agentFinished) return 'View agent result';
      return 'Ticked';
    },
    actionRedeemCost() {
      return this.redeemCostForTask(this.focusRow);
    },
    displayGoals() {
      return this.goals || [];
    },
    /** Open items on the focused routine — the action sheet's hint line. */
    focusOpenItemCount() {
      return this.focusItems.filter((item) => item && !item.isComplete).length;
    },

    // --- goal-item page ---------------------------------------------------
    /**
     * The item the sheet is showing, resolved from the live list every render.
     *
     * The sheet edits the item, so it has to read the same entity the checklist
     * does; holding the object captured at tap time would freeze the title, the
     * subtasks and the tick state at that moment.
     */
    openGoalItem() {
      if (!this.openGoalItemId) return null;
      const found = this.dayGoalItems
        .find((item) => item && String(item.id) === String(this.openGoalItemId));
      return found ? this.decorateItem(found) : null;
    },
    /** The Goal document the open item lives in — the mutation's `date`. */
    openGoalItemDate() {
      const owner = (this.goals || []).find((goal) => goal
        && goal.period === 'day'
        && (goal.goalItems || [])
          .some((item) => item && String(item.id) === String(this.openGoalItemId)));
      return (owner && owner.date) || this.date;
    },
    goalSheetPeriodLabel() {
      return `Day goal · ${moment(this.openGoalItemDate, 'DD-MM-YYYY').format('D MMM YYYY')}`;
    },
    goalSheetRoutineLabel() {
      const item = this.openGoalItem;
      if (!item || !item.taskRef) return 'Inbox';
      const row = this.rows.find((r) => String(r.id) === String(item.taskRef));
      if (!row) return 'Inbox';
      return row.time ? `${row.name} · ${row.time}` : row.name;
    },
    /**
     * The parent goal's own words, not its id. `goalRef` holds the id of a goal
     * item one period up, so the label is a lookup — and the lookup can miss
     * (the week goal may not be in the day read), in which case the row says
     * "not linked" rather than printing a Mongo id at the user.
     */
    goalSheetGoalRefLabel() {
      const item = this.openGoalItem;
      if (!item || !item.goalRef) return '';
      const parent = (this.goals || [])
        .filter((goal) => goal && goal.period !== 'day')
        .reduce((acc, goal) => acc.concat(goal.goalItems || []), [])
        .find((candidate) => candidate && String(candidate.id) === String(item.goalRef));
      return parent ? parent.body : '';
    },
    goalSheetDateLabel() {
      const target = moment(this.openGoalItemDate, 'DD-MM-YYYY');
      const prefix = target.format('DD-MM-YYYY') === this.todayDate ? 'Today · ' : '';
      return `${prefix}${target.format('ddd D MMM')}`;
    },
    /**
     * Today / Tomorrow / the coming Monday. Moving an item is `updateGoalItem`
     * with a different `date`, which relocates the subdocument and keeps its id;
     * a past day is locked instead (see the sheet's Date row).
     */
    goalSheetDateOptions() {
      const today = moment(this.todayDate, 'DD-MM-YYYY');
      const current = this.openGoalItemDate;
      const picks = DATE_PICKS.map((pick) => {
        const date = today.clone().add(pick.days, 'days').format('DD-MM-YYYY');
        return {
          key: pick.key, label: pick.label, date, active: date === current,
        };
      });
      const monday = today.clone().add(1, 'week').startOf('isoWeek');
      const mondayDate = monday.format('DD-MM-YYYY');
      if (!picks.some((pick) => pick.date === mondayDate)) {
        picks.push({
          key: 'monday',
          label: monday.format('ddd'),
          date: mondayDate,
          active: mondayDate === current,
        });
      }
      return picks;
    },
    goalSheetRewardMeta() {
      const item = this.openGoalItem;
      if (!item || !item.reward) return '';
      const agent = this.$agent.getByTaskRef(String(item.taskRef || ''));
      const name = (agent && agent.name) || 'An agent';
      const at = agent && agent.lastRunAt
        ? moment(Number(agent.lastRunAt) || agent.lastRunAt).format('D MMM HH:mm')
        : 'end event';
      return `Updated by ${name} · end event · ${at}`;
    },
    goalSheetRewardNew() {
      const item = this.openGoalItem;
      return !!(item && item.reward && !this.rewardSeen[item.id]);
    },
    /**
     * The tag vocabulary the goal-item page suggests from: everything already in
     * use on the day's items and on the routines, plus whatever the user has
     * typed before. `buildTagUniverse` adds every ancestor prefix, so `area:` can
     * be drilled into even when only leaves are in use.
     */
    tagUniverse() {
      const fromItems = this.dayGoalItems
        .reduce((acc, item) => acc.concat((item && item.tags) || []), []);
      const fromRoutines = this.tasklist
        .reduce((acc, task) => acc.concat((task && task.tags) || []), []);
      let remembered = [];
      try {
        remembered = JSON.parse(localStorage.getItem('userTags') || '[]') || [];
      } catch (e) {
        remembered = [];
      }
      return buildTagUniverse(fromItems, fromRoutines, remembered);
    },
    /** How many of the day's items carry each tag — the dropdown's "3 goals". */
    tagUsage() {
      const usage = {};
      this.dayGoalItems.forEach((item) => {
        ((item && item.tags) || []).forEach((tag) => {
          usage[tag] = (usage[tag] || 0) + 1;
        });
      });
      return usage;
    },

    // --- inbox ------------------------------------------------------------
    /**
     * The day's goal items with no routine.
     *
     * Derived from the page's own `optimizedDailyGoals` read, not a second query:
     * the focus card groups the same list by `taskRef`, so these are exactly the
     * items it drops on the floor (§6b). It is scoped to the selected day, which
     * is the limit of what the server can answer — there is no query that filters
     * on "taskRef unset" across dates.
     */
    inboxItems() {
      return this.dayGoalItems
        .filter((item) => item && !item.taskRef && !item.isComplete)
        .map((item) => ({
          ...item,
          meta: item.createdAt
            ? `Added ${moment(Number(item.createdAt) || item.createdAt).format('ddd HH:mm')}`
            : 'No routine yet',
        }));
    },
    inboxCount() {
      return this.inboxItems.length + this.inboxPendingCount;
    },
    /** Routines carry the goalRef an Inbox item inherits when it lands on one. */
    inboxRoutines() {
      return this.rows.map((row) => ({
        id: row.id,
        name: row.name,
        time: row.time,
        goalRef: this.goalRefForRoutine(row.id),
      }));
    },
    inboxTargetRoutine() {
      const target = this.currentRow || this.focusRow;
      if (!target) return null;
      return {
        id: target.id,
        name: target.name,
        time: target.time,
        goalRef: this.goalRefForRoutine(target.id),
      };
    },

    // --- skip day ---------------------------------------------------------
    isSkippedDay() {
      return !!(this.routineDate && this.routineDate.skip);
    },
    /** The optimistic half of the week strip's pause overlay. */
    skippedDates() {
      return this.isSkippedDay ? [this.date] : [];
    },
    skipDayLabel() {
      return moment(this.todayDate, 'DD-MM-YYYY').format('dddd, D MMMM');
    },

    // --- cascade ----------------------------------------------------------
    cascadeGoalItemId() {
      if (this.period === 'day') return '';
      const item = pickCascadeItem({
        goals: this.goals, period: this.period, focusRow: this.focusRow,
      });
      return item ? item.id : '';
    },
    cascade() {
      if (this.period === 'day') return null;
      return buildCascade({
        period: this.period,
        goals: this.goals,
        focusRow: this.focusRow,
        date: this.date,
        children: this.cascadeChildren || [],
      });
    },

    // --- child props ------------------------------------------------------
    cardProps() {
      return {
        routine: this.focusRow,
        endTime: this.focusWindowInfo.endTime,
        statusLabel: this.focusWindowInfo.statusLabel,
        statusColor: this.focusWindowInfo.statusColor,
        leftLabel: this.focusWindowInfo.leftLabel,
        // Every shell: the phone's deck header (and its "N OF M TICKED" bar) is
        // gone, so the card's status row carries it everywhere, as on desktop.
        showBackToNow: this.showBackToNow,
        elapsedPct: this.focusWindowInfo.elapsedPct,
        items: this.focusItems,
        doneCount: this.focusRow ? this.focusRow.doneCount : 0,
        totalCount: this.focusRow ? this.focusRow.totalCount : 0,
        period: this.period,
        checklistOpen: this.checklistOpen,
        agentStage: this.agentStage,
        variant: this.shell,
        showResultLink: this.agentFinished,
        cascade: this.cascade,
        loading: this.showGoalsSkeleton,
        flying: !!this.fly,
        skipped: this.isSkippedDay,
      };
    },
    cardHandlers() {
      return {
        action: this.onRingAction,
        'toggle-item': this.toggleItem,
        'open-item': this.openItem,
        'add-task': this.openAiSearch,
        'set-period': this.setPeriod,
        'toggle-checklist': this.toggleChecklist,
        'back-to-now': this.backToNow,
        'open-result': this.openAgentResult,
        'open-transcript': this.openTranscript,
      };
    },
    chatProps() {
      return {
        date: this.date,
        routine: this.focusRow,
        endTime: this.focusWindowInfo.endTime,
        statusLabel: this.focusWindowInfo.statusLabel,
        leftLabel: this.focusWindowInfo.leftLabel,
        goalItems: this.focusItems,
        scores: this.stimulusTotals,
        // The "Before you start" brief offers to add to today's checklist, so
        // it must not render on a day that can no longer take one.
        isPastDay: this.isPastDay,
        // On the phone the thread scrolls with the card's checklist.
        sharedScroller: this.shell === 'phone',
      };
    },
    chatHandlers() {
      return {
        'toggle-item': this.toggleItem,
        'complete-item': this.completeItemFromChat,
        'items-created': this.onChatItemsCreated,
      };
    },
    chatSubline() {
      if (this.agentLive) return 'Agent working on this routine…';
      if (!this.focusRow) return '';
      return `${this.focusRow.doneCount} of ${this.focusRow.totalCount} done · ${this.focusWindowInfo.leftLabel}`;
    },
    composerPlaceholder() {
      return `Message ${this.focusRow ? this.focusRow.name : 'this routine'}…`;
    },
    showGoalsSkeleton() {
      const loading = this.$apollo.queries.goals && this.$apollo.queries.goals.loading;
      const hasData = Array.isArray(this.goals) && this.goals.length > 0;
      return !!loading && this.goalsFirstLoad && !hasData;
    },
    headerRingSize() {
      return HEADER_RING_SIZE;
    },
    /**
     * The strip is the design's 80px, not whatever the cells add up to (they
     * measure 73px). It is always shown — the grab-handle reveal was removed on
     * the owner's call, so there is no open/closed state any more.
     */
    weekStripStyle() {
      const px = `${WEEK_STRIP_OPEN_PX}px`;
      return { height: px, maxHeight: px };
    },

    // --- nav --------------------------------------------------------------
    navItems() {
      return FOCUS_NAV.map((item) => ({
        ...item,
        active: this.$route.path === item.route || this.$route.path.startsWith(`${item.route}/`),
      }));
    },
    drawerNavItems() {
      return [
        ...this.navItems,
        { icon: 'settings', label: 'Settings', route: '/settings' },
        // No Log out: signing out lives on Profile, as on every other shell.
        { icon: 'person', label: 'Profile', route: '/settings/profile' },
      ];
    },

    // --- fly --------------------------------------------------------------
    flyRingStyle() {
      const f = this.fly;
      return {
        left: `${f.left}px`,
        top: `${f.top}px`,
        width: `${f.size}px`,
        height: `${f.size}px`,
        '--dx': `${f.dx}px`,
        '--dy': `${f.dy}px`,
        '--s': String(f.scale),
      };
    },
    flyTitleStyle() {
      const f = this.fly;
      return {
        left: `${f.tLeft}px`,
        top: `${f.tTop}px`,
        '--dx': `${f.tDx}px`,
        '--dy': `${f.tDy}px`,
        // 19px card title down to the 12px header name.
        '--s': String(12 / 19),
      };
    },
  },
  watch: {
    'routineDate.tasklist': {
      handler(tasklist) {
        this.$currentTask.setTasklist(tasklist || []);
        if (tasklist && tasklist.length) {
          this.routineFirstLoad = false;
          // The day's area/project AI context. Kicked off from here and not
          // `mounted()` because the routine list arrives asynchronously, and
          // the tags we build context for live on those routines.
          this.startDashboardCaching();
          if (this.canMaintainPassWait) this.setPassedWait();
        }
      },
      immediate: true,
    },
    currentRow: {
      handler(row) {
        this.$currentTask.setCurrentTask(row || {});
      },
      immediate: true,
    },
    actionSheetOpen(isOpen) {
      if (isOpen) this.actionSheetKey += 1;
    },
    // Switching the focused routine switches the chat thread, and the thread
    // must open at its newest message.
    resolvedFocusId() {
      this.chatText = '';
      this.checklistOpen = true;
      this.$nextTick(() => {
        if (this.$refs.card && this.$refs.card.scrollToBottomSoon) {
          this.$refs.card.scrollToBottomSoon();
        }
      });
    },
    rows: {
      handler() {
        this.maybeDispatchRouteAction();
      },
      immediate: true,
    },
    '$route.params.action': function watchRouteAction() {
      this.maybeDispatchRouteAction();
    },
  },
  mounted() {
    this.trackPageView('routine-focus');
    // Which transcripts have already been read. The NEW pill is about the user,
    // not about this page load, so it survives a reload.
    try {
      const seen = JSON.parse(localStorage.getItem(REWARD_SEEN_KEY) || '[]') || [];
      this.rewardSeen = seen.reduce((acc, id) => ({ ...acc, [id]: true }), {});
    } catch (e) {
      this.rewardSeen = {};
    }
    this.$agent.fetchAll();

    eventBus.$on(EVENTS.REFETCH_DAILY_GOALS, this.refetchGoals);
    eventBus.$on(EVENTS.GOAL_ITEM_CREATED, this.refetchGoals);
    eventBus.$on(EVENTS.TASK_CREATED, this.refetchGoals);
    eventBus.$on(EVENTS.GOALS_SAVED, this.refetchGoals);
    // An agent's status moving (start sent, listening, finished, failed) is the
    // moment its contribution / reward may have landed on the goal item.
    eventBus.$on(EVENTS.AGENT_STATUS_CHANGED, this.onAgentStatusChanged);
    // The points chip lives in this page's own top bar now, so this page owns
    // re-reading it. Earnings are settled server-side, so a tick changes the
    // balance without the mutation ever returning it.
    eventBus.$on(EVENTS.ROUTINE_TICKED, this.refetchXpBalance);
    eventBus.$on(EVENTS.XP_REDEEMED, this.refetchXpBalance);

    this.startIntelligentRefresh({
      interval: 30 * 1000,
      onDayChange: this.handleDayChange,
      onRoutineCheck: this.handleRoutineItemCheck,
    });

    // Re-evaluate the current routine every minute; the focus follows the clock.
    this.nowTimerId = setInterval(() => {
      this.now = moment();
    }, 60 * 1000);
  },
  beforeDestroy() {
    eventBus.$off(EVENTS.REFETCH_DAILY_GOALS, this.refetchGoals);
    eventBus.$off(EVENTS.GOAL_ITEM_CREATED, this.refetchGoals);
    eventBus.$off(EVENTS.TASK_CREATED, this.refetchGoals);
    eventBus.$off(EVENTS.GOALS_SAVED, this.refetchGoals);
    eventBus.$off(EVENTS.AGENT_STATUS_CHANGED, this.onAgentStatusChanged);
    eventBus.$off(EVENTS.ROUTINE_TICKED, this.refetchXpBalance);
    eventBus.$off(EVENTS.XP_REDEEMED, this.refetchXpBalance);
    this.stopIntelligentRefresh();
    if (this.nowTimerId) clearInterval(this.nowTimerId);
    if (this.flyTimer) clearTimeout(this.flyTimer);
  },
  methods: {
    // =====================================================================
    // Navigation / shell
    // =====================================================================
    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onDrawerNavigate(item) {
      this.drawerOpen = false;
      this.goTo(item.route);
    },
    /** The tablet/desktop shell's nav, More list and drawer all emit here. */
    onShellNavigate(key, item) {
      this.goTo(item && item.route);
    },
    handleDateSelected(newDate) {
      this.date = newDate;
      this.focusRoutineId = '';
      this.period = 'day';
    },
    toggleChecklist() {
      this.checklistOpen = !this.checklistOpen;
    },
    setPeriod(period) {
      this.period = period;
    },
    setFocus(routineId) {
      if (routineId) this.focusRoutineId = routineId;
    },
    focusPrev() {
      if (this.focusIndex > 0) this.focusRoutineId = this.rows[this.focusIndex - 1].id;
    },
    focusNext() {
      if (this.focusIndex < this.rows.length - 1) {
        this.focusRoutineId = this.rows[this.focusIndex + 1].id;
      }
    },
    backToNow() {
      this.focusRoutineId = this.currentRoutineId;
    },
    /**
     * "Add task" opens the AI search modal (App.vue mounts it; the event bus
     * reaches it). Goals and Year Goals add with the goal-item create sheet;
     * Home keeps the modal for its AI-enhanced task creation.
     */
    openAiSearch() {
      // Preselect the routine being VIEWED, not the one the clock says is
      // current — otherwise a task added from another routine's card is
      // silently filed under the current routine.
      eventBus.$emit(EVENTS.OPEN_AI_SEARCH, { mode: 'add', taskRef: this.resolvedFocusId || '' });
    },
    refetchGoals() {
      if (this.$apollo.queries.goals) this.$apollo.queries.goals.refetch();
    },
    refetchXpBalance() {
      if (this.$apollo.queries.xpBalance) this.$apollo.queries.xpBalance.refetch();
    },
    /**
     * Pull to refresh: re-read the day from the network — the routine, its
     * goal items, the points chip, the week strip's rings and the open chat
     * thread. `refetch()` is network-only; an optimistic tick still in flight is
     * protected by the pending-entity guard link (utils/cacheGuard.js), which
     * keeps the guarded fields over whatever this read returns.
     */
    async pullRefresh() {
      if (this.refreshing) return;
      this.refreshing = true;
      const queries = ['routineDate', 'goals', 'xpBalance', 'cascadeChildren']
        .map((name) => this.$apollo.queries[name])
        .filter((query) => query && !query.skip && typeof query.refetch === 'function');
      const reads = queries.map((query) => query.refetch());
      if (this.$refs.chat && this.$refs.chat.refetch) reads.push(this.$refs.chat.refetch());
      eventBus.$emit(EVENTS.DASHBOARD_REFRESH);
      try {
        await Promise.all(reads);
        this.loadError = false;
      } catch (error) {
        console.error('[RoutineFocus] pull-to-refresh failed:', error);
      } finally {
        this.refreshing = false;
      }
    },

    // =====================================================================
    // Checklist rows
    // =====================================================================
    /**
     * Add the display flags the checklist row needs: READY marks the goal item
     * an assigned agent works against ONCE the agent has written its
     * contribution to it — not merely because an agent is assigned or its
     * status changed — and `hasReward` means a saved end-event transcript is
     * available.
     */
    decorateItem(item) {
      const subTasks = item.subTasks || [];
      return {
        ...item,
        ready: !item.isComplete && this.isAgentTargetItem(item)
          && !!(item.contribution && String(item.contribution).trim()),
        hasReward: !!item.reward,
        subTotal: subTasks.length,
        subDone: subTasks.filter((sub) => sub && sub.isComplete).length,
      };
    },
    isAgentTargetItem(item) {
      if (!item || !item.taskRef) return false;
      const agent = this.$agent.getByTaskRef(item.taskRef);
      if (!agent) return false;
      return String(this.findFirstGoalIdForRoutine(item.taskRef)) === String(item.id);
    },
    findFirstGoalIdForRoutine(taskId) {
      if (!taskId) return null;
      const item = this.dayGoalItems.find((gi) => gi.taskRef === taskId);
      return item ? item.id : null;
    },
    /** The parent goal an item under this routine rolls up into. */
    goalRefForRoutine(taskId) {
      if (!taskId) return '';
      const sibling = this.dayGoalItems
        .find((item) => item && String(item.taskRef) === String(taskId) && item.goalRef);
      return (sibling && sibling.goalRef) || '';
    },
    openItem(item) {
      if (item && item.id) this.openGoalItemId = String(item.id);
    },
    closeGoalItem() {
      this.openGoalItemId = '';
    },
    /**
     * The status pill. It does NOT close the sheet: the pill is the item's state
     * made visible, so the useful thing is to watch it change — closing would
     * hide the only confirmation the gesture has.
     */
    toggleOpenGoalItem(item) {
      if (item) this.toggleItem(item);
    },
    markRewardSeen(item) {
      if (!item || !item.id || this.rewardSeen[item.id]) return;
      this.rewardSeen = { ...this.rewardSeen, [item.id]: true };
      try {
        localStorage.setItem(REWARD_SEEN_KEY, JSON.stringify(Object.keys(this.rewardSeen)));
      } catch (e) {
        // A full or disabled storage costs the NEW pill its memory, nothing more.
      }
    },
    /**
     * A goal-item write landed.
     *
     * Entity-level writes need nothing here — Apollo has already updated every
     * query holding the id. A refetch is only for the ops that change LIST
     * MEMBERSHIP (a delete, a move to another day, a new subtask), which is the
     * one thing an entity patch cannot express in Apollo 2.x.
     */
    onGoalItemChanged(event) {
      const op = event && event.op;
      const affectsList = ['delete', 'move-date', 'add-subtask', 'delete-subtask'];
      if (affectsList.indexOf(op) >= 0) this.refetchGoals();
    },

    // =====================================================================
    // Skip day
    // =====================================================================
    /**
     * A long press (or right-click) on today's cell. The strip swallows the click
     * that follows, so the gesture opens the sheet instead of also selecting the
     * day.
     */
    onDayLongPress(date) {
      if (date !== this.todayDate) return;
      if (this.date !== this.todayDate) this.handleDateSelected(this.todayDate);
      this.skipSheetOpen = true;
    },
    onSkipChanged({ skip, reason }) {
      if (this.$apollo.queries.routineDate) this.$apollo.queries.routineDate.refetch();
      eventBus.$emit(EVENTS.DASHBOARD_REFRESH);
      // `skipRoutine` has no `reason` argument and `Routine` has no field for one,
      // so the reason is kept where the day's other events are kept: the routine
      // thread. That is a real record, not a label dropped on the floor.
      this.postChatEvent({
        text: skip
          ? `Day skipped${reason ? ` · ${reason}` : ''}`
          : 'Skip undone — routines are back on',
        tone: skip ? 'orange' : 'green',
        icon: skip ? 'pause_circle' : 'play_circle',
        taskRef: this.resolvedFocusId,
      });
      this.$notify({
        title: skip ? 'Today skipped' : 'Skip undone',
        text: skip
          ? 'Streak safe · long-press today to undo'
          : 'Routines are back on for today',
        group: 'notify',
        type: 'success',
        duration: 3000,
      });
    },
    /**
     * Ticks are refused on a skipped day rather than silently banking points
     * against a day the user has declared off.
     */
    blockedBySkip() {
      if (!this.isSkippedDay) return false;
      this.$notify({
        title: 'Today is skipped',
        text: 'Routines are paused · long-press today in the week strip to undo',
        group: 'notify',
        type: 'info',
        duration: 3000,
      });
      return true;
    },
    openTranscript(item) {
      if (item && item.reward) {
        this.$agent.showSavedResult(item.taskRef || item.id, item.reward);
      }
    },
    openAgentResult() {
      if (this.resolvedFocusId) this.$agent.openResultModal(this.resolvedFocusId);
    },

    toggleItem(item) {
      if (!item || !item.id) return;
      const nextComplete = !item.isComplete;
      const goal = (this.goals || []).find((g) => g
        && g.period === 'day'
        && (g.goalItems || []).some((gi) => gi.id === item.id));

      // K.earned on the routine task and the week aggregate are not part of the
      // completeGoalItem response, so they are still written imperatively.
      if (item.taskRef) {
        const client = this.$apollo.provider.defaultClient;
        updateRoutineTaskKEarnedInCache(client, {
          date: this.date, taskId: item.taskRef, isComplete: nextComplete,
        });
        updateWeekStimuliKInCache(client, {
          date: this.date, taskId: item.taskRef, isComplete: nextComplete,
        });
      }

      this.$goals
        .completeGoalItem({
          id: item.id,
          period: 'day',
          date: (goal && goal.date) || this.date,
          taskRef: item.taskRef,
          isComplete: nextComplete,
          isMilestone: !!item.isMilestone,
          dayDate: this.date,
        })
        .then(() => {
          eventBus.$emit(EVENTS.ROUTINE_TICKED);
          if (nextComplete) this.onItemCompleted(item);
          if (this.$apollo.queries.goals) this.$apollo.queries.goals.refetch();
        })
        .catch(() => {
          this.notifyGeneric();
        });
    },
    /** The chat's "done with …" intent goes through the same path as a tap. */
    completeItemFromChat(item) {
      if (item && !item.isComplete) this.toggleItem(item);
    },
    onItemCompleted(item) {
      const row = this.rows.find((r) => r.id === item.taskRef);
      const left = row ? Math.max(row.totalCount - row.doneCount - 1, 0) : 0;
      this.postChatEvent({
        text: `${item.body} · ${left ? `${left} left` : 'all done'}`,
        tone: 'green',
        icon: 'task_alt',
        taskRef: item.taskRef,
      });
      if (row) {
        this.$notify({
          title: `"${item.body}" complete`,
          text: `Counts toward ${row.name} · tick the routine to earn ${row.stimulus} +${Math.round(row.points || 0)}`,
          group: 'notify',
          type: 'success',
          duration: 3000,
        });
      }
      this.$nextTick(() => this.maybeFireAgentEndEvent(item.taskRef, item.id));
    },
    onChatItemsCreated() {
      if (this.$apollo.queries.goals) this.$apollo.queries.goals.refetch();
    },

    // =====================================================================
    // Chat
    // =====================================================================
    sendChat(text) {
      if (this.$refs.chat) this.$refs.chat.send(text);
      this.chatText = '';
    },
    /**
     * Focusing the composer gives the thread the height. On the phone the card
     * and the thread share one column, so the checklist folds as well; in the
     * tablet/desktop panes they are side by side and only the "Before you
     * start" brief collapses (design handoff § "Areas and projects live in
     * chat" — `chatFocus` vs `chatFocusLg`).
     */
    onComposerFocus(collapseChecklist) {
      if (collapseChecklist) this.checklistOpen = false;
      if (this.$refs.chat) this.$refs.chat.collapseBrief();
    },
    postChatEvent(payload) {
      if (this.$refs.chat) this.$refs.chat.postEvent(payload);
    },

    // =====================================================================
    // Tick ring
    // =====================================================================
    /**
     * The ring's one entry point.
     *
     * Current + unticked → the Start Task / Start-or-Build Agent sheet (that is
     * where agents get started). Everything else ticks or redeems directly.
     */
    onRingAction() {
      const row = this.focusRow;
      if (!row) return;
      if (row.ticked) {
        this.onMiniClick();
        return;
      }
      if (this.blockedBySkip()) return;
      if (row.isCurrent || row.redeemable) {
        this.actionSheetOpen = true;
        return;
      }
      this.tickRoutine(row);
    },
    /**
     * The header mini-ring (and a ticked card ring).
     *
     * NOT an untick: `tickRoutineItem` refuses to act on an already-ticked task
     * and the XP ledger settles a day's stimuli once, so reverting a tick here
     * would credit points the server has already banked. The gesture instead
     * does the useful thing — opens the agent's result when there is one — and
     * says why otherwise.
     */
    onMiniClick() {
      if (this.agentLive) return;
      if (this.agentFinished) {
        this.openAgentResult();
        return;
      }
      this.$notify({
        title: 'Already ticked',
        text: "A tick is final for the day — today's points are banked against it.",
        group: 'notify',
        type: 'info',
        duration: 3000,
      });
    },
    onStartTask() {
      this.actionSheetOpen = false;
      if (this.focusRow) this.tickRoutine(this.focusRow, { fireAgent: false });
    },
    onStartAgent() {
      this.actionSheetOpen = false;
      const row = this.focusRow;
      if (!row) return;
      // Explicit press: failures may report loudly (agentImplicit false).
      if (!row.ticked && !row.passed && !row.wait) {
        this.tickRoutine(row, { agentImplicit: false });
        return;
      }
      if (row.redeemable) {
        this.redeemRoutine(row, { fireAgent: true, agentImplicit: false });
        return;
      }
      const goalId = this.findFirstGoalIdForRoutine(row.id);
      if (goalId && !String(goalId).startsWith('temp-')) {
        this.$agent.fireStartEventIfPresent({
          taskRef: row.id, goalId, goalDate: this.date, goalPeriod: 'day',
        });
      }
    },
    /**
     * Build / edit the focused routine's agent.
     *
     * The Agents page's own container, driven imperatively exactly as
     * `SettingsTime.manageAgent` drives it — so Home does not keep a second agent
     * form, a second save path, or a second idea of which routines are free.
     */
    onBuildAgent() {
      this.actionSheetOpen = false;
      const row = this.focusRow;
      if (!row || !this.$refs.agentForm) return;
      const existing = this.$agent && this.$agent.getByTaskRef(String(row.id));
      if (existing) this.$refs.agentForm.openEdit(existing);
      else this.$refs.agentForm.openNew(String(row.id));
    },
    onAgentSaved() {
      this.$agent.fetchAll();
    },

    /**
     * Tick a routine. Ported wholesale from the legacy dashboard's checkClick —
     * the pending-entity guard, the `did` wait and the optimistic response's
     * exact __typenames are each there for a reported bug (see the comments).
     */
    async tickRoutine(task, { fireAgent = true, agentImplicit = true } = {}) {
      if (!task) return;
      if (this.blockedBySkip()) return;
      this.trackTaskEvent('complete', {
        id: task.id, name: task.name, time: task.time, points: task.points, ticked: true,
      });

      if (task.redeemable) {
        this.redeemRoutine(task, { fireAgent, agentImplicit });
        return;
      }
      if (task.passed || task.wait || task.ticked) return;

      const pendingKey = `routine:${task.id}`;
      // Per-item coalescing — the tick is monotonic, so a second tap has
      // nothing to correct.
      if (pendingMutations.has(pendingKey)) return;
      pendingMutations.add(pendingKey);

      this.measureFly(task);
      const tickedAt = Date.now();

      // Claim the tick locally the instant it is tapped: from here until the
      // server confirms, no query response may write `ticked` on this task —
      // including reads already on the wire.
      guardFields('RoutineItem', task.id, { ticked: true });

      let did = '';
      try {
        did = await this.ensureRoutineId();
      } catch (e) {
        did = '';
      }
      if (!did) {
        releaseEntity('RoutineItem', task.id);
        pendingMutations.remove(pendingKey);
        this.clearFly();
        this.$notify({
          title: 'Error',
          text: "Couldn't load today's routine. Check your connection and try again.",
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
        return;
      }

      await this.$apollo
        .mutate({
          mutation: gql`
            mutation tickRoutineItem($id: ID!, $taskId: String!, $ticked: Boolean!) {
              tickRoutineItem(id: $id, taskId: $taskId, ticked: $ticked) {
                id
                tasklist {
                  id
                  name
                  ticked
                  points
                  startEvent
                  endEvent
                  stimuli { name splitRate earned }
                }
              }
            }
          `,
          variables: { id: did, taskId: task.id, ticked: true },
          // __typename MUST match the cache's real types (RoutineItem /
          // StimuliItem). Writing the wrong one mints phantom entities that
          // Apollo later GCs, reverting a green tick to white.
          optimisticResponse: {
            __typename: 'Mutation',
            tickRoutineItem: {
              __typename: 'Routine',
              id: did,
              tasklist: this.tasklist.map((t) => {
                if (t.id !== task.id) return { ...t, __typename: 'RoutineItem' };
                const stimuli = (t.stimuli || []).map((s) => {
                  if (s.name !== 'D') return { ...s, __typename: 'StimuliItem' };
                  return { ...s, __typename: 'StimuliItem', earned: t.points || s.earned };
                });
                return {
                  ...t, __typename: 'RoutineItem', ticked: true, stimuli,
                };
              }),
            },
          },
          update: (cache, { data: payload }) => {
            const result = payload && payload.tickRoutineItem;
            if (!result) return;
            try {
              cache.writeQuery({
                query: ROUTINE_DATE_QUERY,
                variables: { date: this.date },
                data: { routineDate: result },
              });
            } catch (e) {
              // Never lose the tick: write the flag straight onto the
              // normalized entity rather than re-reading the whole query.
              try {
                cache.writeFragment({
                  id: `RoutineItem:${task.id}`,
                  fragment: gql`fragment TickedFlag on RoutineItem { ticked }`,
                  data: { __typename: 'RoutineItem', ticked: true },
                });
              } catch (e2) {
                updateRoutineTaskInCache(cache, {
                  date: this.date, taskId: task.id, ticked: true,
                });
              }
            }
          },
        })
        .then(() => {
          this.trackMutationPerformance('tickRoutineItem', {
            id: did, taskId: task.id, ticked: true,
          }, tickedAt);
          eventBus.$emit(EVENTS.ROUTINE_TICKED);
          this.onRoutineTicked(task, { fireAgent, agentImplicit });
        })
        .catch(() => {
          // Apollo rolls the optimistic write back; drop the guard too, or it
          // would keep pinning a tick that was never saved.
          releaseEntity('RoutineItem', task.id);
          this.clearFly();
          this.notifyGeneric();
        })
        .finally(() => {
          pendingMutations.remove(pendingKey);
        });
    },

    onRoutineTicked(task, { fireAgent, agentImplicit }) {
      const row = this.rows.find((r) => r.id === task.id) || task;
      const stimulus = row.stimulus || 'D';
      const points = Math.round(row.points || 0);

      this.postChatEvent({
        text: `Routine ticked · ${stimulus} +${points}`,
        tone: 'green',
        icon: 'check_circle',
        taskRef: task.id,
      });
      this.$notify({
        title: `${row.name} done · ${stimulus} +${points}`,
        text: `${row.stimulusLabel || 'Discipline'} moved to ${Math.round(this.stimulusTotals[stimulus] || 0)}%`,
        group: 'notify',
        type: 'success',
        duration: 3000,
      });

      if (fireAgent) {
        this.fireAgentWhenReady(task.id, { implicit: agentImplicit });
        if (this.$agent.getByTaskRef(task.id)) {
          this.postChatEvent({
            text: 'Agent started',
            tone: 'blue',
            icon: 'smart_toy',
            taskRef: task.id,
          });
        }
      }
    },

    /** Spend points to rescue a passed routine. Ported from redeemClick. */
    redeemRoutine(task, { fireAgent = true, agentImplicit = true } = {}) {
      this.actionSheetOpen = false;
      const cost = this.getRedeemCost(task);
      const balance = this.xpBalance;
      const entitled = !!(balance && balance.entitled);

      this.trackButtonClick('task_redeem_button', {
        task_id: task.id, task_name: task.name, cost, available: (balance && balance.available) || 0,
      });

      // Local affordability check — the server re-validates authoritatively.
      if (balance && !entitled && balance.available < cost) {
        this.paywallCost = cost;
        this.paywallDrawerOpen = true;
        return;
      }

      const pendingKey = `redeem:${task.id}`;
      if (pendingMutations.has(pendingKey)) return;
      pendingMutations.add(pendingKey);

      const redeemedAt = Date.now();
      this.measureFly(task);
      // Optimistic response only when both routine and balance are cached —
      // the shape must match the mutation's selection set field-for-field.
      const canOptimize = !!(this.routineDate && balance);
      const optimisticResponse = canOptimize ? {
        __typename: 'Mutation',
        redeemRoutineItem: {
          __typename: 'RedeemResult',
          routine: {
            ...this.routineDate,
            tasklist: this.tasklist.map((t) => {
              if (t.id !== task.id) return { ...t };
              const stimuli = (t.stimuli || []).map((s) => (s.name !== 'D'
                ? { ...s }
                : { ...s, earned: t.points || s.earned }));
              return {
                ...t, ticked: true, redeemed: true, stimuli,
              };
            }),
          },
          balance: {
            ...balance,
            used: balance.used + (entitled ? 0 : cost),
            available: balance.available - (entitled ? 0 : cost),
          },
        },
      } : undefined;

      this.$apollo
        .mutate({
          mutation: REDEEM_ROUTINE_ITEM_MUTATION,
          variables: { id: this.did, taskId: task.id, date: this.date },
          optimisticResponse,
          update: (cache, { data: payload }) => {
            const result = payload && payload.redeemRoutineItem;
            if (!result) return;
            if (result.routine) {
              try {
                cache.writeQuery({
                  query: ROUTINE_DATE_QUERY,
                  variables: { date: this.date },
                  data: { routineDate: result.routine },
                });
              } catch (e) {
                // Never lose the redeemed tick.
                try {
                  cache.writeFragment({
                    id: `RoutineItem:${task.id}`,
                    fragment: gql`fragment RedeemedFlags on RoutineItem { ticked redeemed }`,
                    data: { __typename: 'RoutineItem', ticked: true, redeemed: true },
                  });
                } catch (e2) {
                  updateRoutineTaskInCache(cache, {
                    date: this.date, taskId: task.id, ticked: true,
                  });
                }
              }
            }
            if (result.balance) {
              cache.writeQuery({ query: XP_BALANCE_QUERY, data: { xpBalance: result.balance } });
            }
          },
        })
        .then(({ data: payload }) => {
          this.trackMutationPerformance('redeemRoutineItem', {
            id: this.did, taskId: task.id,
          }, redeemedAt);
          eventBus.$emit(EVENTS.ROUTINE_TICKED);
          eventBus.$emit(EVENTS.XP_REDEEMED);

          this.postChatEvent({
            text: `Redeemed with ${cost} points · ticked`,
            tone: 'blue',
            icon: 'diamond',
            taskRef: task.id,
          });

          if (fireAgent) this.fireAgentWhenReady(task.id, { implicit: agentImplicit });

          const newBalance = payload
            && payload.redeemRoutineItem
            && payload.redeemRoutineItem.balance;
          const receipt = describeRedeemReceipt(cost, newBalance, {
            startingAgent: fireAgent && !agentImplicit,
          });
          if (receipt) {
            this.$notify({
              title: receipt.title,
              text: receipt.text,
              group: 'notify',
              type: 'info',
              duration: 5000,
            });
          }
        })
        .catch((error) => {
          this.clearFly();
          const message = (error && error.message) || '';
          if (message.includes('402')) {
            this.paywallCost = cost;
            this.paywallDrawerOpen = true;
            return;
          }
          const { title, text } = describeRedeemFailure(message, {
            startingAgent: fireAgent && !agentImplicit,
          });
          this.$notify({
            title, text, group: 'notify', type: 'error', duration: 4000,
          });
        })
        .finally(() => {
          pendingMutations.remove(pendingKey);
        });
    },

    /**
     * Resolve `did` (the routine document id), waiting for it when the query is
     * still in flight. A mid-session midnight rollover briefly leaves it
     * holding YESTERDAY's id, and ticking with the wrong one lands on the wrong
     * day's document — the "new day: tick goes green but is not saved" report.
     */
    async ensureRoutineId() {
      if (this.did) return this.did;
      if (this.routineDate && this.routineDate.id) {
        this.did = this.routineDate.id;
        return this.did;
      }
      await this.addNewDayRoutine();
      if (this.did) return this.did;
      return new Promise((resolve) => {
        const deadline = Date.now() + 8000;
        const poll = () => {
          if (this.did) { resolve(this.did); return; }
          if (this.routineDate && this.routineDate.id) {
            this.did = this.routineDate.id;
            resolve(this.did);
            return;
          }
          if (Date.now() > deadline) { resolve(''); return; }
          setTimeout(poll, 150);
        };
        poll();
      });
    },

    /**
     * Create the viewed day's routine document.
     *
     * Goes through `$routine.addRoutine` (the same path the legacy dashboard
     * uses) rather than an inline mutation: TWO routine-creation paths racing on
     * a new day is what produced duplicate documents, where a tick written to
     * one silently vanished. The per-date in-flight guard is the second half of
     * that fix — one create per date, however many callers ask.
     */
    addNewDayRoutine() {
      const { date } = this;
      if (!this.pendingRoutineCreates) this.pendingRoutineCreates = {};
      if (this.pendingRoutineCreates[date]) return this.pendingRoutineCreates[date];

      this.preparingRoutine = true;
      const inFlight = this.$routine
        .addRoutine(date)
        // Refetch through THIS page's routine query, which selects the full task
        // shape (stimuli, redeemed, passedPoints). The store's lighter query
        // omits stimuli, and because routine tasks reuse the same _id across
        // days Apollo normalises them to one entity per task — so yesterday's
        // stimulus values would linger on the new day.
        .then(() => {
          const query = this.$apollo.queries.routineDate;
          return query && typeof query.refetch === 'function' ? query.refetch() : null;
        })
        .catch((error) => {
          console.error('[RoutineFocus] addRoutine failed:', error);
        })
        .finally(() => {
          this.preparingRoutine = false;
          // Release the guard so a genuine later need can create it again.
          delete this.pendingRoutineCreates[date];
        });

      this.pendingRoutineCreates[date] = inFlight;
      return inFlight;
    },

    // =====================================================================
    // Agents
    // =====================================================================
    effectiveAgentStatus(taskRef) {
      // Badges are only about TODAY's trigger: another day's view shows every
      // agent idle (routine tasks share their _id across days, so a taskRef-keyed
      // badge would otherwise paint today's run onto yesterday's card), and a
      // badge set on a previous day never survives into a new one.
      if (!taskRef || !this.isToday) return '';
      const day = this.$agent.statusDay;
      if (day && day !== this.todayDate) return '';
      const status = this.$agent.statusByRoutineId[taskRef] || '';
      // A 'listening' agent whose end event already saved a transcript is done;
      // never leave the badge stuck when a late start dispatch resolves after.
      if (status === 'listening' && this.taskAgentEndEventDone(taskRef)) return 'finished';
      return status;
    },
    taskAgentEndEventDone(taskRef) {
      if (!taskRef) return false;
      return this.dayGoalItems.some((item) => item.taskRef === taskRef && item.reward);
    },
    fireAgentWhenReady(taskRef, { implicit = true } = {}) {
      return startAgentWhenReady({
        taskRef,
        implicit,
        agent: this.$agent.getByTaskRef(taskRef),
        readGoalId: () => this.findFirstGoalIdForRoutine(taskRef),
        isSettled: () => pendingMutations.empty(),
        setStatus: (ref, status) => this.$agent.setLocalStatus(ref, status),
        clearStatus: (ref) => this.$agent.clearLocalStatus(ref),
        fire: ({ goalId }) => this.$agent.fireStartEventIfPresent({
          taskRef, goalId, goalDate: this.date, goalPeriod: 'day', implicit,
        }).catch(() => {}),
        notify: ({ title, text }) => this.$notify({
          title, text, group: 'notify', type: 'warning', duration: 4000,
        }),
      });
    },
    /**
     * End-event rule: a listening agent completes when the routine task's
     * SLOT counter is full — the stimulus-derived numbers, not the checklist
     * length (D-20). The checklist is what the user sees; the slots are what
     * the economy counts.
     */
    maybeFireAgentEndEvent(taskRef, goalId) {
      const task = this.tasklist.find((t) => t.id === taskRef);
      if (!task) return;
      const total = this.countTaskTotal(task);
      const completed = this.countTaskCompleted(task);
      if (total <= 0 || completed < total) return;

      const gid = goalId || this.findFirstGoalIdForRoutine(taskRef);
      this.$set(this.endEventFiring, taskRef, true);
      this.postChatEvent({
        text: 'All tasks complete — end event firing',
        tone: 'blue',
        icon: 'bolt',
        taskRef,
      });
      this.$agent
        .fireEndEvent({ taskRef, goalId: gid })
        .catch(() => {})
        .then(() => {
          this.$delete(this.endEventFiring, taskRef);
        });
    },

    // =====================================================================
    // Stimulus arithmetic (the D/K/G rings and the slot counters)
    // =====================================================================
    /**
     * Day total for one stimulus. G is scaled by how far into the week/month/
     * year the day sits — the same multipliers the legacy dashboard used, and
     * the ones the XP ledger caps at 100 after scaling.
     */
    countTotal(stimulus = 'D') {
      const earned = this.tasklist.reduce((total, task) => {
        const current = (task.stimuli || []).find((st) => st.name === stimulus);
        return current && current.earned ? total + current.earned : total;
      }, 0);
      if (stimulus !== 'G') return earned;

      const day = moment(this.date, 'DD-MM-YYYY');
      if (day.weekday() < threshold.weekDays - 1) return earned * 4;
      if (this.weekOfMonth(day) < threshold.monthWeeks - 1) return earned * 2;
      if (day.month() < threshold.yearMonths - 1) return Number((earned * 1.334).toFixed(1));
      return earned;
    },
    weekOfMonth(day) {
      const addFirstWeek = day.clone().startOf('month').weekday() < 2 ? 1 : 0;
      return day.week() - day.clone().startOf('month').week() + addFirstWeek;
    },
    countTaskTotal(task) {
      const d = (task.stimuli || []).find((st) => st.name === 'D');
      const k = (task.stimuli || []).find((st) => st.name === 'K');
      if (!d || !k || !k.splitRate) return 0;
      return Number((d.splitRate / k.splitRate).toFixed(0));
    },
    countTaskCompleted(task) {
      const total = this.countTaskTotal(task);
      const k = (task.stimuli || []).find((st) => st.name === 'K');
      if (!total || !k || !task.points) return 0;
      const completed = Number((total * (Number(k.earned) / Number(task.points))).toFixed(0));
      return Number.isNaN(completed) ? 0 : completed;
    },
    getRedeemCost(task) {
      if (!task) return 0;
      return typeof task.passedPoints === 'number' ? task.passedPoints : (task.points || 0);
    },
    /** What pressing Start on this routine will actually cost. */
    redeemCostForTask(task) {
      if (!task || !task.redeemable) return 0;
      if (this.xpBalance && this.xpBalance.entitled) return 0;
      return this.getRedeemCost(task);
    },

    // =====================================================================
    // Tick flight (phone only)
    // =====================================================================
    /**
     * Measure the ring's current rect and the header target, so the ghost can
     * be animated between them. Returns null on tablet/desktop (which shrink
     * the ring in place instead) or when either element is missing.
     */
    measureFly(task) {
      if (this.shell !== 'phone') return null;
      if (!task || task.id !== this.resolvedFocusId) return null;
      const { card, topbar } = this.$refs;
      if (!card || !topbar) return null;

      const ring = card.ringRect();
      const target = topbar.ringTargetRect();
      if (!ring || !ring.width || !target || !target.width) return null;

      // The ghost is positioned against this page's own box.
      const base = this.$el.getBoundingClientRect();
      const inset = 10; // the tick button's inset inside the 120px ring
      const size = ring.width - inset * 2;
      const left = ring.left - base.left + inset;
      const top = ring.top - base.top + inset;
      const targetCx = target.left - base.left + target.width / 2;
      const targetCy = target.top - base.top + target.height / 2;

      const flight = {
        id: Date.now(),
        left,
        top,
        size,
        dx: targetCx - (left + size / 2),
        dy: targetCy - (top + size / 2),
        scale: target.width / size,
        name: '',
        tLeft: 0,
        tTop: 0,
        tDx: 0,
        tDy: 0,
      };

      const titleRect = card.titleRect();
      const nameRect = topbar.nameTargetRect();
      if (titleRect && nameRect) {
        flight.name = task.name;
        flight.tLeft = titleRect.left - base.left;
        flight.tTop = titleRect.top - base.top;
        flight.tDx = (nameRect.left - base.left) - flight.tLeft;
        flight.tDy = (nameRect.top - base.top) - flight.tTop;
      }

      this.fly = flight;
      if (this.flyTimer) clearTimeout(this.flyTimer);
      this.flyTimer = setTimeout(() => {
        if (this.fly && this.fly.id === flight.id) this.fly = null;
        this.flyTimer = null;
      }, FLY_MS);
      return flight;
    },
    clearFly() {
      if (this.flyTimer) clearTimeout(this.flyTimer);
      this.flyTimer = null;
      this.fly = null;
    },

    // =====================================================================
    // Deep links (/home/:routineId/:action from a push notification)
    // =====================================================================
    maybeDispatchRouteAction() {
      const { routineId, action } = this.$route.params || {};
      if (!routineId || !action) return;
      if (!this.rows.length) return;

      const dispatchKey = `${routineId}:${action}`;
      if (this.dispatchedRouteAction === dispatchKey) return;
      this.dispatchedRouteAction = dispatchKey;

      const row = this.rows.find((r) => r.id === routineId);
      if (!row) {
        this.$notify({
          title: 'Routine not found',
          text: "That routine isn't on today's list.",
          group: 'notify',
          type: 'warning',
          duration: 3000,
        });
        this.$router.replace('/home').catch(() => {});
        return;
      }

      this.focusRoutineId = row.id;
      if (action === 'complete') {
        if (!row.ticked) this.tickRoutine(row);
        return;
      }
      if (!row.isCurrent) {
        this.$notify({
          title: 'Not your current task',
          text: 'Start/Build are only available for the active routine.',
          group: 'notify',
          type: 'info',
          duration: 3000,
        });
        return;
      }
      if (action === 'start') this.onStartAgent();
      if (action === 'build') this.onBuildAgent();
    },

    // =====================================================================
    // Day rollover
    // =====================================================================
    async handleDayChange(newDate) {
      this.todayDate = newDate;
      this.date = newDate;
      this.focusRoutineId = '';
      this.period = 'day';
      // Yesterday's agent badges must not carry into the new day.
      this.$agent.clearDayStatuses();
      try {
        const result = await runNewDayReset(newDate);
        if (result && result.errors && result.errors.length) {
          console.warn('[RoutineFocus] new day reset had partial failures:', result.errors);
        }
      } catch (e) {
        console.warn('[RoutineFocus] new day reset failed:', e);
      }
      // The cache is empty and `did` referred to yesterday's document.
      this.did = '';
      this.routineFirstLoad = true;
      this.goalsFirstLoad = true;
      this.addNewDayRoutine();
    },
    handleRoutineItemCheck() {
      if (this.canMaintainPassWait) this.setPassedWait();
      // An agent that is live today writes its contribution on its own clock,
      // not on any event this page hears — keep the list fresh while one runs.
      if (this.anyAgentLiveToday) this.refetchGoals();
    },
    /**
     * Re-read the day's goal items whenever an agent badge changes, so the
     * checklist shows what the agent wrote (READY, transcript) without a pull to
     * refresh. 'running' is skipped: nothing has been written yet.
     */
    onAgentStatusChanged(payload) {
      const status = payload && payload.status;
      if (!this.isToday || status === 'running' || status === 'waiting') return;
      this.refetchGoals();
    },

    notifyGeneric() {
      this.$notify({
        title: 'Error',
        text: 'An unexpected error occured',
        group: 'notify',
        type: 'error',
        duration: 3000,
      });
    },
  },
};
</script>

<style>
/* Root-class prefixed: this page is a full app shell rendered OUTSIDE
   MobileLayout/DesktopLayout, and none of it may reach the legacy screens. */
.rn-home {
  /* Mirrors AppShell: the iPhone PWA home-indicator inset, zeroed inside the
     native shell (Capacitor already insets the web view). */
  --rn-safe-bottom: env(safe-area-inset-bottom, 0px);
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f4f4f4;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.capacitor-native .rn-home {
  --rn-safe-bottom: 0px;
}

.rn-home--phone {
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  /* The page's own pull-to-refresh replaces the browser's; don't run both. */
  overscroll-behavior-y: contain;
}

.rn-home--tablet,
.rn-home--desktop {
  display: flex;
}

/* Inbox button in the tablet / desktop header. The phone's lives in
   RoutineTopBar, where the design puts it at the leading edge. */
.rn-home__inbox {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
  color: rgba(0, 0, 0, .65);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-right: 10px;
}

.rn-home__inbox-badge {
  position: absolute;
  top: -3px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 8px;
  background: #FF9800;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px #f4f4f4;
}

/* ---- phone ---- */
.rn-home__week {
  flex-shrink: 0;
  overflow: hidden;
}

.rn-home__phone-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 16px calc(64px + var(--rn-safe-bottom));
  overflow: hidden;
}

.rn-home__nav {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  /* Grow by the inset rather than eat into the 64px — padding inside a fixed
     64px box squeezed the icons on iPhone PWAs. */
  height: calc(64px + var(--rn-safe-bottom));
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, .08);
  display: flex;
  padding-bottom: calc(4px + var(--rn-safe-bottom));
  z-index: 5;
}

.rn-home__nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.rn-home__nav-icon {
  font-size: 24px;
}

/* ---- tablet / desktop ---- */
/* The rail/sidebar is AppShell's (77px rail, 264px sidebar); Home supplies only
   the main column, so the shell just has to fill the row .rn-home lays out. */
.rn-home__shell {
  flex: 1;
  min-width: 0;
}

/* The shell's sidebar slot insets its content 12px, but RoutineRail already
   insets its own rows (6px margin + 12px padding) — cancel the slot's so the
   rail sits where it did when Home drew its own sidebar. */
.rn-home__rail {
  flex: 1;
  min-height: 0;
  margin: 0 -12px;
}

.rn-home__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* The handoff caps Home's desktop content column at 980px and centres it beside
   the 264px sidebar. Without this the checklist and chat panes stretch across the
   whole 1440px viewport, which makes every measurement inside them read wider
   than the design — the "desktop container size" defect. Tablet is unaffected:
   its 1133px viewport minus the 76px rail already sits under the cap. */
.rn-home--desktop .rn-home__main {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
}

.rn-home__header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 28px 12px;
  flex-shrink: 0;
}

/* 25px on top centres the date on the rail's logo (centred 41px down), the line
   every other tablet page's title sits on too (AppShell's no-status head). */
.rn-home--tablet .rn-home__header {
  padding: 25px 20px 8px;
}

.rn-home__header-text {
  flex: 1;
  min-width: 0;
}

/* 20px on both large shells. chassis.md's "desktop titles run 26px" is a
   generalisation; Home's own frames (6a and 6b) both draw the date at 20/700,
   and the .dc.html is the source of truth. Desktop was the outlier at 26px. */
.rn-home__date {
  font-size: 20px;
  font-weight: 700;
}

.rn-home__header-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
}

/* No width: the strip is seven fixed 38px cells, so it sizes itself. Pinning it
   at 360px (280 on tablet) stretched every cell to 50px. */
.rn-home__header-week {
  flex-shrink: 0;
}

.rn-home__content {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  padding: 4px 28px 28px;
}

.rn-home--tablet .rn-home__content {
  padding: 0 20px 20px;
}

/*
  A true 3:2 that scales, both shells. The chat pane used to be 420px fixed
  (400 on tablet) against a checklist with a 1.15 grow factor, which read as
  1.15:1 at the 980px column and drifted with every viewport: the pane kept its
  420px while the checklist absorbed the whole difference. The design gives both
  panes a flex basis of 0 so the ratio is the only thing deciding the split —
  547.2/364.8 at desktop's 980px column, 602.4/401.6 at the iPad's uncapped 1133.

  Which only works while the card is padding-FREE. A `box-sizing: border-box`
  flex item cannot resolve `flex-basis: 0` below its own padding, so the card's
  `16px 20px 0` floored its base size at 40px: it took 40 off the top and the
  ratio then applied to the remaining 872, giving 563.2/348.8. `RoutineFocusCard`
  now keeps only vertical padding and hands the horizontal inset to an inner
  `.rn-focus-card__body` — the same nesting the design frames use.
*/
.rn-home__content > .rn-focus-card {
  flex: 3 1 0;
  min-width: 0;
}

.rn-home__chat-pane {
  flex: 2 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
}

/*
  One elevation for both panes. The phone's card shadow is deliberately heavier
  (a 15px blur) because the card floats over a deck; side by side in a pane the
  design flattens it, and the chat pane was carrying a third variant of its own
  (alpha .1/.06). The phone card is NOT inside .rn-home__content, so it keeps
  the deck shadow.

  TODO this belongs on .rn-focus-card--tablet/--desktop in RoutineFocusCard.vue
  (that organism owns the card's own chrome); it is an override here only
  because this pass does not own that file.
*/
.rn-home__content > .rn-focus-card,
.rn-home__chat-pane {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-home__chat-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  flex-shrink: 0;
}

.rn-home__chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rn-home__chat-head-text {
  min-width: 0;
}

.rn-home__chat-name {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-home__chat-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-home__chat-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px;
}

/* ---- empty / error ---- */
.rn-home__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  background: #fff;
  border-radius: 16px;
  text-align: center;
  font-size: 14px;
  color: rgba(0, 0, 0, .54);
}

.rn-home__empty--pane {
  flex: 1;
  border-radius: 20px;
}

.rn-home__empty-btn {
  border: 1px solid rgba(40, 139, 213, .45);
  background: #fff;
  color: #1f6fab;
  border-radius: 999px;
  height: 36px;
  padding: 0 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* ---- sheet body ---- */
.rn-home__sheet-note {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin: 0 0 12px;
}

/* ---- goal sheet ---- */
.rn-home__goal-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin-bottom: 8px;
}

.rn-home__goal-status {
  font-weight: 700;
}

.rn-home__goal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.rn-home__goal-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f0f0f0;
  color: rgba(0, 0, 0, .6);
}

.rn-home__goal-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  margin: 8px 0 4px;
}

.rn-home__goal-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  font-size: 14px;
}

.rn-home__goal-sub-box {
  font-size: 20px;
}

.rn-home__goal-btn {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  border: 0;
  border-radius: 999px;
  background: #288bd5;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* ---- tick flight ---- */
.rn-home__fly-ring {
  position: absolute;
  z-index: 40;
  border-radius: 50%;
  background: #4CAF50;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(76, 175, 80, .45);
  pointer-events: none;
  transform-origin: center;
  animation: rn-fly .8s cubic-bezier(.5, 0, .3, 1) forwards;
}

.rn-home__fly-glyph {
  font-size: 34px;
}

.rn-home__fly-title {
  position: absolute;
  z-index: 41;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  color: rgba(0, 0, 0, .87);
  transform-origin: left top;
  animation: rn-fly .8s cubic-bezier(.5, 0, .3, 1) forwards;
}
</style>
