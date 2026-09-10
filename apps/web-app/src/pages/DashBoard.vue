<template>
  <div>
      <container-box transparent="true" >
      <atom-card
        v-if="isPreparingNewDay"
        class="mb-3 mx-3 mt-3 pa-3 new-day-card"
        data-testid="preparing-new-day"
      >
        <div class="d-flex align-center mb-2">
          <atom-icon class="mr-2" color="primary" small>wb_sunny</atom-icon>
          <span class="new-day-label">Preparing new day — starting with a fresh cache.</span>
        </div>
        <atom-progress-linear indeterminate color="primary" height="6" class="ma-0" />
      </atom-card>
      <atom-card v-if="isDashboardCaching" class="mb-3 mx-3 mt-3 pa-3 dashboard-caching-card">
        <div class="d-flex align-center mb-2">
          <atom-icon class="mr-2" color="warning" small>cached</atom-icon>
          <span class="caching-label">Building Projects and Areas context. <strong>{{ currentCachingTag }}</strong></span>
        </div>
        <atom-progress-linear
          :value="dashboardCachingProgress"
          color="warning"
          height="6"
          class="ma-0 caching-progress"
        />
        <div class="caching-counter mt-1 text-right caption grey--text">
          {{ dashboardCachingCompleted }}/{{ dashboardCachingTotal }}
        </div>
      </atom-card>
      <weekday-selector-container
        :selectedDate="date"
        :class="$vuetify.breakpoint.xsOnly ? 'mr-3 mb-1 ml-3' : 'mr-3 mb-3 ml-3'"
        @date-selected="handleDateSelected"
      />
    <div v-if="isTodaySelected">
      <div class="d-flex pr-3 pl-3 pb-1 pt-2 title-options">
        <h2>
          {{ this.today }}
        </h2>
        <div class="action-box">
          <div><wake-check></wake-check></div>
          <div class="d-flex align-center">
            <atom-switch v-model="skipDay" label="Skip Day" @change="skipClick($event)" hide-details class="mt-0 pt-0"></atom-switch>
            <atom-button icon small @click="refreshData" :loading="isRefreshing" class="ml-2">
              <atom-icon color="rgba(0,0,0,0.57)" size="24">refresh</atom-icon>
            </atom-button>
          </div>
        </div>
      </div>
      <template v-if="skipDay">
        <div class="skip-box">
          <div class="skip-grid">
            <div class="skip-grid-image">
              <img src="/img/relax.jpg" />
            </div>
            <div class="skip-grid-text">
              <p class="skip-message">
                Today's point wont be counted but still finish today's task to complete your milestones
              </p>
            </div>
          </div>
          <div class="skip-agenda">
            <agenda-task-list
              :groups="todayGoalItemsGrouped"
              :loading="showGoalsSkeleton"
              @complete-goal-item="completeGoalItem"
              @edit-goal-item="(item) => toggleGoalDisplayDialog(item, true)"
              @delete-goal-item="deleteTaskGoal"
            />
          </div>
        </div>
      </template>
      <template v-else>
        <atom-layout wrap>
          <atom-flex xs12 sm10 d-flex class="pl-3 pr-3">
            <div style="width:100%">
              <current-task-card
                :task="currentTask"
                :goals="displayGoals"
                :all-goals="goals"
                :goal-period.sync="currentGoalPeriod"
                :percentage="countTaskPercentage(currentTask)"
                :completed-count="countTaskCompleted(currentTask)"
                :total-count="countTaskTotal(currentTask)"
                :time-label="displayTime(currentTask && currentTask.time)"
                :button-icon="getButtonIcon(currentTask)"
                :button-color="getCurrentButtonColor(currentTask)"
                :button-disabled="getButtonDisabled(currentTask)"
                :agent-status="currentAgentStatus"
                :show-goals-skeleton="showGoalsSkeleton"
                :show-routine-skeleton="showRoutineSkeleton"
                :loading="showGoalsSkeleton"
                :last-complete-item-goal-ref="lastCompleteItemGoalRef"
                @click="updateSelectedTaskRef($event.id)"
                @action-click="checkDialogClick($event.event, $event.task)"
                @toggle-step-modal="openStepModal(currentTask)"
                @set-goal-period="onSetGoalPeriod"
                @delete-task-goal="deleteTaskGoal"
                @refresh-task-goal="refreshTaskGoal"
                @toggle-goal-display-dialog="toggleGoalDisplayDialog"
                @complete-goal-item="completeGoalItem"
                @complete-sub-task="completeSubTask"
                @open-transcript="openTranscript"
              />
            </div>
          </atom-flex>
          <atom-flex hidden-xs sm2 d-flex class="pl-2 pr-3 hidden-xs">
            <div style="display: flex; flex-direction: column; justify-content: space-between;">
              <atom-card class="mb-3 pb-3">
                <div class="text-xs-center">
                  <atom-progress-circular
                    :value="totalD"
                    :size="50"
                    :rotate="-90"
                    class="mt-3"
                    width="6"
                    color="#4caf50"
                    >D</atom-progress-circular
                  >
                </div>
              </atom-card>
              <atom-card class="mb-3 pb-3">
                <div class="text-xs-center">
                  <atom-progress-circular
                    :value="totalK"
                    :size="50"
                    :rotate="-90"
                    class="mt-3"
                    width="6"
                    color="#E53935"
                    >K</atom-progress-circular
                  >
                </div>
              </atom-card>
              <atom-card class="mb-3 pb-3">
                <div class="text-xs-center">
                  <atom-progress-circular
                    :value="totalG"
                    :size="50"
                    :rotate="-90"
                    class="mt-3"
                    width="6"
                    color="#2196F3"
                    >G</atom-progress-circular
                  >
                </div>
              </atom-card>
            </div>
          </atom-flex>
          <!-- <atom-flex xs6 d-flex>goal time left </atom-flex> -->
          <!-- <atom-flex xs6 d-flex>Routine time left</atom-flex> -->
          <atom-flex
            xs12
            class="pr-3 pl-3 mb-3"
            d-flex
            v-if="!!countTaskTotal(currentTask) &&
                  currentGoalPeriod === 'day' &&
                  weekGoalsForCurrentTask.length > 0"
          >
            <week-goal-streak :week-goals="weekGoalsForCurrentTask" />
          </atom-flex>
          <atom-flex xs12 class="pl-3 pr-3 pb-3" d-flex>
            <upcoming-past-tasks
              :upcoming-tasks="upcomingTasksMeta"
              :past-tasks="pastTasksMeta"
              :tabs.sync="tabs"
              :selected-task-ref="selectedTaskRef"
              :goal-period.sync="currentGoalPeriod"
              :goals="displayGoals"
              :all-goals="goals"
              :show-goals-skeleton="showGoalsSkeleton"
              :last-complete-item-goal-ref="lastCompleteItemGoalRef"
              @task-click="updateSelectedTaskRef($event.id)"
              @action-click="checkDialogClick($event.event, $event.task)"
              @toggle-step-modal="openStepModal($event)"
              @set-goal-period="onSetGoalPeriod($event.period)"
              @delete-task-goal="deleteTaskGoal"
              @refresh-task-goal="refreshTaskGoal"
              @toggle-goal-display-dialog="toggleGoalDisplayDialog"
              @complete-goal-item="completeGoalItem"
              @complete-sub-task="completeSubTask"
              @open-transcript="openTranscript"
            />
          </atom-flex>
        </atom-layout>
      </template>
    </div>
    <div class="non-current-day" v-else>
      <div class="d-flex pr-3 pl-3 pb-1 pt-2 title-options">
        <h2>{{ today }}</h2>
        <div class="action-box">
          <atom-button icon small @click="refreshData" :loading="isRefreshing">
            <atom-icon color="rgba(0,0,0,0.57)" size="24">refresh</atom-icon>
          </atom-button>
        </div>
      </div>
      <div class="pa-3 pt-0">
        <agenda-task-list
          :groups="nonTodayGoalItems"
          :loading="showAgendaSkeleton"
          :hide-checkbox="isFutureDateSelected"
          @complete-goal-item="completeAgendaGoalItem"
          @edit-goal-item="(item) => toggleGoalDisplayDialog(item, true)"
          @delete-goal-item="deleteAgendaGoalFromList"
        />
      </div>
    </div>
    <atom-dialog
      v-model="goalDetailsDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <atom-card>
        <atom-toolbar dark color="primary">
          <atom-button icon dark @click="goalDetailsDialog = false">
            <atom-icon>close</atom-icon>
          </atom-button>
          <atom-toolbar-title>Add Goal</atom-toolbar-title>
          <atom-spacer></atom-spacer>
        </atom-toolbar>
        <goal-list
          :goals="isTodaySelected ? goals : agendaGoals"
          :date="date"
          :period="currentGoalPeriod"
          :selectedBody="selectedBody"
          :tasklist="displayTasklist"
          :selectedTaskRef="selectedTaskRef"
          @toggle-goal-details-dialog="toggleGoalDetailsDialog"
        />
        <atom-alert
          :value="true"
          color="success"
          icon="ev_station"
          outline
          class="ml-3 mr-3"
        >
          It's better to set Month and Weekly goals first to better guide daily
          milestones.
        </atom-alert>
      </atom-card>
    </atom-dialog>
    <atom-dialog
      v-model="goalDisplayDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <atom-card>
        <atom-toolbar color="white">
          <atom-spacer></atom-spacer>
          <atom-button icon @click="toggleGoalDisplayDialog(null, false)">
            <atom-icon>close</atom-icon>
          </atom-button>
        </atom-toolbar>
        <atom-card class="no-shadow">
          <atom-card-text class="pa-0">
            <goal-creation
              :newGoalItem="selectedGoalItem"
              v-on:add-update-goal-entry="toggleGoalDisplayDialog"
            />
          </atom-card-text>
        </atom-card>
      </atom-card>
    </atom-dialog>
    <atom-dialog v-model="quickTaskDialog" max-width="600px">
      <atom-card>
        <atom-card-title>
          <span class="headline">{{ quickTaskTitle }}</span>
        </atom-card-title>
        <atom-card-text>
          <p>
            {{ quickTaskDescription }}
          </p>
          <quick-goal-creation
            :key="quickModalKey"
            :goals="displayGoals"
            :date="date"
            period="day"
            :tasklist="displayTasklist"
            :selectedTaskRef="selectedTaskRef"
            @start-quick-goal-task="(task) => checkClick(task, { fireAgent: false })"
            @build-agent="onBuildAgent"
            @start-agent="onStartAgentFromQuick"
          />
        </atom-card-text>
      </atom-card>
    </atom-dialog>
    <atom-dialog v-model="goalActionDialog" max-width="600px">
      <atom-card v-if="goalActionTask">
        <atom-card-title>
          <span class="headline">{{ goalActionTask.name }}</span>
        </atom-card-title>
        <atom-card-text>
          <p>{{ goalActionTask.description }}</p>
          <div v-if="goalActionItem" class="goal-action-item mb-3">
            <div class="subheading font-weight-medium">{{ goalActionItem.body }}</div>
            <div v-if="goalActionItem.contribution" class="grey--text">{{ goalActionItem.contribution }}</div>
          </div>
          <related-tasks-timeline-container
            v-if="goalActionItem && goalActionItem.goalRef"
            :goal-ref="goalActionItem.goalRef"
            :date="date"
            :tasklist="displayTasklist"
          />
          <task-action-buttons
            :agent-state="goalActionAgentState"
            @start-task="onGoalActionStartTask"
            @start-agent="onGoalActionStartAgent"
            @build-agent="onGoalActionBuildAgent"
          />
        </atom-card-text>
      </atom-card>
    </atom-dialog>
    <agent-edit-modal
      v-model="agentEditModalOpen"
      :prefilled-task-ref="agentEditTaskRef"
      :routine-options="agentEditRoutineOptions"
      @saved="onAgentSaved"
    />
    <atom-dialog
      v-model="toggleStepModal"
      width="500"
    >
      <atom-card>
        <atom-card-title
          class="headline grey lighten-2"
          primary-title
        >
          Routine Steps
        </atom-card-title>

        <atom-card-text v-if="stepModalTask && stepModalTask.steps">
          <ul>
            <li v-for="step in stepModalTask.steps" v-bind:key="step.name">{{ step.name }}</li>
          </ul>
        </atom-card-text>

        <atom-divider></atom-divider>

        <atom-card-actions>
          <atom-spacer></atom-spacer>
          <atom-button
            color="primary"
            flat
            @click="toggleStepModal = false"
          >
            Close
          </atom-button>
        </atom-card-actions>
      </atom-card>
    </atom-dialog>
    <paywall-drawer
      v-model="paywallDrawerOpen"
      :cost="paywallCost"
      :available="(xpBalance && xpBalance.available) || 0"
      :show-purchase="showPaywallPurchase"
    />
    </container-box>

    <!-- Dashboard FAB for AI Search -->
    <atom-fab-transition>
      <atom-button
        key="ai-search-fab-dashboard"
        fab
        bottom
        right
        color="primary"
        dark
        fixed
        data-testid="ai-search-fab"
        :style="$vuetify.breakpoint.xsOnly ? 'z-index: 4; margin-bottom: 72px;' : 'z-index: 1000; margin-bottom: 16px; margin-right: 16px;'"
        @click.stop="openAiSearchModal"
      >
        <atom-icon>add</atom-icon>
      </atom-button>
    </atom-fab-transition>
  </div>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';
