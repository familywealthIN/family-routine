<template>
  <div>
      <container-box transparent="true" >
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
        :class="$vuetify.breakpoint.xsOnly ? 'mr-3 mb-1 ml-3 mt-2' : 'mr-3 mb-3 ml-3'"
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
            <atom-switch v-model="skipDay" label="Skip Day" @change="skipClick()" hide-details class="mt-0 pt-0"></atom-switch>
            <atom-button icon small @click="refreshData" :loading="isRefreshing" class="ml-2">
              <atom-icon color="rgba(0,0,0,0.57)" size="24">refresh</atom-icon>
            </atom-button>
          </div>
        </div>
      </div>
      <template v-if="skipDay">
        <div class="skip-box">
          <img src="/img/relax.jpg" />
          <h1>Relax, Detox and Enjoy the Day</h1>
        </div>
      </template>
      <template v-else>
        <atom-layout wrap>
          <atom-flex xs12 sm10 d-flex class="pl-3 pr-3">
            <div style="width:100%">
              <atom-card class="mb-3 pb-3 current-task">
                <atom-list
                  v-if="currentTask && currentTask.id"
                  class="concentrated-view elevation-0"
                >
                  <atom-list-tile
                    @click="updateSelectedTaskRef(currentTask.id)"
                    class="active"
                    avatar
                  >
                    <atom-progress-circular
                      :value="countTaskPercentage(currentTask)"
                      :size="48"
                      :rotate="-90"
                      class="mr-3 circular-task"
                      width="2"
                      color="warning"
                    >
                      <atom-list-tile-avatar>
                        <atom-button
                          fab
                          small
                          class="elevation-0"
                          :disabled="getButtonDisabled(currentTask)"
                          :color="getCurrentButtonColor(currentTask)"
                          @click="checkDialogClick($event, currentTask)"
                        >
                          <atom-icon>{{ getButtonIcon(currentTask) }}</atom-icon>
                        </atom-button>
                      </atom-list-tile-avatar>
                    </atom-progress-circular>
                    <atom-list-tile-content>
                      <atom-list-tile-title>
                        <span>{{ currentTask.name }}</span>
                        <div class="step-info" @click="toggleStepModal = true"><atom-icon>info</atom-icon></div>
                      </atom-list-tile-title>
                      <atom-list-tile-sub-title class="pt-2">
                        <div class="time-text">
                          {{ displayTime(currentTask.time) }} - {{ countTaskCompleted(currentTask) }}/{{ countTaskTotal(currentTask) }}
                        </div>
                        <div>
                          <atom-btn-toggle v-model="currentGoalPeriod" mandatory>
                            <atom-button flat value="day">
                              Today
                            </atom-button>
                            <atom-button flat value="week">
                              Week
                            </atom-button>
                            <atom-button flat value="month">
                              Month
                            </atom-button>
                            <atom-button flat value="year">
                              Year
                            </atom-button>
                          </atom-btn-toggle>
                        </div>
                      </atom-list-tile-sub-title>
                      <!-- Skeleton loading state for daily goals -->
                      <template v-if="showGoalsSkeleton">
                        <div class="pt-2 pb-2" style="width: 100%;">
                          <!-- Chip skeletons -->
                          <atom-layout class="mb-3" row wrap>
                            <atom-flex xs6>
                              <div class="skeleton skeleton-chip mr-2" style="width: 120px; height: 28px;"></div>
                            </atom-flex>
                            <atom-flex xs6>
                              <div class="skeleton skeleton-chip" style="width: 120px; height: 28px;"></div>
                            </atom-flex>
                          </atom-layout>
                            <!-- Title skeleton -->
                          <div class="skeleton skeleton-text mb-3" style="width: 60%; height: 20px;"></div>
                          <!-- Subtitle skeleton -->
                          <div class="skeleton skeleton-text mb-3" style="width: 40%; height: 16px;"></div>
                        </div>
                      </template>
                      <!-- Actual content when loaded -->
                      <div v-else class="pt-2 pb-2 task-goals">
                        <atom-layout
                          class="mb-3"
                          row
                          wrap
                          v-if="
                            filterTaskGoalsPeriod(currentTask.id, displayGoals, 'week').length &&
                              filterTaskGoalsPeriod(currentTask.id, displayGoals, 'month').length
                          "
                        >
                          <atom-flex xs12>
                            <atom-alert :value="true" color="success" icon="check_circle" outline>
                              You are all set.
                              Do daily milestones to complete weekly and monthly goals.
                            </atom-alert>
                          </atom-flex>
                        </atom-layout>
                        <atom-layout class="mb-3" row wrap v-else>
                          <atom-flex xs6 v-if="!filterTaskGoalsPeriod(currentTask.id, displayGoals, 'month').length">
                            <atom-chip small
                              @click="(currentGoalPeriod = 'month'), (goalDetailsDialog = true)"
                            >
                              <atom-avatar class="red text-white"><atom-icon>close</atom-icon></atom-avatar>
                              Set Month's Goal
                            </atom-chip>
                          </atom-flex>
                          <atom-flex xs6 v-if="filterTaskGoalsPeriod(currentTask.id, displayGoals, 'month').length">
                            <atom-chip small>
                              <atom-avatar class="success text-white"><atom-icon>check</atom-icon></atom-avatar>
                              Set Month's Goal
                            </atom-chip>
                          </atom-flex>
                          <atom-flex xs6 v-if="!filterTaskGoalsPeriod(currentTask.id, displayGoals, 'week').length">
                            <atom-chip small @click="(currentGoalPeriod = 'week'), (goalDetailsDialog = true)">
                              <atom-avatar class="red text-white"><atom-icon>close</atom-icon></atom-avatar>
                              Set Week's Goal
                            </atom-chip>
                          </atom-flex>
                          <atom-flex xs6 v-if="filterTaskGoalsPeriod(currentTask.id, displayGoals, 'week').length">
                            <atom-chip small>
                              <atom-avatar class="success text-white"><atom-icon>check</atom-icon></atom-avatar>
                              Set Week's Goal
                            </atom-chip>
                          </atom-flex>
                        </atom-layout>
                        <!-- Event execution timer alert -->
                        <atom-layout class="mb-3" row wrap v-if="eventExecutionInProgress">
                          <atom-flex xs12>
                            <atom-alert :value="true" color="info" icon="timer" outline>
                              <div class="d-flex align-center">
                                <div class="flex-grow-1">
                                  <div class="caption">Refreshing goals in {{ eventExecutionTimeLeft }} seconds...</div>
                                </div>
                                <div>
                                  <atom-progress-circular
                                    :value="((60 - eventExecutionTimeLeft) / 60) * 100"
                                    size="32"
                                    width="3"
                                    color="info"
                                  >
                                    {{ eventExecutionTimeLeft }}
                                  </atom-progress-circular>
                                </div>
                              </div>
                            </atom-alert>
                          </atom-flex>
                        </atom-layout>
                        <div v-if="filterTaskGoalsPeriod(currentTask.id, displayGoals, currentGoalPeriod).length">
                          <div
                            :key="taskGoals.id"
                            v-for="taskGoals in filterTaskGoalsPeriod(currentTask.id, displayGoals, currentGoalPeriod)"
                          >
                            <atom-list two-line subheader>
                              <goal-item-list
                                :key="`goal-${taskGoals.id}-${currentGoalPeriod}`"
                                :goal="taskGoals"
                                :progress="getWeekProgress(currentGoalPeriod, taskGoals)"
                                :passive="showGoalsSkeleton"
                                @delete-task-goal="deleteTaskGoal"
                                @refresh-task-goal="refreshTaskGoal"
                                @toggle-goal-display-dialog="toggleGoalDisplayDialog"
                                @complete-goal-item="completeGoalItem"
                                @complete-sub-task="completeSubTask"
                              />
                            </atom-list>
                          </div>
                        </div>
                        <small class="no-goals-text" v-else>
                          No goal or activity logged.
                        </small>
                      </div>
                    </atom-list-tile-content>
                  </atom-list-tile>
                </atom-list>
                <div v-else-if="!$apollo.queries.goals.loading">
                  <atom-card-text class="text-xs-center">
                    <p>No current items to display. Please go to Routine Settings and add routine items.</p>
                  </atom-card-text>
                </div>
              </atom-card>
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
                  filterTaskGoalsPeriod(currentTask.id, displayGoals, 'week').length > 0"
          >
            <atom-card>
              <atom-card-title>
                <b>Week Goal Streak</b>
              </atom-card-title>
              <div
                :key="weekGoal.id"
                v-for="weekGoal in filterTaskGoalsPeriod(currentTask.id, displayGoals, 'week')"
                class="pb-3 pl-3 pr-3"
              >
                <!-- Show each goal item in the week goal -->
                <div
                  v-for="(goalItem, index) in weekGoal.goalItems"
                  :key="goalItem.id"
                  class="mb-2"
                >
                  <div class="caption text--secondary" v-if="weekGoal.goalItems.length > 1">
                    Goal {{ index + 1 }} of {{ weekGoal.goalItems.length }}
                  </div>
                  <div class="body-1">{{ goalItem.body }}</div>
                  <streak-checks :progress="goalItem.progress || 0"></streak-checks>
                </div>

                <!-- Fallback for when no goal items exist -->
                <div v-if="!weekGoal.goalItems || weekGoal.goalItems.length === 0" class="mb-2">
                  <div class="body-1 text--secondary">No week goal items</div>
                  <streak-checks :progress="0"></streak-checks>
                </div>
              </div>
            </atom-card>
          </atom-flex>
          <atom-flex xs12 class="pl-3 pr-3 pb-3" d-flex>
            <atom-card>
              <atom-tabs
                v-model="tabs"
                right
              >
                <atom-tab>
                  Upcoming
                </atom-tab>
                <atom-tab>
                  Past
                </atom-tab>
              </atom-tabs>
              <atom-list
                subheader
                style="width:100%"
                v-if="filterUpcomingPastTask(tabs, displayTasklist) && filterUpcomingPastTask(tabs, displayTasklist).length > 0"
                class="concentrated-view elevation-0"
              >
                <div v-for="(task, index) in filterUpcomingPastTask(tabs, displayTasklist)" :key="`task-${task.id}`">
                  <atom-divider v-if="index != 0" :key="`divider-${task.id}`" :inset="task.inset"></atom-divider>
                  <atom-list-tile
                    :key="`tile-${task.id}`"
                    @click="updateSelectedTaskRef(task.id)"
                    :class="task.id === selectedTaskRef ? 'active' : ''"
                    avatar
                  >
                    <atom-progress-circular
                      :value="countTaskPercentage(task)"
                      :size="48"
                      :rotate="-90"
                      class="mr-3 circular-task"
                      width="2"
                      color="warning"
                    >
                      <atom-list-tile-avatar>
                        <atom-button
                          fab
                          small
                          class="elevation-0"
                          :disabled="getButtonDisabled(task)"
                          :color="getCurrentButtonColor(task)"
                          @click="checkDialogClick($event, task)"
                        >
                          <atom-icon>{{ getButtonIcon(task) }}</atom-icon>
                        </atom-button>
                      </atom-list-tile-avatar>
                    </atom-progress-circular>
                    <atom-list-tile-content>
                      <atom-list-tile-title>
                        <span>{{ task.name }}</span>
                      </atom-list-tile-title>
                      <atom-list-tile-sub-title v-if="task.id === selectedTaskRef">
                        <div class="time-text">
                          {{ displayTime(task.time) }} - {{ countTaskCompleted(task) }}/{{ countTaskTotal(task) }}
                        </div>
                        <div>
                          <atom-btn-toggle v-model="currentGoalPeriod" mandatory>
                            <atom-button flat value="day">
                              Today
                            </atom-button>
                            <atom-button flat value="week">
                              Week
                            </atom-button>
                            <atom-button flat value="month">
                              Month
                            </atom-button>
                            <atom-button flat value="year">
                              Year
                            </atom-button>
                          </atom-btn-toggle>
                        </div>
                      </atom-list-tile-sub-title>
                      <atom-list-tile-sub-title v-else>
                        {{ displayTime(task.time) }}
                      </atom-list-tile-sub-title>
                      <div v-if="task.id === selectedTaskRef" class="pt-2 pb-2 task-goals">
                        <atom-layout
                          class="mb-3"
                          row
                          wrap
                          v-if="
                            filterTaskGoalsPeriod(task.id, displayGoals, 'week').length &&
                              filterTaskGoalsPeriod(task.id, displayGoals, 'month').length
                          "
                        >
                          <atom-flex xs12>
                            <atom-alert :value="true" color="success" icon="check_circle" outline>
                              You are all set.
                              Do daily milestones to complete weekly and monthly goals.
                            </atom-alert>
                          </atom-flex>
                        </atom-layout>
                        <atom-layout class="mb-3" row wrap v-else>
                          <atom-flex xs6 v-if="!filterTaskGoalsPeriod(task.id, displayGoals, 'month').length">
                            <atom-chip small
                              @click="(currentGoalPeriod = 'month'), (goalDetailsDialog = true)"
                            >
                              <atom-avatar class="red text-white"><atom-icon>close</atom-icon></atom-avatar>
                              Set Month's Goal
                            </atom-chip>
                          </atom-flex>
                          <atom-flex xs6 v-if="filterTaskGoalsPeriod(task.id, displayGoals, 'month').length">
                            <atom-chip small>
                              <atom-avatar class="success text-white"><atom-icon>check</atom-icon></atom-avatar>
                              Set Month's Goal
                            </atom-chip>
                          </atom-flex>
                          <atom-flex xs6 v-if="!filterTaskGoalsPeriod(task.id, displayGoals, 'week').length">
                            <atom-chip small @click="(currentGoalPeriod = 'week'), (goalDetailsDialog = true)">
                              <atom-avatar class="red text-white"><atom-icon>close</atom-icon></atom-avatar>
                              Set Week's Goal
                            </atom-chip>
                          </atom-flex>
                          <atom-flex xs6 v-if="filterTaskGoalsPeriod(task.id, displayGoals, 'week').length">
                            <atom-chip small>
                              <atom-avatar class="success text-white"><atom-icon>check</atom-icon></atom-avatar>
                              Set Week's Goal
                            </atom-chip>
                          </atom-flex>
                        </atom-layout>
                        <div v-if="filterTaskGoalsPeriod(task.id, displayGoals, currentGoalPeriod).length">
                          <div
                            :key="taskGoals.id"
                            v-for="taskGoals in filterTaskGoalsPeriod(task.id, displayGoals, currentGoalPeriod)"
                          >
                            <atom-list two-line subheader>
                              <goal-item-list
                                :key="`goal-${taskGoals.id}-${currentGoalPeriod}-${task.id}`"
                                :goal="taskGoals"
                                :progress="getWeekProgress(currentGoalPeriod, taskGoals)"
                                :passive="showGoalsSkeleton"
                                @delete-task-goal="deleteTaskGoal"
                                @refresh-task-goal="refreshTaskGoal"
                                @toggle-goal-display-dialog="toggleGoalDisplayDialog"
                                @complete-goal-item="completeGoalItem"
                                @complete-sub-task="completeSubTask"
                              />
                            </atom-list>
                          </div>
                        </div>
                        <small class="no-goals-text" v-else>
                          No goal or activity logged.
                        </small>
                      </div>
                    </atom-list-tile-content>
                    <atom-list-tile-action v-if="task.id !== selectedTaskRef">
                      <atom-list-tile-action-text>
                        <b>{{ countTaskCompleted(task) }}</b
                        >/{{ countTaskTotal(task) }}
                      </atom-list-tile-action-text>
                      <atom-list-tile-action-text>tasks</atom-list-tile-action-text>
                    </atom-list-tile-action>
                  </atom-list-tile>
                </div>
              </atom-list>
              <div v-if="filterUpcomingPastTask(tabs, displayTasklist) && filterUpcomingPastTask(tabs, displayTasklist).length === 0">
                  <atom-card-text class="text-xs-center">
                    <p>No upcoming routine items.</p>
                  </atom-card-text>
              </div>
            </atom-card>
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
        <!-- Loading state -->
        <atom-card v-if="$apollo.queries.agendaGoals.loading" class="modern-card">
          <atom-card-text class="text-xs-center pa-5">
            <atom-progress-circular
              indeterminate
              color="primary"
              size="40"
              class="mb-3"
            ></atom-progress-circular>
            <p class="mb-0">Loading day tasks...</p>
          </atom-card-text>
        </atom-card>

        <template v-else-if="nonTodayGoalItems.length">
          <div v-for="group in nonTodayGoalItems" :key="group.taskId">
            <atom-subheader class="caption text--primary">
              {{ group.taskName }}
            </atom-subheader>
            <div
              v-for="taskGoals in group.goals"
              :key="taskGoals.id"
            >
              <atom-list two-line subheader>
                <goal-item-list
                  :key="`agenda-goal-${taskGoals.id}-${taskGoals.period}`"
                  :goal="taskGoals"
                  :edit-mode="true"
                  @delete-task-goal="deleteAgendaGoalFromList"
                  @refresh-task-goal="refreshAgendaGoals"
                  @toggle-goal-display-dialog="toggleGoalDisplayDialog"
                  @complete-goal-item="completeAgendaGoalItem"
                  @complete-sub-task="completeAgendaSubTask"
                />
              </atom-list>
            </div>
          </div>
        </template>

        <atom-card v-else class="modern-card">
          <atom-card-text class="text-xs-center">
            <p>No Day Tasks</p>
          </atom-card-text>
        </atom-card>
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
            :goals="displayGoals"
            :date="date"
            period="day"
            :tasklist="displayTasklist"
            :selectedTaskRef="selectedTaskRef"
            @start-quick-goal-task="checkClick"
          />
        </atom-card-text>
      </atom-card>
    </atom-dialog>
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

        <atom-card-text v-if="currentTask && currentTask.steps">
          <ul>
            <li v-for="step in currentTask.steps" v-bind:key="step.name">{{ step.name }}</li>
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