import gql from 'graphql-tag';

import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import WakeCheck from '@routine-notes/ui/atoms/WakeCheck/WakeCheck.vue';
import CurrentTaskCard from '@routine-notes/ui/organisms/CurrentTaskCard/CurrentTaskCard.vue';
import UpcomingPastTasks from '@routine-notes/ui/organisms/UpcomingPastTasks/UpcomingPastTasks.vue';
import WeekGoalStreak from '@routine-notes/ui/organisms/WeekGoalStreak/WeekGoalStreak.vue';
import { AgentEditModal, PaywallDrawer } from '@routine-notes/ui/organisms';
import AgendaTaskList from '@routine-notes/ui/organisms/AgendaTaskList/AgendaTaskList.vue';
import TaskActionButtons from '@routine-notes/ui/molecules/TaskActionButtons/TaskActionButtons.vue';
import {
  AtomAlert,
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomDialog,
  AtomDivider,
  AtomFabTransition,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomProgressCircular,
  AtomProgressLinear,
  AtomSpacer,
  AtomSwitch,
  AtomToolbar,
  AtomToolbarTitle,
} from '@routine-notes/ui/atoms';
import { TIMES_UP_TIME, PROACTIVE_START_TIME, ONBOARDING_COMPLETE } from '../constants/settings';
import { defaultGoalItem } from '../constants/goals';
import eventBus, { EVENTS } from '../utils/eventBus';
import { MeasurementMixin } from '../utils/measurementMixins';
import {
  AGENDA_GOALS_QUERY,
  DAILY_GOALS_QUERY,
  ROUTINE_DATE_QUERY,
  XP_BALANCE_QUERY,
  REDEEM_ROUTINE_ITEM_MUTATION,
} from '../composables/graphql/queries';
import { XP_PAYWALL_PURCHASE } from '../config/featureFlags';
import {
  updateRoutineTaskInCache,
  updateRoutineTaskKEarnedInCache,
  updateWeekStimuliKInCache,
} from '../composables/useApolloCacheUpdates';
import { pendingMutations } from '../utils/pendingMutations';
import { runNewDayReset } from '../utils/newDay';
import { startAgentWhenReady } from '../utils/agentStart';
import { describeRedeemFailure } from '../utils/routineTaskDisplay';
import { guardFields, releaseEntity } from '../utils/cacheGuard';

import GoalList from '../containers/GoalListContainer.vue';
import { stepupMilestonePeriodDate, threshold } from '../utils/getDates';
import QuickGoalCreation from '../containers/QuickGoalCreationContainer.vue';
import RelatedTasksTimelineContainer from '../containers/RelatedTasksTimelineContainer.vue';
import GoalCreation from '../containers/GoalCreationContainer.vue';
import WeekdaySelectorContainer from '../containers/WeekdaySelectorContainer.vue';
import intelligentRefreshMixin from '../mixins/intelligentRefreshMixin';
import { TimeFormatMixin } from '../utils/timeFormat';
import { initDashboardCaching } from '../composables/useDashboardCaching';
import { filterAreaProjectTags } from '../utils/dashboardCache';
import { readAiSearchSettings } from '../utils/aiSearchSettings';

function weekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY')
    .startOf('month')
    .weekday() < 2
    ? 1
    : 0;
  return (
    moment(d, 'DD-MM-YYYY').week()
    - moment(d, 'DD-MM-YYYY')
      .startOf('month')
      .week()
    + addFirstWeek
  );
}

export default {
  name: 'DashBoard',
  mixins: [MeasurementMixin, intelligentRefreshMixin, TimeFormatMixin],
  components: {
    GoalList,
    ContainerBox,
    WakeCheck,
    QuickGoalCreation,
    RelatedTasksTimelineContainer,
    TaskActionButtons,
    GoalCreation,
    WeekdaySelectorContainer,
    CurrentTaskCard,
    UpcomingPastTasks,
    WeekGoalStreak,
    AgendaTaskList,
    AtomAlert,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomDialog,
    AtomDivider,
    AtomFabTransition,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomProgressCircular,
    AtomProgressLinear,
    AtomSpacer,
    AtomSwitch,
    AtomToolbar,
    AtomToolbarTitle,
    AgentEditModal,
    PaywallDrawer,
  },
  apollo: {
    // Routine data query - Apollo cache persistence handles offline caching
    routineDate: {
      query: ROUTINE_DATE_QUERY,
      // cache-and-network so the viewed day always reconciles against the
      // server. Routine tasks reuse the same _id across days, so Apollo
      // normalises them to one entity per task; without a network reconcile a
      // new day could show the previous day's cached stimuli (the server is
      // always correct — it builds each day's tasks with earned:0).
      fetchPolicy: 'cache-and-network',
      skip() {
        // Skip query if user is not authenticated
        return !this.$root.$data.email;
      },
      update(data) {
        // Mark first load as complete
        this.routineFirstLoad = false;

        if (data.routineDate) {
          // Update local did reference
          this.did = data.routineDate.id || '';
          // Sync skip day to store
          this.$routine.setSkipDay(!!data.routineDate.skip);
          return data.routineDate;
        }

        // If routine doesn't exist for this date (new user or new day), create it
        if (data.routineDate === null) {
          this.addNewDayRoutine();
        }
        return null;
      },
      variables() {
        return {
          date: this.date,
        };
      },
      error(error) {
        console.error('[DashBoard] Routine query error:', error);
      },
    },
    agendaGoals: {
      query: AGENDA_GOALS_QUERY,
      skip() {
        // Skip query if user is not authenticated or if today is selected
        // (dailyGoals query already covers the same data for today)
        return !this.$root.$data.email || this.isTodaySelected;
      },
      update(data) {
        this.agendaFirstLoad = false;
        return data.agendaGoals;
      },
      variables() {
        return {
          date: this.date,
        };
      },
      error() {
        this.isLoading = false;
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
      error(error) {
        console.error('[DashBoard] xpBalance query error:', error);
      },
    },
    goals: {
      query: DAILY_GOALS_QUERY,
      skip() {
        // Skip query if user is not authenticated
        return !this.$root.$data.email;
      },
      update(data) {
        // Mark first load as complete
        this.goalsFirstLoad = false;

        return data.optimizedDailyGoals;
      },
      variables() {
        return {
          date: this.date,
        };
      },
    },
  },
  data() {
    return {
      isLoading: false,
      isRefreshing: false,
      goalDetailsDialog: false,
      goalDisplayDialog: false,
      quickTaskDialog: false,
      quickTaskTitle: '',
      quickTaskDescription: '',
      // Existing-goal action modal: when a routine task already has a day goal
      // item, tapping its action opens this modal (first goal item + the shared
      // Start Task / Start Agent buttons) instead of ticking directly.
      goalActionDialog: false,
      goalActionItem: null,
      goalActionTask: null,
      defaultGoalItem,
      selectedGoalItem: { ...defaultGoalItem }, // Initialize with all default fields
      // Routine data now comes from $routine store ($routineTasklist, $routine.skipDay)
      // Local 'did' is kept for mutations that need the routine document ID
      did: '',
      currentGoalPeriod: 'day',
      selectedBody: '',
      selectedTaskRef: '',
      date: moment().format('DD-MM-YYYY'),
      todayDate: moment().format('DD-MM-YYYY'),
      periods: ['year', 'month', 'week', 'day'],
      isEditable: true,
      activeSelectionId: '',
      tabs: null,
      toggleStepModal: false,
      // Bumped each time the quick-task modal opens so <quick-goal-creation>
      // remounts fresh — clears any stale loading state and refetches the
      // Goal Task dropdown (picks up newly-added week goals).
      quickModalKey: 0,
      // Task whose steps the step modal shows — the current task or any
      // expanded upcoming/past row.
      stepModalTask: null,
      // Paywall drawer state — opened when a diamond redeem is unaffordable
      // or when a redemption drains the balance to zero.
      paywallDrawerOpen: false,
      paywallCost: 0,
      showPaywallPurchase: XP_PAYWALL_PURCHASE,
      // Track first load for skeleton display
      goalsFirstLoad: true,
      // Track first load for routine skeleton display
      routineFirstLoad: true,
      // Track first load for the non-today agenda skeleton
      agendaFirstLoad: true,
      // True while the day-rollover cache purge runs. Drives the "Preparing
      // new day" overlay — the only load state that legitimately blocks the
      // dashboard, because at that moment there is nothing valid to paint.
      isPreparingNewDay: false,
      // The id of the last week-goal item the user completed; used by
      // CurrentTaskCard / UpcomingPastTasks to highlight streak progress
      // on that goal. Declared here so the template binding stays
      // reactive — `refreshTaskGoal()` writes to it after a tick.
      lastCompleteItemGoalRef: null,
      // Agent edit modal state (driven by Build Agent button + deep links)
      agentEditModalOpen: false,
      agentEditTaskRef: '',
      // Track which routine actions we've already dispatched from the URL
      // so route reuse doesn't re-fire on every render
      dispatchedRouteAction: '',
      // Analytics: Track component mount time for session duration
      mountTime: Date.now(),
      // Reactive time tracker to auto-update currentTask
      now: moment(),
      // Timer ID for current task auto-update
      currentTaskTimerId: null,
      // Dashboard caching state
      isDashboardCaching: false,
      dashboardCachingProgress: 0,
      currentCachingTag: '',
      dashboardCachingCompleted: 0,
      dashboardCachingTotal: 0,
    };
  },
  watch: {
    // Remount the quick-task modal each time it opens so it never shows a
    // stale loading state and always refetches the Goal Task dropdown.
    quickTaskDialog(isOpen) {
      if (isOpen) {
        this.quickModalKey += 1;
      }
    },
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        // Apollo automatically refetches routineDate when date changes
        const date = moment(this.date, 'DD-MM-YYYY');
        const todayDate = moment(new Date(), 'DD-MM-YYYY');
        this.isEditable = moment(date).isSameOrAfter(todayDate, 'day');
      }
    },
    // Watch for route changes to detect login/logout
    $route(to, from) {
      // If user navigates from login page to another page, refresh Apollo queries
      if (from.name === 'login' && to.name !== 'login') {
        this.refreshApolloQueries();
      }
    },

    // Watch for user email changes (indicates login/logout)
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      // If email changes from null/undefined to a value, or from one user to another
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },

    // Track goal period changes
    currentGoalPeriod(newPeriod, oldPeriod) {
      if (newPeriod !== oldPeriod && oldPeriod) {
        this.trackUserInteraction('goal_period_change', 'button_toggle', {
          from_period: oldPeriod,
          to_period: newPeriod,
          selected_task_ref: this.selectedTaskRef,
        });
      }
    },

    // Update global current task store when local currentTask changes
    currentTask: {
      handler(newTask) {
        // Update the global current task store with the current task
        this.$currentTask.setCurrentTask(newTask || {});
      },
      immediate: true,
    },
    // Re-evaluate deep-link routine action whenever routes or data become ready
    '$route.params.routineId': function watchRouteRoutineId() {
      this.maybeDispatchRouteAction();
    },
    '$route.params.action': function watchRouteAction() {
      this.maybeDispatchRouteAction();
    },
    displayTasklist: {
      handler() {
        this.maybeDispatchRouteAction();
      },
      immediate: true,
    },
    // Update global task list when routine tasklist changes (from Apollo)
    'routineDate.tasklist': {
      handler(newTasklist) {
        // Update the global current task store with the task list
        this.$currentTask.setTasklist(newTasklist || []);
        // Update skipDay state when routine data changes
        if (newTasklist && newTasklist.length > 0) {
          this.routineFirstLoad = false;
          this.startDashboardCaching();
          // Check for passed/wait times if today is selected
          if (this.isTodaySelected) {
            this.setPassedWait();
          }
        }
      },
      immediate: true,
    },
    // Watch Apollo routine loading state
    '$apollo.queries.routineDate.loading': {
      handler(routineLoading) {
        // Only show loading if we don't have data AND routine is loading
        const hasData = this.routineDate && this.routineDate.tasklist && this.routineDate.tasklist.length > 0;
        if (!hasData) {
          this.isLoading = routineLoading;
        } else {
          // We have data, so set loading to false
          this.isLoading = false;
        }
      },
      immediate: true,
    },
  },
  async created() {
    // Apollo cache persistence handles offline data automatically via localforage
    // Apollo routineDate query will automatically fetch when component is created
    // and variables (date) are set
  },
  mounted() {
    // Track component mount for analytics
    this.trackPageView('dashboard');
    this.trackUserInteraction('component_mounted', 'lifecycle', {
      component: 'DashBoard',
      user_email: this.$root.$data.email || 'anonymous',
      goal_period: this.currentGoalPeriod,
    });

    // Set up global event listeners for refetching data
    eventBus.$on(EVENTS.REFETCH_DAILY_GOALS, this.handleRefetchDailyGoals);
    eventBus.$on(EVENTS.TASK_CREATED, this.handleTaskCreated);
    eventBus.$on(EVENTS.GOALS_SAVED, this.handleGoalsSaved);
    eventBus.$on(EVENTS.GOAL_ITEM_CREATED, this.handleGoalItemCreated);
    eventBus.$on(EVENTS.AGENT_STATUS_CHANGED, this.handleAgentStatusChanged);

    // Listen for dashboard caching progress
    eventBus.$on(EVENTS.DASHBOARD_CACHING_STATUS, this.handleDashboardCachingStatus);

    // Pull the user's agents into the local store so QuickGoalCreation
    // and the running-badge can render synchronously on first paint
    this.$agent.fetchAll();

    console.log('DashBoard: Event listeners registered');

    // Start dashboard caching for area/project tags
    this.startDashboardCaching();

    // Start intelligent refresh system
    this.startIntelligentRefresh({
      interval: 30 * 1000, // 30 seconds
      onDayChange: this.handleDayChange,
      onRoutineCheck: this.handleRoutineItemCheck,
    });

    // Auto-update current task every 60 seconds based on time
    this.currentTaskTimerId = setInterval(() => {
      this.now = moment();
    }, 60 * 1000);
  },
  beforeDestroy() {
    // Track component destruction for analytics
    this.trackUserInteraction('component_destroyed', 'lifecycle', {
      component: 'DashBoard',
      session_duration: Date.now() - (this.mountTime || Date.now()),
    });

    // Clean up event listeners to prevent memory leaks
    eventBus.$off(EVENTS.REFETCH_DAILY_GOALS, this.handleRefetchDailyGoals);
    eventBus.$off(EVENTS.TASK_CREATED, this.handleTaskCreated);
    eventBus.$off(EVENTS.GOALS_SAVED, this.handleGoalsSaved);
    eventBus.$off(EVENTS.GOAL_ITEM_CREATED, this.handleGoalItemCreated);
    eventBus.$off(EVENTS.AGENT_STATUS_CHANGED, this.handleAgentStatusChanged);
    eventBus.$off(EVENTS.DASHBOARD_CACHING_STATUS, this.handleDashboardCachingStatus);

    if (this.agentRefreshTimer) {
      clearTimeout(this.agentRefreshTimer);
      this.agentRefreshTimer = null;
    }

    // Clean up intelligent refresh timer
    this.stopIntelligentRefresh();

    // Clean up current task auto-update timer
    if (this.currentTaskTimerId) {
      clearInterval(this.currentTaskTimerId);
      this.currentTaskTimerId = null;
    }
  },
  methods: {
    // Collect area/project tags for routines where the user has opted in
    // to AI Search in either task mode (aiEnhancedTask) or goal mode
    // (associateParentGoal). We only build context for those routines.
    getAiEnabledRoutineTags() {
      const routines = Array.isArray(this.$currentTaskList) && this.$currentTaskList.length
        ? this.$currentTaskList
        : this.tasklist;

      if (!Array.isArray(routines) || routines.length === 0) {
        return [];
      }

      const tags = routines.reduce((acc, routine) => {
        const routineId = routine && routine.id;
        const settings = readAiSearchSettings(routineId);
        if (!settings.aiEnhancedTask && !settings.associateParentGoal) {
          return acc;
        }

        const routineTags = Array.isArray(routine.tags) ? routine.tags : [];
        if (routineTags.length > 0) {
          acc.push(...routineTags);
        }
        return acc;
      }, []);

      return [...new Set(filterAreaProjectTags(tags))];
    },

    // Start dashboard caching for area/project tags drawn from
    // AI-enabled routines only (task mode or goal mode).
    startDashboardCaching() {
      if (!this.$root.$data.email) return;

      const tags = this.getAiEnabledRoutineTags();
      if (tags.length === 0) return;

      initDashboardCaching(this, { tags });
    },

    // Handle dashboard caching progress updates
    handleDashboardCachingStatus({
      isCaching, progress, total, completed, currentTag,
    }) {
      this.isDashboardCaching = isCaching;
      this.dashboardCachingProgress = progress;
      this.currentCachingTag = currentTag || '';
      this.dashboardCachingCompleted = completed || 0;
      this.dashboardCachingTotal = total || 0;
    },

    // Refetch routine data via Apollo
    async refetchRoutine() {
      try {
        if (this.$apollo.queries.routineDate) {
          await this.$apollo.queries.routineDate.refetch();
          console.log('[DashBoard] Refetched routine via Apollo');
        }
      } catch (error) {
        console.error('[DashBoard] Failed to refetch routine:', error);
        this.$notify({
          title: 'Error',
          text: 'Failed to refresh routine data',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },

    // Open AI Search Modal
    openAiSearchModal() {
      eventBus.$emit(EVENTS.OPEN_AI_SEARCH, { date: this.date });
    },

    // Open edit goal dialog for day tasks
    openEditGoalDialog(goalItem, taskGoals) {
      // Construct the full goal item object needed for editing
      this.selectedGoalItem = {
        id: goalItem.id,
        body: goalItem.body,
        progress: goalItem.progress,
        isComplete: goalItem.isComplete,
        taskRef: goalItem.taskRef,
        goalRef: goalItem.goalRef,
        contribution: goalItem.contribution || '',
        reward: goalItem.reward || '',
        tags: goalItem.tags || [],
        status: goalItem.status,
        completedAt: goalItem.completedAt,
        subTasks: goalItem.subTasks || [],
        isMilestone: goalItem.isMilestone,
        date: taskGoals.date,
        period: taskGoals.period,
      };
      this.goalDisplayDialog = true;
    },

    // Delete agenda goal item
    async deleteAgendaGoalItem(goalItemId, date, period) {
      if (!confirm('Are you sure you want to delete this task?')) {
        return;
      }

      try {
        await this.$goals.deleteGoalItem({
          id: goalItemId, date, period, dayDate: this.date,
        });

        // Refetch agenda goals only when viewing a non-today date
        if (!this.isTodaySelected && this.$apollo.queries.agendaGoals) {
          await this.$apollo.queries.agendaGoals.refetch();
        }

        this.$notify({
          title: 'Success',
          text: 'Task deleted successfully',
          group: 'notify',
          type: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Error deleting goal item:', error);
        this.$notify({
          title: 'Error',
          text: 'Failed to delete task',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },

    // Delete goal from agenda list (via GoalItemList event)
    deleteAgendaGoalFromList({ id, period, date }) {
      this.$goals.deleteGoalItem({
        id, period, date, dayDate: this.date,
      })
        .then(() => {
          if (this.$apollo.queries.agendaGoals) {
            this.$apollo.queries.agendaGoals.refetch();
          }
        })
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },

    // Complete goal item in agenda view (past days)
    completeAgendaGoalItem(payload) {
      const {
        id, period, date, taskRef, isComplete, isMilestone, onSuccess,
      } = payload;

      this.$goals.completeGoalItem({
        id, period, date, taskRef, isComplete, isMilestone, dayDate: this.date,
      })
        .then(() => {
          if (onSuccess) onSuccess();
          if (this.$apollo.queries.agendaGoals) {
            this.$apollo.queries.agendaGoals.refetch();
          }
        })
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },

    // Complete subtask in agenda view (past days)
    completeAgendaSubTask(payload) {
      const {
        id, taskId, period, date, isComplete, subTasks,
      } = payload;

      this.$goals.completeSubTaskItem({
        id, taskId, period, date, isComplete, subTasks, dayDate: this.date,
      })
        .catch(() => {
          // Apollo rolls the optimistic response back on error.
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occurred while updating subtask',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },

    // Refetch agenda goals (used after completing items in past days)
    refreshAgendaGoals() {
      if (this.$apollo.queries.agendaGoals) {
        this.$apollo.queries.agendaGoals.refetch();
      }
    },

    // Handle refresh button click
    async refreshData() {
      this.isRefreshing = true;
      eventBus.$emit(EVENTS.DASHBOARD_REFRESH);
      this.trackUserInteraction('refresh_button', 'click', {
        date: this.date,
        is_today: this.isTodaySelected,
      });

      try {
        await this.refreshApolloQueries();
        this.$notify({
          title: 'Refreshed',
          text: 'Dashboard data has been updated',
          group: 'notify',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        console.error('Refresh error:', error);
        this.$notify({
          title: 'Refresh Failed',
          text: 'Could not refresh data. Please try again.',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.isRefreshing = false;
      }
    },

    // Global event handlers
    handleRefetchDailyGoals() {
      console.log('DashBoard: Handling refetch daily goals event');
      this.refetchDailyGoals();
    },
    handleTaskCreated(taskData) {
      console.log('DashBoard: Handling task created event', taskData);
      // Tasks are always day goals, so refetch daily goals
      this.refetchDailyGoals();
    },
    handleGoalsSaved(eventData) {
      console.log('DashBoard: Handling goals saved event', eventData);

      // Check if user has completed onboarding (has both week and month goals)
      this.checkOnboardingCompletion(eventData);

      // Only refetch if day goals were created
      this.refetchDailyGoals();
    },

    checkOnboardingCompletion(eventData) {
      // Don't show if already shown
      if (localStorage.getItem(ONBOARDING_COMPLETE)) {
        return;
      }

      // Track which goal periods the user has created
      const savedPeriods = JSON.parse(localStorage.getItem('SAVED_GOAL_PERIODS') || '[]');

      if (eventData && eventData.period) {
        const timelineEntryPeriod = eventData.period;
        let planTitlePeriod = timelineEntryPeriod;

        // Determine the plan title period based on timeline entry period
        if (timelineEntryPeriod === 'day') planTitlePeriod = 'week';
        else if (timelineEntryPeriod === 'week') planTitlePeriod = 'month';
        else if (timelineEntryPeriod === 'month') planTitlePeriod = 'year';

        if (!savedPeriods.includes(planTitlePeriod)) {
          savedPeriods.push(planTitlePeriod);
          localStorage.setItem('SAVED_GOAL_PERIODS', JSON.stringify(savedPeriods));
        }
      }

      // Check if user has created both week and month goals
      if (savedPeriods.includes('week') && savedPeriods.includes('month')) {
        this.$notify({
          title: 'You\'re All Set! 🎉',
          text: 'Do daily milestones to complete weekly and monthly goals.',
          group: 'notify',
          type: 'success',
          duration: 8000,
        });

        // Mark onboarding as complete
        localStorage.setItem(ONBOARDING_COMPLETE, 'true');
      }
    },

    handleGoalItemCreated() {
      // Refetch daily goals to reflect the new goal item; agent execution is
      // now triggered from QuickGoalCreationContainer using the freshly
      // created goal id, so we no longer need to queue events here.
      this.refetchDailyGoals();
    },
    handleAgentStatusChanged() {
      // Debounce: coalesce a burst of running → listening → finished
      // transitions into a single dashboard refresh.
      if (this.agentRefreshTimer) clearTimeout(this.agentRefreshTimer);
      this.agentRefreshTimer = setTimeout(() => {
        this.agentRefreshTimer = null;
        this.refreshApolloQueries().catch(() => {});
      }, 250);
    },
    refetchDailyGoals() {
      try {
        if (this.$apollo.queries.goals) {
          this.$apollo.queries.goals.refetch()
            .then(() => {
              console.log('DashBoard: Daily goals refetched successfully');
            })
            .catch((error) => {
              console.error('DashBoard: Error refetching daily goals:', error);
            });
        }
      } catch (error) {
        console.error('DashBoard: Error in refetchDailyGoals:', error);
      }
    },

    refreshApolloQueries() {
      // Refresh all queries (Apollo + routine store) when user logs in
      const refreshPromises = [];

      try {
        // Refetch routine via $routine plugin
        refreshPromises.push(this.$routine.fetchRoutine(this.date, { useCache: false }));

        // Only refetch agendaGoals when viewing a non-today date
        // (for today, dailyGoals covers the same data)
        if (!this.isTodaySelected && this.$apollo.queries.agendaGoals) {
          refreshPromises.push(this.$apollo.queries.agendaGoals.refetch());
        }
        if (this.$apollo.queries.goals) {
          refreshPromises.push(this.$apollo.queries.goals.refetch());
        }

        console.log('DashBoard: Queries refreshed successfully');
        return Promise.all(refreshPromises);
      } catch (error) {
        console.warn('DashBoard: Error refreshing queries:', error);
        return Promise.reject(error);
      }
    },

    // ───────────────────────────────────────────────────────────────────
    // Agent integration
    //
    // The legacy executeEvent/checkEventExecutionForTask/{60-s timer} block
    // that lived here previously has moved to the agentStore — see
    // store/agentStore.js (fireStartEventIfPresent / fireEndEvent).
    // ───────────────────────────────────────────────────────────────────

    findFirstGoalIdForRoutine(taskId) {
      if (!taskId) return null;
      const goals = this.displayGoals || [];
      for (const goal of goals) {
        if (!goal || goal.period !== 'day' || !Array.isArray(goal.goalItems)) continue;
        const item = goal.goalItems.find((gi) => gi.taskRef === taskId);
        if (item && item.id) return item.id;
      }
      return null;
    },

    /**
     * Fire a routine task's agent, queueing rather than dropping it when the
     * goal item it needs has not been saved yet. See utils/agentStart.js for
     * the rule and why the old `startsWith('temp-')` skip was wrong.
     */
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

    // The agent end event has completed for this task when its day goal item
    // carries a saved transcript (reward) — the same signal the transcript
    // button keys on, persisted server-side so it survives reload.
    taskAgentEndEventDone(taskRef) {
      if (!taskRef) return false;
      return (this.displayGoals || []).some((goal) => goal
        && goal.period === 'day'
        && Array.isArray(goal.goalItems)
        && goal.goalItems.some((gi) => gi.taskRef === taskRef && gi.reward));
    },

    // Badge status to actually display. A 'listening' agent is still waiting
    // for its end event; once that end event has finished (transcript saved)
    // the agent is done, so never leave the badge stuck on 'listening' — e.g.
    // when a late start-event dispatch resolves after the end event already
    // completed, or after a reload restores a pre-completion 'listening'.
    effectiveAgentStatus(taskRef) {
      const status = (taskRef && this.$agent.statusByRoutineId[taskRef]) || '';
      if (status === 'listening' && this.taskAgentEndEventDone(taskRef)) return 'finished';
      return status;
    },

    // End-event rule: a listening agent completes when the routine task's
    // goal-item counter is full — completedCount === totalCount (the same
    // stimulus-derived numbers shown on the card). Works for any of today's
    // tasks, current or past.
    maybeFireAgentEndEvent(taskRef, goalId) {
      const task = (this.displayTasklist || []).find((t) => t.id === taskRef);
      if (!task) return;
      const total = this.countTaskTotal(task);
      const completed = this.countTaskCompleted(task);
      if (total > 0 && completed >= total) {
        const gid = goalId || this.findFirstGoalIdForRoutine(taskRef);
        this.$agent.fireEndEvent({ taskRef, goalId: gid }).catch(() => {});
      }
    },

    onBuildAgent(taskRef) {
      if (!taskRef) return;
      this.agentEditTaskRef = taskRef;
      this.agentEditModalOpen = true;
    },

    openStepModal(task) {
      this.stepModalTask = task || this.currentTask;
      this.toggleStepModal = true;
    },

    async onStartAgentFromQuick(taskRef) {
      // Only reached when a day-goal already exists — the container
      // handles the no-goal case by creating the goal item (which fires
      // the agent itself). Tick if needed; the tick success handler fires
      // the agent with the existing goal id. If the routine is already
      // ticked, fire directly since checkClick early-returns.
      if (!taskRef) return;
      this.quickTaskDialog = false;
      const task = this.displayTasklist.find((t) => t.id === taskRef);
      if (task && !task.ticked && !task.passed && !task.wait) {
        // Explicit Start Agent press — failures may report loudly.
        this.checkClick(task, { agentImplicit: false });
        return;
      }
      if (task && this.isRedeemable(task)) {
        // Passed task: Start Agent must not bypass the points system — the
        // redeem runs first (pays the frozen price, ticks the task), and its
        // success handler fires the agent for this non-current task.
        this.redeemClick(task, { fireAgent: true, agentImplicit: false });
        return;
      }
      const goalId = this.findFirstGoalIdForRoutine(taskRef);
      if (goalId && !String(goalId).startsWith('temp-')) {
        await this.$agent.fireStartEventIfPresent({
          taskRef, goalId, goalDate: this.date, goalPeriod: 'day',
        });
      }
    },

    onAgentSaved() {
      this.$agent.fetchAll();
    },

    maybeDispatchRouteAction() {
      const { routineId, action } = this.$route.params || {};
      if (!routineId || !action) return;
      const tasklist = this.displayTasklist;
      if (!Array.isArray(tasklist) || tasklist.length === 0) return;

      const dispatchKey = `${routineId}:${action}`;
      if (this.dispatchedRouteAction === dispatchKey) return;

      const routine = tasklist.find((t) => t.id === routineId);
      if (!routine) {
        this.dispatchedRouteAction = dispatchKey;
        this.$notify({
          title: 'Routine not found',
          text: 'That routine isn\'t on today\'s list.',
          group: 'notify',
          type: 'warning',
          duration: 3000,
        });
        this.$router.replace('/home').catch(() => {});
        return;
      }

      const isCurrent = this.currentTask && this.currentTask.id === routine.id;
      const hasGoal = this.filterTaskGoalsPeriod(routine.id, this.displayGoals, 'day').length > 0;

      this.dispatchedRouteAction = dispatchKey;

      if (action === 'complete') {
        if (!hasGoal) {
          this.openQuickGoalForRoutine(routine);
        } else if (!routine.ticked) {
          this.checkClick(routine);
        }
        return;
      }

      if (!isCurrent) {
        this.$notify({
          title: 'Not your current task',
          text: 'Start/Build are only available for the active routine.',
          group: 'notify',
          type: 'info',
          duration: 3000,
        });
        return;
      }

      if (!hasGoal) {
        this.openQuickGoalForRoutine(routine);
        return;
      }

      if (action === 'start') {
        // Ticking fires the agent in the tick success handler; only fire
        // directly when the routine is already ticked (checkClick no-ops).
        if (!routine.ticked) {
          this.checkClick(routine);
          return;
        }
        const goalId = this.findFirstGoalIdForRoutine(routine.id);
        if (goalId && !String(goalId).startsWith('temp-')) {
          this.$agent.fireStartEventIfPresent({
            taskRef: routine.id, goalId, goalDate: this.date, goalPeriod: 'day',
          });
        }
        return;
      }

      if (action === 'build') {
        this.onBuildAgent(routine.id);
      }
    },

    openQuickGoalForRoutine(routine) {
      this.selectedTaskRef = routine.id;
      this.quickTaskTitle = routine.name;
      this.quickTaskDescription = routine.description || '';
      this.quickTaskDialog = true;
    },
    setActiveSelection(task) {
      this.activeSelectionId = task.id;
    },
    getActiveClass(task) {
      return this.activeSelectionId === task.id ? 'active' : '';
    },
    handleDateSelected(newDate) {
      this.date = newDate;
    },
    deleteTaskAgendaGoal() {
      // No-op: Apollo cache optimistic update handles UI reactivity
    },
    updateSelectedTaskRef(id) {
      this.selectedTaskRef = id;
    },
    disablePrevious() {
      return this.date === moment().format('DD-MM-YYYY');
    },
    previousDate() {
      this.date = moment(this.date, 'DD-MM-YYYY')
        .subtract(1, 'days')
        .format('DD-MM-YYYY');
    },
    nextDate() {
      this.date = moment(this.date, 'DD-MM-YYYY')
        .add(1, 'days')
        .format('DD-MM-YYYY');
    },

    getButtonColor(task) {
      if (task) {
        if (task.ticked) {
          return 'success';
        }
        if (task.passed) {
          // Redeemable: diamond on a white background.
          return this.isRedeemable(task) ? 'white' : 'error';
        }
      }
      return 'grey';
    },
    getCurrentButtonColor(task) {
      if (task.ticked) {
        return 'success';
      }
      if (task.passed) {
        return this.isRedeemable(task) ? 'white' : 'error';
      }
      return '';
    },
    getButtonIcon(task) {
      if (task) {
        if (task.ticked) {
          // Redeemed ticks resume the normal check icon.
          return 'check';
        }
        if (task.passed && !task.ticked) {
          return this.isRedeemable(task) ? 'diamond' : 'close';
        }
        if (!task.passed && !task.ticked && !task.wait) {
          return 'alarm';
        }
      }
      return 'more_horiz';
    },
    // A passed, unticked task on TODAY's routine can be rescued with points.
    // Past dates stay locked (crossed button) — redemption is today-only.
    isRedeemable(task) {
      return !!task && task.passed && !task.ticked && !task.redeemed && this.isTodaySelected;
    },
    // Frozen redemption price (snapshotted when the task passed); falls back
    // to live points for tasks passed before the snapshot deploy.
    getRedeemCost(task) {
      return typeof task.passedPoints === 'number' ? task.passedPoints : (task.points || 0);
    },
    canAffordRedeem(task) {
      const balance = this.xpBalance;
      // Balance still loading — let the flow proceed; redeemClick and the
      // server's 402 remain the backstop.
      if (!balance) return true;
      if (balance.entitled) return true;
      return balance.available >= this.getRedeemCost(task);
    },
    newGoalItem(task, period) {
      this.selectedTaskRef = task.id;
      this.currentGoalPeriod = period;
      this.selectedBody = '';
      this.goalDetailsDialog = true;
    },
    clonePeriodGoalItem(task, period) {
      const stepUpPeriod = stepupMilestonePeriodDate(period);
      const filteredPeriodGoals = this.filterTaskGoalsPeriod(
        task.id,
        this.agendaGoals,
        stepUpPeriod.period,
      );
      this.selectedBody = (filteredPeriodGoals
          && filteredPeriodGoals.length
          && filteredPeriodGoals[0].goalItems[0].body)
        || '';
      this.selectedTaskRef = task.id;
      this.currentGoalPeriod = period;
      this.goalDetailsDialog = true;
    },
    filterUpcomingPastTask(isPast, tasklist) {
      let returnTasklist = [];
      if (Array.isArray(tasklist)) {
        const currentTaskId = this.currentTask ? this.currentTask.id : '0';
        const currentTime = moment();
        if (isPast) {
          returnTasklist = tasklist
            .filter((task) => {
              const taskTime = moment(task.time, 'HH:mm');
              const isTimeGreaterThanTask = currentTime.diff(taskTime, 'minutes') >= 0;
              return isTimeGreaterThanTask && task.id !== currentTaskId;
            });
        } else {
          returnTasklist = tasklist
            .filter((task) => {
              const taskTime = moment(task.time, 'HH:mm');
              const isTimeLessThanNextTask = currentTime.diff(taskTime, 'minutes') <= -1;
              return isTimeLessThanNextTask && task.id !== currentTaskId;
            });
        }
      }
      return returnTasklist;
    },
    enrichTasksForUpcomingPast(tasks) {
      if (!Array.isArray(tasks)) return [];
      return tasks.map((task) => ({
        ...task,
        percentage: this.countTaskPercentage(task),
        completedCount: this.countTaskCompleted(task),
        totalCount: this.countTaskTotal(task),
        timeLabel: this.displayTime(task.time),
        buttonIcon: this.getButtonIcon(task),
        buttonColor: this.getCurrentButtonColor(task),
        buttonDisabled: this.getButtonDisabled(task),
        // Agent running/listening/done badge — same as the current-task card.
        agentStatus: this.effectiveAgentStatus(task.id),
      }));
    },
    onSetGoalPeriod(period) {
      this.currentGoalPeriod = period;
      this.goalDetailsDialog = true;
    },
    filterTaskGoalsPeriod(id, goals, currentGoalPeriod) {
      const taskGoalList = [];
      if (goals && goals.length) {
        goals.forEach((goal) => {
          if (goal && goal.period === currentGoalPeriod) {
            const taskGoalItems = goal
              && goal.goalItems
              && goal.goalItems.filter((goalItem) => goalItem.taskRef === id);

            if (taskGoalItems && taskGoalItems.length) {
              const newGoal = {
                id: goal.id,
                period: goal.period,
                date: goal.date,
                goalItems: taskGoalItems,
              };
              taskGoalList.push(newGoal);
            }
          }
        });
      }
      return Array.isArray(taskGoalList) ? taskGoalList : [];
    },
    toggleGoalDetailsDialog(bool) {
      this.goalDetailsDialog = bool;

      // Track goal dialog interactions
      this.trackModalInteraction('goal_details_dialog', bool ? 'open' : 'close', {
        current_goal_period: this.currentGoalPeriod,
        selected_task_ref: this.selectedTaskRef,
      });
    },

    // Helper method to get task status
    getTaskStatus(task) {
      if (task.ticked) return 'completed';
      if (task.passed) return 'passed';
      if (task.wait) return 'waiting';
      return 'pending';
    },
    /**
     * Create the routine for `this.date` — at most once per date, no matter how
     * many times we're asked.
     *
     * This is called from the `routineDate` query's `update()` callback, which
     * Apollo runs for EVERY result: the cache pass, the network pass, and each
     * of the 30-second `refreshApolloQueries()` refetches. Unguarded, a single
     * new-day open fired `addRoutine` three times, and those concurrent creates
     * raced the goal-tick path's own routine auto-create — producing two Routine
     * documents for one date, after which `routineDate()` (a `findOne`) returned
     * an arbitrary one and a tick written to the other silently vanished.
     *
     * Memoizing the in-flight promise per date collapses the burst to one call.
     * (The server is now idempotent too — atomic upsert plus a unique index —
     * so this is defence in depth, not the only guard.)
     */
    addNewDayRoutine() {
      const { date } = this;
      if (!this.pendingRoutineCreates) this.pendingRoutineCreates = {};
      if (this.pendingRoutineCreates[date]) return this.pendingRoutineCreates[date];

      const inFlight = this.$routine.addRoutine(date)
        .then(() => {
          // Refetch through the dashboard's OWN routine query, which selects the
          // full task shape (stimuli, redeemed, passedPoints). $routine.fetchRoutine
          // uses a lighter query WITHOUT stimuli, so on a new day it refreshes
          // ticked/passed but leaves stimuli untouched — and because routine tasks
          // reuse the same _id across days, Apollo normalises them to one cache
          // entity per task, so yesterday's stimulus values would linger on the
          // new day. Refetching the full query zeroes them out.
          const routineQuery = this.$apollo.queries.routineDate;
          if (routineQuery && typeof routineQuery.refetch === 'function') {
            return routineQuery.refetch();
          }
          return this.$routine.fetchRoutine(this.date, { useCache: false });
        })
        .then(() => {
          this.isLoading = false;
        })
        .catch(() => {
          this.isLoading = false;
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        })
        .finally(() => {
          // Release the guard so a genuine later need (e.g. the routine was
          // deleted) can create it again.
          delete this.pendingRoutineCreates[date];
        });

      this.pendingRoutineCreates[date] = inFlight;
      return inFlight;
    },
    deleteTaskGoal({ id, period, date }) {
      // Apollo cache optimistic update handles instant UI removal
      this.$goals.deleteGoalItem({
        id, period, date, dayDate: this.date,
      })
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    completeGoalItem(payload) {
      console.log('DashBoard: Completing goal item with payload:', payload);
      const {
        id, period, date, taskRef, isComplete, isMilestone, onSuccess,
      } = payload;

      // Optimistically bump K.earned on the linked routine task and the
      // week-stimuli aggregate. These caches are not part of the
      // completeGoalItem mutation response, so Apollo's optimisticResponse
      // can't drive them — we still write them imperatively. The
      // pendingMutations gate in the WeekdaySelector ensures the
      // event-bus refetch is debounced/coalesced, so rapid clicks don't
      // produce a refetch storm that would race these writes.
      if (taskRef) {
        const apolloClient = this.$apollo.provider.defaultClient;
        updateRoutineTaskKEarnedInCache(
          apolloClient,
          { date: this.date, taskId: taskRef, isComplete },
        );
        updateWeekStimuliKInCache(
          apolloClient,
          { date: this.date, taskId: taskRef, isComplete },
        );
      }

      this.$goals.completeGoalItem({
        id, period, date, taskRef, isComplete, isMilestone, dayDate: this.date,
      })
        .then(() => {
          if (onSuccess) onSuccess();
          // Nudge the WeekdaySelectorContainer; it has its own debounce
          // so a rapid burst still results in only ~1 WEEK_STIMULI_QUERY
          // refetch.
          eventBus.$emit(EVENTS.ROUTINE_TICKED);
          // Mirror the K-stimulus completion semantics into the agent
          // domain: the end event fires when the task's goal-item counter
          // is FULL (completedCount === totalCount, i.e. K fully earned) —
          // the same numbers the card displays. Applies to any of today's
          // tasks, current or past. The agent store no-ops if no agent is
          // assigned or no end event is configured.
          if (isComplete && taskRef && period === 'day') {
            this.$nextTick(() => {
              this.maybeFireAgentEndEvent(taskRef, id);
            });
          }

          // Week-goal streak progress is no longer optimistically
          // updated — refetch the daily goals so the streak reflects the
          // server's recomputed value (autoCheckTaskPeriod).
          //
          // This is the ONLY refetch a tick needs. `refreshTaskGoal` used to
          // fire a second `goals.refetch()` plus a `fetchRoutine` for the same
          // tick; each is a cache-and-network read that can land after a later
          // tap and revert it, so the duplicates were pure race surface.
          if (period === 'day' && this.$apollo.queries.goals) {
            this.$apollo.queries.goals.refetch();
          }
        })
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    completeSubTask(payload) {
      const {
        id, taskId, period, date, isComplete, subTasks,
      } = payload;

      // `subTasks` is the organism's read-only snapshot of the parent's list.
      // It drives the optimistic response, so the checkbox flips instantly
      // through Apollo rather than by mutating the cached SubTaskItem.
      this.$goals.completeSubTaskItem({
        id, taskId, period, date, isComplete, subTasks, dayDate: this.date,
      })
        .then(() => {
          // Subtasks contribute to their parent goal item's completion which
          // in turn moves K on the routine task. Fan out a routine-ticked
          // event so the WeekdaySelector refetches its aggregate.
          eventBus.$emit(EVENTS.ROUTINE_TICKED);
          // A subtask can auto-complete its parent goal item and fill the
          // task's counter — apply the same end-event rule as goal items.
          // Note: payload.taskId is the parent GOAL ITEM id; resolve the
          // routine taskRef through it.
          if (isComplete && taskId) {
            this.$nextTick(() => {
              const parentItem = (this.displayGoals || [])
                .flatMap((g) => (g && Array.isArray(g.goalItems) ? g.goalItems : []))
                .find((gi) => gi.id === taskId);
              if (parentItem && parentItem.taskRef) {
                this.maybeFireAgentEndEvent(parentItem.taskRef);
              }
            });
          }
        })
        .catch(() => {
          // Apollo rolls the optimistic response back on error; nothing to undo.
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occurred while updating subtask',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    /**
     * Remember which week goal the last completed day item rolled up to, so the
     * streak strip can highlight it.
     *
     * It used to also `fetchRoutine(useCache:false)` + `goals.refetch()`. Both
     * were redundant — `completeGoalItem`'s own `.then()` already refetches
     * `goals`, and the routine's stimuli come back through the normalized
     * entity. Firing them here meant every tick launched three overlapping
     * cache-and-network reads, any of which could resolve after the NEXT tick
     * and overwrite it.
     */
    refreshTaskGoal(taskRef) {
      this.lastCompleteItemGoalRef = taskRef;
    },
    getWeekProgress(currentGoalPeriod, taskGoals) {
      if (currentGoalPeriod === 'day') {
        const mainTaskGoalRef = taskGoals.goalItems.length === 1 ? taskGoals.goalItems[0].goalRef : 0;
        if (this.goals && this.goals.length) {
          const weekGoals = this.goals.find((goal) => goal.period === 'week');
          const weekGoalItemMilestoneChecked = weekGoals
            && weekGoals.goalItems.find((goalItem) => goalItem.id === this.lastCompleteItemGoalRef || mainTaskGoalRef);
          return (weekGoalItemMilestoneChecked && weekGoalItemMilestoneChecked.progress) || 0;
        }
      }
      return 0;
    },
    getWeekProgressName(currentGoalPeriod, taskGoals) {
      if (currentGoalPeriod === 'day') {
        const mainTaskGoalRef = taskGoals.goalItems.length === 1 ? taskGoals.goalItems[0].goalRef : 0;
        if (this.goals && this.goals.length) {
          const weekGoals = this.goals.find((goal) => goal.period === 'week');
          const weekGoalItemMilestoneChecked = weekGoals
            && weekGoals.goalItems.find((goalItem) => goalItem.id === this.lastCompleteItemGoalRef || mainTaskGoalRef);
          return (weekGoalItemMilestoneChecked && weekGoalItemMilestoneChecked.body) || '';
        }
      }
      return '';
    },
    getButtonDisabled(task) {
      // Redeemable-passed tasks keep an enabled (diamond) button.
      if (this.isRedeemable(task)) {
        return false;
      }
      if (!task.ticked && (task.passed || task.wait)) {
        return true;
      }
      return false;
    },
    checkDialogClick(e, task) {
      e.stopPropagation();

      // Track user interaction
      this.trackButtonClick('task_action_button', {
        task_id: task.id,
        task_name: task.name,
        task_status: this.getTaskStatus(task),
        has_goals: this.filterTaskGoalsPeriod(task.id, this.displayGoals, 'day').length > 0,
      });

      // Affordability pre-flight BEFORE the modal: the quick-goal flow
      // persists the goal before the redeem runs, so an unaffordable redeem
      // must be stopped here or a failed redemption strands an orphan goal
      // on the unticked task (and steals its Build Agent path).
      if (this.isRedeemable(task) && !this.canAffordRedeem(task)) {
        this.paywallCost = this.getRedeemCost(task);
        this.paywallDrawerOpen = true;
        return;
      }

      // Redeemable (passed, today) tasks go through the SAME flow as a normal
      // tick — the quick-task modal is where goals get created and agents get
      // started, and redeeming must keep that intact.
      if ((!task.passed && !task.wait && !task.ticked) || this.isRedeemable(task)) {
        if (this.filterTaskGoalsPeriod(task.id, this.displayGoals, 'day').length) {
          // A goal item already exists → show the action modal (first goal
          // item + Start Task / Start Agent) instead of ticking directly.
          this.openGoalActionModal(task);
        } else {
          this.selectedTaskRef = task.id;
          this.quickTaskTitle = task.name;
          this.quickTaskDescription = task.description;
          this.quickTaskDialog = true;

          // Track quick task dialog opening
          this.trackModalInteraction('quick_task_dialog', 'open', {
            task_id: task.id,
            task_name: task.name,
          });
        }
      }
    },
    openGoalActionModal(task) {
      const goals = this.filterTaskGoalsPeriod(task.id, this.displayGoals, 'day');
      const firstGoal = goals && goals[0];
      const firstItem = firstGoal && firstGoal.goalItems && firstGoal.goalItems[0];
      if (!firstItem) {
        // No goal item to display — fall back to the original direct tick.
        this.checkClick(task);
        return;
      }
      this.goalActionTask = task;
      this.goalActionItem = firstItem;
      this.goalActionDialog = true;
    },
    onGoalActionStartTask() {
      const task = this.goalActionTask;
      this.goalActionDialog = false;
      // Start Task: complete the routine task, do NOT fire the agent.
      if (task) this.checkClick(task, { fireAgent: false });
    },
    onGoalActionStartAgent() {
      const task = this.goalActionTask;
      this.goalActionDialog = false;
      // Start Agent: complete the task AND fire the agent's start event.
      if (task) this.onStartAgentFromQuick(task.id);
    },
    onGoalActionBuildAgent() {
      const task = this.goalActionTask;
      this.goalActionDialog = false;
      if (task) this.onBuildAgent(task.id);
    },
    openTranscript(goalItem) {
      // Re-open the saved agent end-event transcript (the goal item's reward
      // HTML) in the shared AgentResultModal.
      if (goalItem && goalItem.reward) {
        this.$agent.showSavedResult(goalItem.taskRef || goalItem.id, goalItem.reward);
      }
    },
    redeemClick(task, { fireAgent = true, agentImplicit = true } = {}) {
      this.quickTaskDialog = false;
      const cost = this.getRedeemCost(task);
      const balance = this.xpBalance;
      const entitled = !!(balance && balance.entitled);

      this.trackButtonClick('task_redeem_button', {
        task_id: task.id,
        task_name: task.name,
        cost,
        available: (balance && balance.available) || 0,
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

      // Optimistic response only when both routine and balance are in cache —
      // the shape must match the mutation selection set field-for-field.
      const canOptimize = !!(this.routineDate && balance);
      const optimisticResponse = canOptimize
        ? {
          __typename: 'Mutation',
          redeemRoutineItem: {
            __typename: 'RedeemResult',
            routine: {
              ...this.routineDate,
              tasklist: (this.tasklist || []).map((t) => {
                if (t.id !== task.id) return { ...t };
                const stimuli = (t.stimuli || []).map((s) => {
                  if (s.name !== 'D') return { ...s };
                  return { ...s, earned: t.points || s.earned };
                });
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
        }
        : undefined;

      this.$apollo
        .mutate({
          mutation: REDEEM_ROUTINE_ITEM_MUTATION,
          variables: {
            id: this.did,
            taskId: task.id,
            date: this.date,
          },
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
                // Never lose the redeemed tick — write the flags directly to
                // the normalized RoutineItem so a redeemed (green) task can't
                // revert to a redeemable (white) diamond after a successful
                // redeem when the full-query write can't apply.
                try {
                  cache.writeFragment({
                    id: `RoutineItem:${task.id}`,
                    fragment: gql`fragment RedeemedFlags on RoutineItem { ticked redeemed }`,
                    data: { __typename: 'RoutineItem', ticked: true, redeemed: true },
                  });
                } catch (e2) {
                  updateRoutineTaskInCache(cache, {
                    date: this.date,
                    taskId: task.id,
                    ticked: true,
                  });
                }
              }
            }
            if (result.balance) {
              cache.writeQuery({
                query: XP_BALANCE_QUERY,
                data: { xpBalance: result.balance },
              });
            }
          },
        })
        .then(({ data: payload }) => {
          this.trackMutationPerformance('redeemRoutineItem', {
            id: this.did,
            taskId: task.id,
          }, redeemedAt);

          eventBus.$emit(EVENTS.ROUTINE_TICKED);
          eventBus.$emit(EVENTS.XP_REDEEMED);

          // A redeemed tick is a full tick — fire the agent's start event
          // exactly like checkClick does for an on-time tick. Works for any
          // of today's passed tasks, not just the current one. agentImplicit
          // stays quiet on failure unless the user pressed Start Agent.
          if (fireAgent) {
            this.fireAgentWhenReady(task.id, { implicit: agentImplicit });
          }

          const newBalance = payload
            && payload.redeemRoutineItem
            && payload.redeemRoutineItem.balance;
          if (newBalance && !newBalance.entitled && newBalance.available <= 0) {
            // Soft touchpoint: the redemption that drains the balance.
            this.$notify({
              title: "You're out of points",
              text: 'Earn more by completing your routine, goals and milestones — points settle overnight.',
              group: 'notify',
              type: 'info',
              duration: 5000,
            });
          }
        })
        .catch((error) => {
          const message = (error && error.message) || '';
          if (message.includes('402')) {
            // Server-side affordability check failed — pitch the subscription.
            this.paywallCost = cost;
            this.paywallDrawerOpen = true;
            return;
          }
          // Name the control the user actually pressed ("Start agent" reaches
          // this same path) and the reason the server gave, so a refusal is
          // diagnosable from the toast alone.
          const { title, text } = describeRedeemFailure(message, {
            startingAgent: fireAgent && !agentImplicit,
          });
          this.$notify({
            title,
            text,
            group: 'notify',
            type: 'error',
            duration: 4000,
          });
        })
        .finally(() => {
          pendingMutations.remove(pendingKey);
        });
    },
    async checkClick(task, { fireAgent = true, agentImplicit = true } = {}) {
      // Track task completion
      this.trackTaskEvent('complete', {
        id: task.id,
        name: task.name,
        time: task.time,
        points: task.points,
        ticked: true,
      });

      this.quickTaskDialog = false;
      // Passed tasks tick through the points redemption path — same modal
      // flow, same agent side effects, but paid with points.
      if (this.isRedeemable(task)) {
        this.redeemClick(task, { fireAgent, agentImplicit });
        return;
      }
      if (task.passed || task.wait || task.ticked) return;

      const pendingKey = `routine:${task.id}`;
      // Per-item coalescing — if a tick mutation for this task is
      // already in flight, ignore further taps. The tick is monotonic
      // (false → true) so there's nothing to "correct" on a second tap.
      if (pendingMutations.has(pendingKey)) return;
      pendingMutations.add(pendingKey);

      const tickedAt = Date.now();

      // Claim the tick locally the instant it is tapped. From here until the
      // server confirms, no query response may write `ticked` on this task —
      // including reads already on the wire, and including the routine read we
      // may be about to wait for below.
      guardFields('RoutineItem', task.id, { ticked: true });

      // `did` is the routine DOCUMENT id and only exists once the routineDate
      // query resolves; a mid-session midnight rollover briefly leaves it
      // holding YESTERDAY's id. Ticking with the wrong one lands on the wrong
      // day's document — the "new day: first check goes green but is not saved"
      // report. This used to refuse the tap and ask the user to try again,
      // which cost a tap on every new day. Now it waits for the id instead.
      let did = '';
      try {
        did = await this.ensureRoutineId();
      } catch (e) {
        did = '';
      }
      if (!did) {
        releaseEntity('RoutineItem', task.id);
        pendingMutations.remove(pendingKey);
        this.$notify({
          title: 'Error',
          text: "Couldn't load today's routine. Check your connection and try again.",
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
        return;
      }

      // Note: no longer mutate `task.ticked` directly. Vue reactivity
      // is now driven entirely by the Apollo cache, which Apollo updates
      // via the `optimisticResponse + update` pair below.
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
          variables: {
            id: did,
            taskId: task.id,
            ticked: true,
          },
          // Optimistic response synthesises the expected server payload so
          // smart queries re-render immediately — and Apollo prevents any
          // concurrent refetch from clobbering the optimistic state until
          // the real response arrives.
          optimisticResponse: {
            __typename: 'Mutation',
            tickRoutineItem: {
              __typename: 'Routine',
              id: did,
              // Build a synthetic tasklist that flips just this task to
              // ticked: true, and bumps its D-stimulus earned to its
              // points value (matches server logic).
              // __typename MUST match the cache's real types (RoutineItem /
              // StimuliItem). Writing the wrong typename (e.g. 'Task') mints
              // phantom `Task:<id>` entities that the routine tasklist then
              // references; when Apollo GCs them the routine reverts to its
              // base ticked:false — a green tick silently flips back to white.
              tasklist: (this.tasklist || []).map((t) => {
                if (t.id !== task.id) return { ...t, __typename: 'RoutineItem' };
                const stimuli = (t.stimuli || []).map((s) => {
                  if (s.name !== 'D') return { ...s, __typename: 'StimuliItem' };
                  return {
                    ...s,
                    __typename: 'StimuliItem',
                    earned: t.points || s.earned,
                  };
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
              // Never lose the tick. Write the flag straight onto the
              // normalized RoutineItem entity — this avoids re-reading the
              // whole routine query (which can throw on a partially-populated
              // cache) so a successful tick can't silently revert to white.
              try {
                cache.writeFragment({
                  id: `RoutineItem:${task.id}`,
                  fragment: gql`fragment TickedFlag on RoutineItem { ticked }`,
                  data: { __typename: 'RoutineItem', ticked: true },
                });
              } catch (e2) {
                updateRoutineTaskInCache(cache, {
                  date: this.date,
                  taskId: task.id,
                  ticked: true,
                });
              }
            }
          },
        })
        .then(() => {
          this.trackMutationPerformance('tickRoutineItem', {
            id: did,
            taskId: task.id,
            ticked: true,
          }, tickedAt);

          // Side effects driven by the *real* server response. The
          // earlier waterfall of `fetchRoutine + routineDate.refetch +
          // goals.refetch` is gone — Apollo's `update` callback already
          // wrote the canonical state and smart queries re-render off it.
          eventBus.$emit(EVENTS.ROUTINE_TICKED);

          // Trigger the agent's start event if one is assigned. The
          // {{goal_id}} substitution uses the first day-goal already
          // attached to this routine; it's a no-op when no goal yet
          // exists (Quick Goal Creation handles that path). Callers pass
          // fireAgent:false when they fire the event themselves (the
          // quick-goal flow fires with the freshly created goal id).
          // An optimistic temp id is not usable, but it is also not a reason to
          // give up: fireAgentWhenReady queues the dispatch behind the real id
          // and shows an "Agent waiting" badge meanwhile.
          //
          // agentImplicit (default): the user ticked a task, they didn't
          // press Start Agent — a failing event must not surface an
          // "Agent failed" state. Explicit Start Agent passes false.
          if (fireAgent) {
            this.fireAgentWhenReady(task.id, { implicit: agentImplicit });
          }
        })
        .catch(() => {
          // Apollo automatically rolls back the optimistic write on error.
          // Drop the guard too, or it would keep pinning `ticked: true` over
          // every incoming read until its TTL expired — showing a tick that was
          // never saved.
          releaseEntity('RoutineItem', task.id);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        })
        .finally(() => {
          pendingMutations.remove(pendingKey);
        });
    },
    /**
     * Resolve `did` (the routine document id for the viewed date), waiting for
     * it if the routineDate query is still in flight or the day has no routine
     * document yet.
     *
     * Interactions used to be refused during that window. They are now queued
     * instead — which is the whole point of removing the disable mechanism: the
     * user's tap is always accepted, and the plumbing catches up.
     */
    async ensureRoutineId() {
      if (this.did) return this.did;
      if (this.routineDate && this.routineDate.id) {
        this.did = this.routineDate.id;
        return this.did;
      }
      // Nothing on the wire and no id means this date has no routine document.
      // (When the query IS in flight, its update() already calls this on a null
      // result.) addNewDayRoutine memoizes per date, so a concurrent create is
      // reused rather than racing — the duplicate-document bug.
      const query = this.$apollo.queries.routineDate;
      if (!query || !query.loading) this.addNewDayRoutine();
      return this.waitForDid();
    },
    /**
     * Resolve once `did` becomes non-empty, or with '' after `timeoutMs`.
     * Watching the reactive field avoids depending on vue-apollo's SmartQuery
     * internals, and covers both paths that can set it (query update and
     * addNewDayRoutine's refetch).
     */
    waitForDid(timeoutMs = 8000) {
      if (this.did) return Promise.resolve(this.did);
      return new Promise((resolve) => {
        let settled = false;
        let unwatch = () => {};
        let timer = null;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          unwatch();
          if (timer) clearTimeout(timer);
          resolve(value);
        };
        unwatch = this.$watch('did', (value) => { if (value) finish(value); });
        timer = setTimeout(() => finish(this.did || ''), timeoutMs);
      });
    },
    async skipClick(nextValue) {
      // Persist the emitted switch value (fallback to current model value).
      const skipValue = typeof nextValue === 'boolean' ? nextValue : this.skipDay;

      // Wait for the routine id rather than bouncing the toggle back at the
      // user (see ensureRoutineId).
      let did = '';
      try {
        did = await this.ensureRoutineId();
      } catch (e) {
        did = '';
      }
      if (!did) {
        this.$routine.setSkipDay(!skipValue);
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
            mutation skipRoutine($id: ID!, $skip: Boolean!) {
              skipRoutine(id: $id, skip: $skip) {
                id
                skip
              }
            }
          `,
          variables: {
            id: did,
            skip: skipValue,
          },
          // Update Apollo cache with the mutation result
          update: (cache, { data: { skipRoutine } }) => {
            try {
              // Read the cached routine data
              const cachedData = cache.readQuery({
                query: ROUTINE_DATE_QUERY,
                variables: { date: this.date },
              });

              // Update the skip field in the cache
              if (cachedData && cachedData.routineDate) {
                cache.writeQuery({
                  query: ROUTINE_DATE_QUERY,
                  variables: { date: this.date },
                  data: {
                    routineDate: {
                      ...cachedData.routineDate,
                      skip: skipRoutine.skip,
                    },
                  },
                });
              }
            } catch (e) {
              // Cache might not exist yet, that's okay
              console.warn('Could not update Apollo cache for skip day:', e);
            }
          },
        })
        .catch((error) => {
          // Revert on error. skipRoutine refuses a skip once the week's quota
          // is spent ("You have already skip 2 days this week.") — behind the
          // generic text the switch just flips back on its own, which reads as
          // a dead control, so show what the server actually said.
          this.$routine.setSkipDay(!skipValue);
          const [gqlError] = (error && error.graphQLErrors) || [];
          this.$notify({
            title: 'Error',
            text: (gqlError && gqlError.message) || 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    passedTime(item) {
      // Guards, in order:
      //  - `did`: without the routine document id the mutation 500s.
      //  - pendingMutations: a tick for this task may be in flight. Reading
      //    `item.ticked` while it is would mark a task the user completed ON
      //    TIME as passed — permanently, server-side — which is the reported
      //    "routine shows missed even though I ticked in time".
      //  - `passedInFlight`: this runs from the `routineDate.tasklist` watcher,
      //    and passRoutineItem's own `update()` writes the cache, which re-fires
      //    that watcher. Unguarded, one app-open fired ~20 pass/wait mutations.
      if (!this.did) return;
      if (pendingMutations.has(`routine:${item.id}`)) return;
      if (!this.passedInFlight) this.passedInFlight = {};
      if (this.passedInFlight[item.id]) return;

      if (!item.ticked) {
        const timestamp = moment(item.time, 'HH:mm');
        const exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < -TIMES_UP_TIME && !item.passed) {
          // NOTE: no `item.passed = true` here. `item` is Apollo's normalized
          // RoutineItem result object — assigning to it edits the cache's own
          // memoized copy behind Apollo's back, so the store and what
          // components read drift apart. The optimistic/real response below is
          // the only thing allowed to change it.
          this.passedInFlight[item.id] = true;
          this.$apollo
            .mutate({
              mutation: gql`
                mutation passRoutineItem(
                  $id: ID!
                  $taskId: String!
                  $ticked: Boolean!
                  $passed: Boolean!
                ) {
                  passRoutineItem(id: $id, taskId: $taskId, ticked: $ticked, passed: $passed) {
                    id
                    tasklist {
                      id
                      name
                      ticked
                      passed
                      redeemed
                      passedPoints
                    }
                  }
                }
              `,
              variables: {
                id: this.did,
                taskId: item.id,
                ticked: item.ticked,
                passed: true,
              },
              // No `update` callback. The mutation returns RoutineItem entities
              // by id, so Apollo normalizes `passed`/`ticked` into every query
              // that holds them. The old callback both assigned to `item` (an
              // Apollo result object) and ran query-level cache surgery on top
              // — two extra writers for a fact the response already carries.
            })
            .catch(() => {
              this.$notify({
                title: 'Error',
                text: 'An unexpected error occured',
                group: 'notify',
                type: 'error',
                duration: 3000,
              });
            })
            .finally(() => {
              delete this.passedInFlight[item.id];
            });
        }
      }
    },
    waitTime(item) {
      // Same guards as passedTime — see the note there.
      if (!this.did) return;
      if (pendingMutations.has(`routine:${item.id}`)) return;
      if (!this.waitInFlight) this.waitInFlight = {};
      if (this.waitInFlight[item.id]) return;

      if (!item.ticked) {
        const timestamp = moment(item.time, 'HH:mm');
        const exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < PROACTIVE_START_TIME && item.wait) {
          this.waitInFlight[item.id] = true;
          this.$apollo
            .mutate({
              mutation: gql`
                mutation waitRoutineItem($id: ID!, $taskId: String!, $wait: Boolean!) {
                  waitRoutineItem(id: $id, taskId: $taskId, wait: $wait) {
                    id
                    tasklist {
                      id
                      name
                      wait
                    }
                  }
                }
              `,
              variables: {
                id: this.did,
                taskId: item.id,
                wait: false,
              },
              // The selection set now includes `id` on each task, so Apollo can
              // normalize the response into RoutineItem:<id> instead of storing
              // an unidentifiable list. That is what makes the manual cache
              // write unnecessary — and its absence is why `wait` used to
              // oscillate true/false/true across a burst of these mutations.
            })
            .catch(() => {
              this.$notify({
                title: 'Error',
                text: 'An unexpected error occured',
                group: 'notify',
                type: 'error',
                duration: 3000,
              });
            })
            .finally(() => {
              delete this.waitInFlight[item.id];
            });
        }
      }
    },
    setPassedWait() {
      Array.prototype.forEach.call(this.tasklist, (task) => {
        this.passedTime(task);
        this.waitTime(task);
      });
    },
    countTotal(stimulus = 'D') {
      const tasklist = this.tasklist || [];
      const aggregatePoints = tasklist.reduce((total, num) => {
        const currentStimulus = num.stimuli && num.stimuli.find((st) => st.name === stimulus);
        if (currentStimulus && currentStimulus.earned) {
          return total + currentStimulus.earned;
        }
        return total;
      }, 0);

      if (stimulus === 'G') {
        if (moment(this.date, 'DD-MM-YYYY').weekday() >= threshold.weekDays - 1) {
          if (weekOfMonth(this.date) >= threshold.monthWeeks - 1) {
            // TODO: Enable this later
            if (moment(this.date, 'DD-MM-YYYY').month() >= threshold.yearMonths - 1) {
              return aggregatePoints;
            }
            console.log('month', Number((aggregatePoints * 1.334).toFixed(1)));
            return Number((aggregatePoints * 1.334).toFixed(1));
          }
          console.log('week', aggregatePoints * 2);
          return aggregatePoints * 2;
        }

        console.log('week', aggregatePoints * 4);
        return aggregatePoints * 4;
      }
      return aggregatePoints;
    },
    adoptProgress() {
      const count = this.countTotal();
      if (count < 33) {
        return 'error';
      }
      if (count < 70) {
        return 'warning';
      }
      return 'success';
    },
    filterTaskGoals(id) {
      const taskGoalList = [];
      if (this.goals && this.goals.length) {
        this.goals.forEach((goal) => {
          const taskGoalItems = goal.goalItems.filter((goalItem) => goalItem.taskRef === id);
          if (taskGoalItems.length) {
            const newGoal = {
              id: goal.id,
              period: goal.period,
              date: goal.date,
              goalItems: taskGoalItems,
            };
            taskGoalList.push(newGoal);
          }
        });
      }
      return taskGoalList;
    },
    toggleGoalDisplayDialog(selectedGoalItem, bool) {
      if (selectedGoalItem) {
        this.selectedGoalItem = { ...selectedGoalItem };
      }
      this.goalDisplayDialog = bool;
      if (!bool) {
        this.$apollo.queries.goals.refetch();
        this.selectedGoalItem = { ...this.defaultGoalItem };
      }
    },
    countTaskPercentage(task) {
      if (!task || !task.stimuli || !Array.isArray(task.stimuli)) {
        return 0;
      }
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      if (!stimulus) {
        return 0;
      }
      const completed = 100 * (stimulus.earned / task.points);
      return isNaN(completed) ? 0 : completed;
    },
    countTaskCompleted(task) {
      if (!task || !task.id || !task.stimuli || !Array.isArray(task.stimuli)) {
        return 0;
      }
      const dStimulus = task.stimuli.find((st) => st.name === 'D');
      const kStimulus = task.stimuli.find((st) => st.name === 'K');
      if (!dStimulus || !kStimulus) {
        return 0;
      }
      const count = Number((dStimulus.splitRate / kStimulus.splitRate).toFixed(0));
      const completed = Number(
        (count * (Number(kStimulus.earned) / Number(task.points))).toFixed(0),
      );
      return isNaN(completed) ? 0 : completed;
    },
    countTaskTotal(task) {
      if (!task || !task.id || !task.stimuli || !Array.isArray(task.stimuli)) {
        return 0;
      }
      const dStimulus = task.stimuli.find((st) => st.name === 'D');
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      if (!dStimulus || !stimulus) {
        return 0;
      }
      const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
      return count;
    },

    /**
     * Handle day change event
     * @param {string} newDate - New date in DD-MM-YYYY format
     */
    async handleDayChange(newDate) {
      console.log('DashBoard: Day changed to', newDate);
      // Update both date and todayDate so isTodaySelected stays true
      this.todayDate = newDate;
      this.date = newDate;

      // Yesterday's agent badges must not carry into the new day.
      this.$agent.clearDayStatuses();

      await this.prepareNewDay(newDate);

      // Add new routine for the new day
      this.addNewDayRoutine();
    },

    /**
     * Throw away every client-side cache so the new day starts cold.
     *
     * Routine tasks reuse the same `_id` across days, so yesterday's normalized
     * RoutineItem/GoalItem entities are the *same* cache records today's queries
     * resolve to — and the persisted copy in IndexedDB carries them across a
     * close/reopen. Expiring the store wholesale at the boundary is both simpler
     * and stricter than trying to invalidate the right subset; `cache-and-network`
     * refills everything on the next paint.
     *
     * `isPreparingNewDay` drives a blocking overlay: this is the one moment the
     * dashboard genuinely has nothing valid to show, so the skeleton is honest
     * rather than a flash over usable data.
     */
    async prepareNewDay(newDate) {
      if (this.isPreparingNewDay) return;
      this.isPreparingNewDay = true;
      try {
        const result = await runNewDayReset(newDate);
        console.log('[DashBoard] New day prepared:', result.cleared.join(', ') || 'nothing to clear');
        if (result.errors.length) {
          console.warn('[DashBoard] New day reset had partial failures:', result.errors);
        }
        // The store is empty and `did` referred to yesterday's document.
        this.did = '';
        this.pendingRoutineCreates = {};
        this.routineFirstLoad = true;
        this.goalsFirstLoad = true;
        this.agendaFirstLoad = true;
      } catch (e) {
        console.warn('[DashBoard] New day reset failed:', e);
      } finally {
        this.isPreparingNewDay = false;
      }
    },

    /**
     * Handle routine item check for intelligent refresh
     */
    handleRoutineItemCheck() {
      // Only update passed/wait status if today is selected
      if (this.isTodaySelected) {
        this.setPassedWait();
      }

      // Get next routine item status
      const nextItem = this.getNextRoutineItem();
      if (nextItem && nextItem.isStartingSoon) {
        console.log(`Next routine item "${nextItem.name}" starts in ${nextItem.minutesToStart} minutes`);
      }
    },
  },
  computed: {
    // 'assigned' when the goal-action modal's task has an agent → shows
    // "Start Agent"; otherwise "Build Agent".
    goalActionAgentState() {
      if (!this.goalActionTask) return 'none';
      return this.$agent.getByTaskRef(this.goalActionTask.id) ? 'assigned' : 'none';
    },
    /**
     * Week goals filtered for the current task.
     * Consumed by the WeekGoalStreak organism and by the dashboard's
     * v-if on whether to render it at all.
     */
    weekGoalsForCurrentTask() {
      return this.currentTask && this.currentTask.id
        ? this.filterTaskGoalsPeriod(this.currentTask.id, this.displayGoals, 'week')
        : [];
    },
    currentAgentStatus() {
      const id = this.currentTask && this.currentTask.id;
      if (!id) return '';
      return this.effectiveAgentStatus(id);
    },
    agentEditRoutineOptions() {
      const tasklist = this.displayTasklist || [];
      return tasklist.map((t) => ({
        label: t.time ? `${t.time} — ${t.name}` : t.name,
        value: t.id,
      }));
    },
    /**
     * Upcoming routine tasks enriched with the display fields that
     * UpcomingPastTasks expects. Extraction moved these helpers up from
     * the template into a single map so the organism stays presentational.
     */
    upcomingTasksMeta() {
      return this.enrichTasksForUpcomingPast(this.filterUpcomingPastTask(0, this.displayTasklist));
    },
    pastTasksMeta() {
      return this.enrichTasksForUpcomingPast(this.filterUpcomingPastTask(1, this.displayTasklist));
    },
    /**
     * Skip day flag from store (computed with getter/setter for v-model)
     * Store is synced with Apollo data via the routineDate query update function
     */
    skipDay: {
      get() {
        return this.$routine.skipDay;
      },
      set(value) {
        this.$routine.setSkipDay(value);
      },
    },
    /**
     * Tasklist from Apollo routineDate (replaces store-based tasklist)
     * Apollo cache persistence handles offline caching
     */
    tasklist() {
      return this.routineDate?.tasklist || [];
    },
    /**
     * Whether to show the routine loading skeleton
     * Only show skeleton when:
     * - Apollo routine is loading AND
     * - It's the first load AND
     * - We don't have data yet
     */
    showRoutineSkeleton() {
      const isLoading = this.$apollo.queries.routineDate && this.$apollo.queries.routineDate.loading;
      const hasData = this.routineDate && this.routineDate.tasklist && this.routineDate.tasklist.length > 0;
      return isLoading && this.routineFirstLoad && !hasData;
    },
    /**
     * Tasklist to display - returns routine data from Apollo query
     * Apollo cache persistence handles offline caching via localforage
     */
    displayTasklist() {
      return this.routineDate?.tasklist || [];
    },
    /**
     * Whether to show the goals loading skeleton.
     *
     * Only when there is genuinely nothing to show — same rule as
     * showRoutineSkeleton. The `!hasData` clause is the important one: every
     * display query is `cache-and-network`, so on a warm cache vue-apollo emits
     * the cached goals FIRST and keeps `loading` true until the network answers.
     * Without this guard the skeleton replaced perfectly good cached goals for a
     * whole round trip on every cold open — a visible flicker on PWA/mobile,
     * where that round trip is slowest.
     *
     * It also un-disables the checkboxes: this same flag is passed down as
     * `passive`, which drives `:disabled` on every goal-item checkbox. Gating it
     * on "no data" rather than "loading" is what makes the load window
     * interactive (ARCHITECTURE.md §3 principle #7).
     */
    showGoalsSkeleton() {
      const isLoading = this.$apollo.queries.goals && this.$apollo.queries.goals.loading;
      const hasData = Array.isArray(this.goals) && this.goals.length > 0;
      return !!isLoading && this.goalsFirstLoad && !hasData;
    },
    /**
     * Same rule for the non-today agenda view. This one used to be bound
     * inline to a bare `agendaGoals.loading` with no first-load guard at all,
     * so EVERY refetch blanked the list to a loading card.
     */
    showAgendaSkeleton() {
      const isLoading = this.$apollo.queries.agendaGoals
        && this.$apollo.queries.agendaGoals.loading;
      const hasData = Array.isArray(this.agendaGoals) && this.agendaGoals.length > 0;
      return !!isLoading && this.agendaFirstLoad && !hasData;
    },
    /**
     * Goals to display - Apollo cache-and-network handles persistence and updates automatically.
     */
    displayGoals() {
      return this.goals || [];
    },
    /**
     * Total D stimulus score (computed for reactivity)
     */
    totalD() {
      return this.countTotal('D');
    },
    /**
     * Total K stimulus score (computed for reactivity)
     */
    totalK() {
      return this.countTotal('K');
    },
    /**
     * Total G stimulus score (computed for reactivity)
     */
    totalG() {
      return this.countTotal('G');
    },
    today() {
      return moment(this.date, 'DD-MM-YYYY').format('DD MMMM YYYY');
    },
    isTodaySelected() {
      return this.todayDate === this.date;
    },
    isFutureDateSelected() {
      return moment(this.date, 'DD-MM-YYYY').isAfter(moment(), 'day');
    },
    /**
     * Grouped goal items for non-today view.
     * Groups goals by routine task, showing the task name once per group.
     */
    nonTodayGoalItems() {
      if (!this.displayTasklist || !this.agendaGoals) return [];
      const groups = [];
      this.displayTasklist.forEach((task) => {
        const goals = this.filterTaskGoalsPeriod(
          task.id, this.agendaGoals, 'day',
        );
        if (goals.length) {
          groups.push({ taskId: task.id, taskName: task.name, goals });
        }
      });
      return groups;
    },
    todayGoalItemsGrouped() {
      if (!this.displayTasklist || !this.displayGoals) return [];
      const groups = [];
      this.displayTasklist.forEach((task) => {
        const goals = this.filterTaskGoalsPeriod(
          task.id, this.displayGoals, 'day',
        );
        if (goals.length) {
          groups.push({ taskId: task.id, taskName: task.name, goals });
        }
      });
      return groups;
    },
    currentTask() {
      // Use displayTasklist to show cached data while API loads
      const tasklistToUse = this.displayTasklist;
      if (Array.isArray(tasklistToUse) && tasklistToUse.length) {
        const currentActiveTask = tasklistToUse.find((task, idx) => {
          const taskTime = moment(task.time, 'HH:mm');
          const currentTime = this.now;
          const nextTask = tasklistToUse[idx + 1];
          const nextTimeString = nextTask ? nextTask.time : '23:59';
          const nextTime = moment(nextTimeString, 'HH:mm');
          const isTimeBeforeFirstTask = idx === 0 && currentTime.diff(taskTime, 'minutes') <= 0;
          if (isTimeBeforeFirstTask) {
            return isTimeBeforeFirstTask;
          }
          const isTimeGreaterThanTask = currentTime.diff(taskTime, 'minutes') >= 0;
          const isTimeLessThanNextTask = currentTime.diff(nextTime, 'minutes') <= -1;
          return isTimeGreaterThanTask && isTimeLessThanNextTask;
        });
        return currentActiveTask;
      }

      return {};
    },
  },
  // mounted() {
  //   this.timerId = setInterval(() => {
  //     if (this.date !== moment().format('DD-MM-YYYY')) {
  //       this.date = moment().format('DD-MM-YYYY');
  //     }
  //     this.setPassedWait();
  //   }, 60 * 1000);
  // },
};
</script>

<style scoped>
/* Mobile: task-goals full width */
@media (max-width: 600px) {
  .concentrated-view .active .v-list__tile--avatar {
    height: auto;
  }
  .concentrated-view .active .v-list__tile__content {
    overflow: visible;
    min-width: 0;
  }
  .concentrated-view .active .task-goals {
    height: auto;
    max-height: 300px;
    position: relative;
    z-index: 1;
    margin-left: -60px;
    width: calc(100% + 60px);
  }
}
</style>

<style scoped>
.dashboard-caching-card {
  background: #fff8e1 !important;
  border-left: 4px solid #ffc107;
}
.caching-label {
  font-size: 13px;
  color: #5d4037;
}
.caching-progress {
  border-radius: 3px;
}
.caching-counter {
  font-size: 11px;
}
.new-day-card {
  background: #e8f0fe !important;
  border-left: 4px solid #1a73e8;
}
.new-day-label {
  font-size: 13px;
  color: #174ea6;
}
</style>

<style>
.current-task {
  overflow: hidden;
}
.upcoming-past-card {
  overflow: hidden;
}
.current-task .active .v-list__tile--avatar:hover {
  background-color: #fff;
}
.v-timeline-item {
  padding-left: 16px;
  padding-right: 16px;
}
.routine-item .v-timeline-item {
  display: flex;
  border-bottom: 1px solid #ccc;
}

.routine-item .v-timeline-item ~ .v-timeline-item,
.routine-item .v-timeline-item ~ .timeline-item-list {
  display: none;
}

.routine-item .v-timeline-item.active ~ .v-timeline-item {
  display: flex;
}

.routine-item .v-timeline-item.active ~ .timeline-item-list {
  display: block;
}

.period-separator {
  border-bottom: 1px solid #ccc;
}

.v-timeline--dense:before {
  left: 34px !important;
}

.v-timeline--dense .v-timeline-item__dot {
  left: 16px !important;
}

.v-timeline--dense .v-timeline-item__dot--small {
  left: 23px !important;
}

.add-new .v-btn {
  margin-left: -15px;
  padding-left: 0;
  text-align: left;
}

.date-navigation {
  padding: 32px 32px 0 32px;
}

.date-navigation .date-today {
  height: 40px;
  padding-top: 10px;
  font-weight: bold;
}

.overlay-icon {
  position: absolute;
  font-size: 14px;
  padding: 2px 0 0 3px;
}
/* ======== */

.text-white {
  color: #fff;
}
.inline-goals {
  padding: 8px 16px;
}
.inline-goals summary {
  outline: none;
}
.inline-goals ul {
  list-style: none;
  padding-left: 4px;
}

.title-options {
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.title-options > .sub-header {
  flex: 12 !important;
}

.concentrated-view .active {
  background-color: #fff;
}

.concentrated-view .active .v-list__tile--avatar,
.concentrated-view .v-list__tile--avatar {
  transition: 0.35s;
}

.concentrated-view .active .v-list__tile--avatar {
  height: 300px;
}

.concentrated-view .active .circular-task {
  align-self: start;
}
.concentrated-view .active .v-list__tile__avatar {
  align-self: start;
}

/* TODO: Fix zoom problem */
.concentrated-view .active .v-list__tile .circular-task {
  min-width: 48px;
}

.concentrated-view .active .v-list__tile {
  padding-top: 16px;
  padding-bottom: 16px;
}
.concentrated-view .active .v-list__tile__avatar {
  justify-content: start;
}

.concentrated-view .v-list__tile {
  overflow: hidden;
}

.concentrated-view .v-list__tile__content {
  min-width: 0;
  overflow: hidden;
}

.concentrated-view .v-list__tile__title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.concentrated-view .active .v-list__tile__content {
  justify-content: start;
}

.concentrated-view .active .v-list__tile__title {
  font-size: 24px;
  height: 28px;
}

.concentrated-view .active .goal-list .v-list__tile__title {
  font-size: 10px;
}

.concentrated-view .v-list__tile__sub-title {
  display: flex;
  justify-content: space-between;
  align-content: center;
  padding: 4px 0;
}

.concentrated-view .v-list__tile__sub-title .time-text {
  align-self: center;
}

.concentrated-view .v-list__tile__sub-title .v-item-group {
  border: 1px solid #288bd5;
  border-radius: 20px;
  box-shadow: none;
  overflow: hidden;
}

.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn {
  height: 24px;
  border-radius: 0;
}
.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn:first-child {
  border-radius: 20px 0 0 20px;
}
.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn:last-child {
  border-radius: 0 20px 20px 0;
}
.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn__content {
  font-size: 10px;
  color: #000;
}

.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active {
  background-color: #288bd5;
}

.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active .v-btn__content {
  color: #fff;
}

.concentrated-view .task-goals {
  width: 100%;
  height: 240px;
  overflow-x: hidden;
  overflow-y: auto;
}
.concentrated-view .task-goals .v-list__tile {
  padding: 4px 0;
  height: 32px;
}
.concentrated-view .task-goals .v-input--selection-controls__ripple,
.concentrated-view .task-goals .v-list__tile__action .v-btn,
.concentrated-view .task-goals .v-list__tile__title {
  height: 24px;
}

.concentrated-view .task-goals .v-input--selection-controls__ripple {
  top: calc(50% - 19px);
}

.v-list__tile__side-title {
  color: rgba(0, 0, 0, 0.54);
  padding-left: 8px;
}
.concentrated-view .task-goals .v-list {
  background: transparent;
}
.concentrated-view .task-goals .v-list__tile__action {
  min-width: 36px;
}
.concentrated-view
  .task-goals
  .v-input--selection-controls:not(.v-input--hide-details)
  .v-input__slot {
  margin-bottom: 3px;
}
.concentrated-view .task-goals .v-list__tile__title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.concentrated-view .task-goals .v-chip {
  cursor: pointer;
  font-size: 11px;
  margin: 0 2px 0 0;
}
.concentrated-view .task-goals .no-goals-text {
  /* text-align: center; */
  display: block;
  padding: 20px 0 20px 36px;
  color: #777;
}
.concentrated-view .task-goals .v-alert.v-alert--outline {
  padding: 4px;
  font-size: 11px;
}
.concentrated-view .task-goals .add-new {
  border-top: 1px solid #ccc;
  padding-top: 8px;
}
.concentrated-view .task-goals .add-new .v-btn {
  padding: 0;
  margin: 0;
  text-align: left;
  color: rgba(0, 0, 0, 0.87);
  text-transform: initial;
  font-size: 14px;
  font-weight: 400;
}
.concentrated-view .task-goals .add-new .v-btn .v-icon {
  padding-right: 12px;
}
.concentrated-view .task-goals .add-new .v-btn .v-btn__content {
  justify-content: initial;
}
.skip-box {
  text-align: center;
  padding: 16px;
}
.skip-grid {
  display: grid;
  grid-template-columns: 30% 70%;
  gap: 16px;
  align-items: center;
  text-align: left;
}
.skip-grid-image img {
  max-width: 100%;
  width: auto;
  border-radius: 16px;
  display: block;
}
.skip-message {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.75);
}
.skip-agenda {
  margin-top: 24px;
  text-align: left;
}

.circular-task .v-avatar {
  margin: 0 auto;
}

.step-info {
  float: right;
  height: 24px;
  line-height: 0;
}

@media screen and (max-width: 600px) {
  .hidden-xs {
    display: none !important;
  }
}
.action-box {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* Skeleton loading styles */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-text {
  border-radius: 4px;
}

.skeleton-chip {
  border-radius: 16px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.agenda-day-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.agenda-day-item .v-list__tile__action {
  align-self: center;
}

.agenda-day-checkbox .v-input__slot {
  margin-bottom: 0;
}

.agenda-day-checkbox .v-input--selection-controls__ripple {
  margin: 0;
}

.agenda-day-item:last-child {
  border-bottom: none;
}

.agenda-day-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.agenda-item-completed {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