import { TIMES_UP_TIME, PROACTIVE_START_TIME, ONBOARDING_COMPLETE } from '../constants/settings';
import { defaultGoalItem } from '../constants/goals';
import eventBus, { EVENTS } from '../utils/eventBus';
import { MeasurementMixin } from '../utils/measurementMixins';
import {
  AGENDA_GOALS_QUERY,
  DAILY_GOALS_QUERY,
  ROUTINE_DATE_QUERY,
} from '../composables/graphql/queries';
import {
  updateRoutineTaskInCache,
} from '../composables/useApolloCacheUpdates';

import GoalList from '../containers/GoalListContainer.vue';
import GoalItemList from '../components/organisms/GoalItemList/GoalItemList.vue';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';
import { stepupMilestonePeriodDate, threshold } from '../utils/getDates';
import QuickGoalCreation from '../containers/QuickGoalCreationContainer.vue';
import StreakChecks from '../components/molecules/StreakChecks/StreakChecks.vue';
import GoalCreation from '../containers/GoalCreationContainer.vue';
import WakeCheck from '../components/atoms/WakeCheck/WakeCheck.vue';
import WeekdaySelectorContainer from '../containers/WeekdaySelectorContainer.vue';
import intelligentRefreshMixin from '../mixins/intelligentRefreshMixin';
import { TimeFormatMixin } from '../utils/timeFormat';
import { initDashboardCaching } from '../composables/useDashboardCaching';

import {
  AtomAlert,
  AtomAvatar,
  AtomBtnToggle,
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomChip,
  AtomDialog,
  AtomDivider,
  AtomFabTransition,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileActionText,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomProgressCircular,
  AtomProgressLinear,
  AtomSpacer,
  AtomSubheader,
  AtomSwitch,
  AtomTab,
  AtomTabs,
  AtomToolbar,
  AtomToolbarTitle,
} from '../components/atoms';

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
    GoalItemList,
    ContainerBox,
    QuickGoalCreation,
    StreakChecks,
    GoalCreation,
    WakeCheck,
    WeekdaySelectorContainer,
    AtomAlert,
    AtomAvatar,
    AtomBtnToggle,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomChip,
    AtomDialog,
    AtomDivider,
    AtomFabTransition,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileActionText,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomProgressCircular,
    AtomProgressLinear,
    AtomSpacer,
    AtomSubheader,
    AtomSwitch,
    AtomTab,
    AtomTabs,
    AtomToolbar,
    AtomToolbarTitle,
  },
  apollo: {
    // Routine data query - Apollo cache persistence handles offline caching
    routineDate: {
      query: ROUTINE_DATE_QUERY,
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
    goals: {
      query: DAILY_GOALS_QUERY,
      skip() {
        // Skip query if user is not authenticated
        return !this.$root.$data.email;
      },
      update(data) {
        // Mark first load as complete
        this.goalsFirstLoad = false;

        return data.dailyGoals;
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
      // Event execution timer system
      eventExecutionTimer: null,
      eventExecutionTimeLeft: 0,
      eventExecutionInProgress: false,
      // Track executed events to prevent multiple executions
      executedStartEvents: new Set(),
      executedEndEvents: new Set(),
      // Track first load for skeleton display
      goalsFirstLoad: true,
      // Track first load for routine skeleton display
      routineFirstLoad: true,
      // Queue for events waiting for goal IDs per routine item
      pendingEvents: [],
      // Track created goal IDs per routine item for placeholder replacement
      routineGoalIds: {}, // { routineItemId: goalId }
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
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        // Apollo automatically refetches routineDate when date changes
        const date = moment(this.date, 'DD-MM-YYYY');
        const todayDate = moment(new Date(), 'DD-MM-YYYY');
        this.isEditable = moment(date).isSameOrAfter(todayDate, 'day');

        // Reset executed events when date changes
        this.executedStartEvents.clear();
        this.executedEndEvents.clear();
        // Reset goal IDs and pending events for new date
        this.routineGoalIds = {};
        this.pendingEvents = [];
        console.log('DashBoard: Reset executed events, routine goal IDs, and pending events for new date:', newVal);
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
      handler(newTask, oldTask) {
        // Update the global current task store with the current task
        this.$currentTask.setCurrentTask(newTask || {});
        if (newTask && oldTask && newTask.id && oldTask.id && newTask.endEvent) {
          console.log('DashBoard: Current task changed:', newTask, oldTask);
          const isComplete = this.countTaskCompleted(newTask) >= this.countTaskTotal(newTask);
          const isOldComplete = this.countTaskCompleted(oldTask) >= this.countTaskTotal(oldTask);

          // Execute endEvent if task is complete and endEvent hasn't been executed yet
          // Use just task.id as key to match checkEventExecutionForTask which adds task.id to the Set
          if (isComplete && !isOldComplete && !this.executedEndEvents.has(newTask.id)) {
            this.checkEventExecutionForTask(newTask.id, 'K');
          }
        }
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

    // Listen for dashboard caching progress
    eventBus.$on(EVENTS.DASHBOARD_CACHING_STATUS, this.handleDashboardCachingStatus);

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
    eventBus.$off(EVENTS.DASHBOARD_CACHING_STATUS, this.handleDashboardCachingStatus);

    // Clean up timer
    this.stopEventExecutionTimer();

    // Clean up intelligent refresh timer
    this.stopIntelligentRefresh();

    // Clean up current task auto-update timer
    if (this.currentTaskTimerId) {
      clearInterval(this.currentTaskTimerId);
      this.currentTaskTimerId = null;
    }
  },
  methods: {
    // Start dashboard caching for area/project tags
    startDashboardCaching() {
      if (this.$root.$data.email) {
        initDashboardCaching(this);
      }
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
        id, taskId, period, date, isComplete, onSuccess, onError,
      } = payload;

      this.$goals.completeSubTaskItem({
        id, taskId, period, date, isComplete, dayDate: this.date,
      })
        .then((result) => {
          if (onSuccess) onSuccess(result);
        })
        .catch(() => {
          if (onError) onError();
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

    handleGoalItemCreated(eventData) {
      console.log('DashBoard: Handling goal item created event', eventData);

      if (eventData && eventData.goalId && eventData.taskRef) {
        // Store the goal ID for the specific routine item
        this.routineGoalIds[eventData.taskRef] = eventData.goalId;
        console.log('DashBoard: Stored goal ID for routine item:', eventData.taskRef, '→', eventData.goalId);

        // Clean up old routine goal IDs to prevent memory buildup
        this.cleanupOldRoutineGoalIds();

        // Process any pending events that were waiting for this routine's goal ID
        this.processPendingEvents(eventData.taskRef);
      }

      // Refetch daily goals to reflect the new goal item
      this.refetchDailyGoals();
    },
    processPendingEvents(routineItemId = null) {
      if (this.pendingEvents.length === 0) {
        console.log('DashBoard: No pending events to process');
        return;
      }

      // Filter events to process - either for specific routine item or all if no ID provided
      const eventsToProcess = routineItemId
        ? this.pendingEvents.filter((event) => event.routineItemId === routineItemId)
        : this.pendingEvents.filter((event) => !event.routineItemId || this.routineGoalIds[event.routineItemId]);

      if (eventsToProcess.length === 0) {
        console.log(`DashBoard: No matching pending events to process for routine ${routineItemId || 'any'}`);
        return;
      }

      console.log(`DashBoard: Processing ${eventsToProcess.length} pending events for routine ${routineItemId || 'any'}`);

      // Remove processed events from pending array
      this.pendingEvents = this.pendingEvents.filter((event) => !eventsToProcess.includes(event));

      // Execute each pending event
      eventsToProcess.forEach((event) => {
        console.log(`DashBoard: Executing queued ${event.eventType} event for routine ${event.routineItemId}`);
        this.executeEvent(event.eventCommand, event.eventType, event.routineItemId);
      });
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

    // Routine goal ID management methods
    cleanupOldRoutineGoalIds() {
      // Keep only the last 20 routine goal IDs to prevent memory buildup
      const goalIdEntries = Object.entries(this.routineGoalIds);
      if (goalIdEntries.length > 20) {
        // Sort by goal ID (assuming newer goal IDs are higher) and keep the latest 20
        const sortedEntries = goalIdEntries.sort((a, b) => b[1].localeCompare(a[1]));
        this.routineGoalIds = Object.fromEntries(sortedEntries.slice(0, 20));
        console.log('DashBoard: Cleaned up old routine goal IDs, keeping latest 20');
      }
    },

    // Event execution methods
    async executeEvent(eventCommand, eventType = 'unknown', routineItemId = null) {
      if (!eventCommand || typeof eventCommand !== 'string') {
        console.log(`DashBoard: No ${eventType} event to execute`);
        return;
      }

      console.log(`DashBoard: Executing ${eventType} event for routine ${routineItemId}:`, eventCommand);

      // Check if event contains {{goal_id}} placeholder
      if (eventCommand.includes('{{goal_id}}')) {
        console.log('DashBoard: Event contains {{goal_id}} placeholder, checking for available goal ID');

        // If routine item ID is provided and we have a goal ID for it, replace the placeholder
        if (routineItemId && this.routineGoalIds[routineItemId]) {
          const goalId = this.routineGoalIds[routineItemId];
          const updatedCommand = eventCommand.replace(/\{\{goal_id\}\}/g, goalId);
          console.log(`DashBoard: Replacing {{goal_id}} with ${goalId} for routine ${routineItemId}:`, updatedCommand);

          // Execute the updated command
          this.executeEvent(updatedCommand, eventType, routineItemId);
          return;
        }

        // Queue the event for later execution when goal ID becomes available
        console.log(`DashBoard: No goal ID available for routine ${routineItemId}, queuing event for later execution`);
        this.pendingEvents.push({ eventCommand, eventType, routineItemId });

        this.$notify({
          title: 'Event Queued',
          text: `${eventType} event queued until goal is created for routine`,
          group: 'notify',
          type: 'info',
          duration: 3000,
        });
        return;
      }

      // Check if event starts with 'curl'
      if (eventCommand.toLowerCase().startsWith('curl')) {
        try {
          // Execute curl command without waiting
          console.log(`DashBoard: Executing curl command: ${eventCommand}`);
          this.$curl.execute(eventCommand)
            .then((result) => {
              console.log(`DashBoard: Curl ${eventType} event executed successfully:`, result);
            })
            .catch((error) => {
              console.error(`DashBoard: Error executing curl ${eventType} event:`, error);
              this.$notify({
                title: 'Event Execution Error',
                text: `Failed to execute ${eventType} event: ${error.message}`,
                group: 'notify',
                type: 'error',
                duration: 5000,
              });
            });

          // Start 1-minute timer for goal refetch
          this.startEventExecutionTimer();
        } catch (error) {
          console.error(`DashBoard: Error executing curl ${eventType} event:`, error);
          this.$notify({
            title: 'Event Execution Error',
            text: `Failed to execute ${eventType} event: ${error.message}`,
            group: 'notify',
            type: 'error',
            duration: 5000,
          });
        }
      } else if (eventCommand.match(/^https?:\/\/.+/)) { // Check if it's a URL (starts with http:// or https://)
        window.open(eventCommand, '_blank');
      } else if (eventCommand.toLowerCase().startsWith('notify:')) {
        const message = eventCommand.substring(7).trim();
        this.$notify({
          title: `${eventType}`,
          text: message,
          group: 'notify',
          type: 'success',
          duration: 5000,
        });
        console.log(`${eventType} executed`);
      } else if (eventCommand.toLowerCase().startsWith('log:')) {
        const message = eventCommand.substring(4).trim();
        console.log(`${eventType} for ${message}`);
      } else {
        console.log(`DashBoard: Event command does not start with 'curl', skipping: ${eventCommand}`);
      }
    },

    startEventExecutionTimer() {
      // Clear any existing timer
      if (this.eventExecutionTimer) {
        clearInterval(this.eventExecutionTimer);
      }

      // Set initial state
      this.eventExecutionInProgress = true;
      this.eventExecutionTimeLeft = 60; // 1 minute

      console.log('DashBoard: Starting 60-second countdown timer for goal refetch');

      // Start countdown timer
      this.eventExecutionTimer = setInterval(() => {
        this.eventExecutionTimeLeft -= 1;

        if (this.eventExecutionTimeLeft <= 0) {
          // Timer finished - refetch goals and cleanup
          console.log('DashBoard: Timer finished, refetching daily goals');
          this.stopEventExecutionTimer();
          this.refetchDailyGoals();
        }
      }, 1000);
    },

    stopEventExecutionTimer() {
      if (this.eventExecutionTimer) {
        clearInterval(this.eventExecutionTimer);
        this.eventExecutionTimer = null;
      }
      this.eventExecutionInProgress = false;
      this.eventExecutionTimeLeft = 0;
      console.log('DashBoard: Event execution timer stopped');
    },

    // Check event execution for a specific task (used after user interactions)
    // freshTasklist: optional array from refetch result to avoid stale Apollo cache
    checkEventExecutionForTask(taskId, stimulusName, freshTasklist) {
      // Use fresh tasklist from refetch if provided, otherwise fall back to displayTasklist
      const tasklist = freshTasklist || this.displayTasklist;
      const task = tasklist.find((t) => t.id === taskId);

      if (!task || !task.stimuli || !Array.isArray(task.stimuli)) {
        console.log(`DashBoard: No task or stimuli found for taskId ${taskId}`);
        return;
      }

      // Find D and K stimuli
      const dStimulus = task.stimuli.find((s) => s.name === 'D');
      const kStimulus = task.stimuli.find((s) => s.name === 'K');

      if (!dStimulus || !kStimulus) {
        console.log(`DashBoard: Missing stimuli for task ${task.name}. `
          + `D stimulus: ${dStimulus ? 'found' : 'missing'}, K stimulus: ${kStimulus ? 'found' : 'missing'}`);
        return;
      }

      console.log(`DashBoard: Checking events for task ${task.name}:`);
      console.log(`  - Task points: ${task.points}`);
      console.log(`  - Task ticked: ${task.ticked}`);
      console.log(`  - D stimulus earned: ${dStimulus.earned}`);
      console.log(`  - K stimulus earned: ${kStimulus.earned}`);
      console.log(`  - D stimulus splitRate: ${dStimulus.splitRate}`);
      console.log(`  - K stimulus splitRate: ${kStimulus.splitRate}`);
      console.log(`  - StartEvent: ${task.startEvent || 'none'}`);
      console.log(`  - EndEvent: ${task.endEvent || 'none'}`);
      console.log(`  - StartEvent already executed: ${this.executedStartEvents.has(task.id)}`);
      console.log(`  - EndEvent already executed: ${this.executedEndEvents.has(task.id)}`);

      // Calculate correct target values for each stimulus
      const dTarget = task.points; // D stimulus target is task.points
      const kCount = Number((dStimulus.splitRate / kStimulus.splitRate).toFixed(0));
      const kTarget = task.points / kCount; // K stimulus target is task.points/count

      console.log(`  - D target value: ${dTarget}`);
      console.log(`  - K target value: ${kTarget} (task.points ${task.points} / count ${kCount})`);
      console.log(`  - D condition: ${dStimulus.earned} === ${dTarget} = ${dStimulus.earned === dTarget}`);
      console.log(`  - K condition: ${kStimulus.earned} === ${kTarget} = ${kStimulus.earned === kTarget}`);

      // Check startEvent condition: D stimulus earned = D target
      if (task.startEvent
          && dStimulus.earned === dTarget
          && !this.executedStartEvents.has(task.id) && stimulusName === 'D') {
        console.log(`DashBoard: ✅ StartEvent condition met for task ${task.name}: D earned (${dStimulus.earned}) = D target (${dTarget})`);
        this.executeEvent(task.startEvent, 'startEvent', task.id);
        this.executedStartEvents.add(task.id);
      } else if (task.startEvent) {
        console.log(`DashBoard: ❌ StartEvent condition NOT met for task ${task.name}:`);
        console.log(`  - D earned (${dStimulus.earned}) === D target (${dTarget}): ${dStimulus.earned === dTarget}`);
        console.log(`  - Already executed: ${this.executedStartEvents.has(task.id)}`);
      }

      // Check endEvent condition: K stimulus earned = K target
      if (task.endEvent
          && kStimulus.earned === kTarget
          && !this.executedEndEvents.has(task.id) && stimulusName === 'K') {
        console.log(`DashBoard: ✅ EndEvent condition met for task ${task.name}: K earned (${kStimulus.earned}) = K target (${kTarget})`);
        this.executeEvent(task.endEvent, 'endEvent', task.id);
        this.executedEndEvents.add(task.id);
      } else if (task.endEvent) {
        console.log(`DashBoard: ❌ EndEvent condition NOT met for task ${task.name}:`);
        console.log(`  - K earned (${kStimulus.earned}) === K target (${kTarget}): ${kStimulus.earned === kTarget}`);
        console.log(`  - Already executed: ${this.executedEndEvents.has(task.id)}`);
      } else {
        console.log(`DashBoard: No endEvent configured for task ${task.name}`);
      }
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
          return 'error';
        }
      }
      return 'grey';
    },
    getCurrentButtonColor(task) {
      if (task.ticked) {
        return 'success';
      }
      if (task.passed) {
        return 'error';
      }
      return '';
    },
    getButtonIcon(task) {
      if (task) {
        if (task.ticked) {
          return 'check';
        }
        if (task.passed && !task.ticked) {
          return 'close';
        }
        if (!task.passed && !task.ticked && !task.wait) {
          return 'alarm';
        }
      }
      return 'more_horiz';
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
    addNewDayRoutine() {
      this.$routine.addRoutine(this.date)
        .then(() => this.$routine.fetchRoutine(this.date, { useCache: false }))
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
        });
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

      this.$goals.completeGoalItem({
        id, period, date, taskRef, isComplete, isMilestone, dayDate: this.date,
      })
        .then(() => {
          if (onSuccess) onSuccess();
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
        id, taskId, period, date, isComplete, onSuccess, onError,
      } = payload;

      this.$goals.completeSubTaskItem({
        id, taskId, period, date, isComplete, dayDate: this.date,
      })
        .then((result) => {
          if (onSuccess) onSuccess(result);
        })
        .catch(() => {
          if (onError) onError();
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occurred while updating subtask',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    refreshTaskGoal(taskRef) {
      this.$routine.fetchRoutine(this.date, { useCache: false });
      this.$apollo.queries.goals.refetch();
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

      if (!task.passed && !task.wait && !task.ticked) {
        if (this.filterTaskGoalsPeriod(task.id, this.displayGoals, 'day').length) {
          this.checkClick(task);
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
    checkClick(task) {
      // Track task completion
      this.trackTaskEvent('complete', {
        id: task.id,
        name: task.name,
        time: task.time,
        points: task.points,
        ticked: true,
      });

      this.quickTaskDialog = false;
      if (!task.passed && !task.wait && !task.ticked) {
        task.ticked = true;

        const mutationStartTime = Date.now();
        this.$apollo
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
                    stimuli {
                      name
                      splitRate
                      earned
                    }
                  }
                }
              }
            `,
            variables: {
              id: this.did,
              taskId: task.id,
              ticked: task.ticked,
            },
          })
          .then(() => {
            // Track mutation performance
            this.trackMutationPerformance('tickRoutineItem', {
              id: this.did,
              taskId: task.id,
              ticked: task.ticked,
            }, mutationStartTime);

            // Update Apollo cache immediately for instant UI update
            updateRoutineTaskInCache(
              this.$apollo.provider.defaultClient,
              {
                date: this.date,
                taskId: task.id,
                ticked: task.ticked,
              },
            );

            return this.$routine.fetchRoutine(this.date, { useCache: false });
          })
          // Refetch Apollo routineDate query (includes stimuli) before checking events
          .then(() => this.$apollo.queries.routineDate.refetch())
          .then((result) => {
            // Check for event execution using fresh refetch data to avoid stale cache
            console.log('DashBoard: Tasklist refetch completed, checking events for task:', task.id);
            const freshTasklist = result?.data?.routineDate?.tasklist;
            this.checkEventExecutionForTask(task.id, 'D', freshTasklist);
            this.checkEventExecutionForTask(task.id, 'K', freshTasklist);
            return this.$apollo.queries.goals.refetch();
          })
          .catch(() => {
            task.ticked = false;
            this.$notify({
              title: 'Error',
              text: 'An unexpected error occured',
              group: 'notify',
              type: 'error',
              duration: 3000,
            });
          });
      }
    },
    skipClick() {
      // v-model already set the value via computed setter
      // Just persist to server
      const skipValue = this.skipDay;

      this.$apollo
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
            id: this.did,
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
        .catch(() => {
          // Revert on error
          this.$routine.setSkipDay(!skipValue);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    passedTime(item) {
      if (!item.ticked) {
        const timestamp = moment(item.time, 'HH:mm');
        const exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < -TIMES_UP_TIME && !item.passed) {
          item.passed = true;
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
                    }
                  }
                }
              `,
              variables: {
                id: this.did,
                taskId: item.id,
                ticked: item.ticked,
                passed: item.passed,
              },
              update: (store, { data: { passRoutineItem } }) => {
                if (passRoutineItem.tasklist) {
                  const currentTask = passRoutineItem.tasklist.find((task) => task.id === item.id);
                  if (currentTask.ticked) {
                    item.passed = false;
                    item.ticked = true;
                  }
                }

                // Update Apollo cache for instant UI update
                updateRoutineTaskInCache(
                  this.$apollo.provider.defaultClient,
                  {
                    date: this.date,
                    taskId: item.id,
                    passed: item.passed,
                  },
                );
              },
            })
            .catch(() => {
              item.passed = false;
              this.$notify({
                title: 'Error',
                text: 'An unexpected error occured',
                group: 'notify',
                type: 'error',
                duration: 3000,
              });
            });
        }
      }
    },
    waitTime(item) {
      if (!item.ticked) {
        const timestamp = moment(item.time, 'HH:mm');
        const exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < PROACTIVE_START_TIME && item.wait) {
          item.wait = false;
          this.$apollo
            .mutate({
              mutation: gql`
                mutation waitRoutineItem($id: ID!, $taskId: String!, $wait: Boolean!) {
                  waitRoutineItem(id: $id, taskId: $taskId, wait: $wait) {
                    id
                    tasklist {
                      name
                      wait
                    }
                  }
                }
              `,
              variables: {
                id: this.did,
                taskId: item.id,
                wait: item.wait,
              },
              update: () => {
                // Update Apollo cache for instant UI update
                updateRoutineTaskInCache(
                  this.$apollo.provider.defaultClient,
                  {
                    date: this.date,
                    taskId: item.id,
                    wait: item.wait,
                  },
                );
              },
            })
            .catch(() => {
              item.wait = false;
              this.$notify({
                title: 'Error',
                text: 'An unexpected error occured',
                group: 'notify',
                type: 'error',
                duration: 3000,
              });
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
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      if (!dStimulus || !stimulus) {
        return 0;
      }
      const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
      const completed = Number(
        (count * (Number(stimulus.earned) / Number(task.points))).toFixed(0),
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
    handleDayChange(newDate) {
      console.log('DashBoard: Day changed to', newDate);
      this.date = newDate;

      // Add new routine if needed
      this.addNewDayRoutine();
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
     * Whether to show the goals loading skeleton
     * Only show skeleton when:
     * - Apollo is loading AND
     * - It's the first load
     */
    showGoalsSkeleton() {
      const isLoading = this.$apollo.queries.goals && this.$apollo.queries.goals.loading;
      return isLoading && this.goalsFirstLoad;
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
</style>

<style>
.current-task {
  overflow: hidden;
}
.current-task .active .v-list__tile--avatar:hover {
  background-color: #fff;
}
.v-timeline-item {
  padding-left: 16px;
  padding-right: 16px;
}
.routine-item.v-timeline-item {
  display: flex;
  border-bottom: 1px solid #ccc;
}

.routine-item.v-timeline-item ~ .v-timeline-item,
.routine-item.v-timeline-item ~ .timeline-item-list {
  display: none;
}

.routine-item.v-timeline-item.active ~ .v-timeline-item {
  display: flex;
}

.routine-item.v-timeline-item.active ~ .timeline-item-list {
  display: block;
}

.routine-item {
  background-color: aqua;
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
  background-color: antiquewhite;
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

.concentrated-view .active .circular-task,
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
  padding: 32px 16px;
}
.skip-box img {
  max-width: 100%;
  width: auto;
  border-radius: 16px;
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
</style>
