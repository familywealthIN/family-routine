<template>
  <container-box transparent="true" :isLoading="isLoading">
    <v-card class="ma-3">
      <div class="weekdays pt-2 pb-2">
        <div
          v-for="(weekDay, i) in weekDays"
          :key="weekDay.day"
          @click="setDate(i)"
          :class="`day ${weekDay.isActive ? 'active' : ''}`"
        >
          <div>{{ weekDay.day }}</div>
          <div>{{ weekDay.dayNumber }}</div>
        </div>
      </div>
    </v-card>
    <div v-if="isTodaySelected">
      <div class="d-flex pr-3 pl-3 title-options">
        <h2>
          {{ this.today }}
        </h2>
        <div class="action-box">
          <div><wake-check></wake-check></div>
          <div><v-switch v-model="skipDay" label="Skip Day" @change="skipClick()"></v-switch></div>
        </div>
      </div>
      <template v-if="skipDay">
        <div class="skip-box">
          <img src="/img/relax.jpg" />
          <h1>Relax, Detox and Enjoy the Day</h1>
        </div>
      </template>
      <template v-else>
        <v-layout wrap>
          <v-flex xs12 sm10 d-flex class="pl-3 pr-3">
            <div style="width:100%">
              <v-card class="mb-3 pb-3 current-task">
                <v-list
                  v-if="currentTask && currentTask.id"
                  class="concentrated-view elevation-0"
                >
                  <v-list-tile
                    @click="updateSelectedTaskRef(currentTask.id)"
                    class="active"
                    avatar
                  >
                    <v-progress-circular
                      :value="countTaskPercentage(currentTask)"
                      :size="48"
                      :rotate="-90"
                      class="mr-3 circular-task"
                      width="2"
                      color="warning"
                    >
                      <v-list-tile-avatar>
                        <v-btn
                          fab
                          small
                          class="elevation-0"
                          :disabled="getButtonDisabled(currentTask)"
                          :color="getCurrentButtonColor(currentTask)"
                          @click="checkDialogClick($event, currentTask)"
                        >
                          <v-icon>{{ getButtonIcon(currentTask) }}</v-icon>
                        </v-btn>
                      </v-list-tile-avatar>
                    </v-progress-circular>
                    <v-list-tile-content>
                      <v-list-tile-title>
                        <span>{{ currentTask.name }}</span>
                        <div class="step-info" @click="toggleStepModal = true"><v-icon>info</v-icon></div>
                      </v-list-tile-title>
                      <v-list-tile-sub-title class="pt-2">
                        <div class="time-text">
                          {{ currentTask.time }} - {{ countTaskCompleted(currentTask) }}/{{ countTaskTotal(currentTask) }}
                        </div>
                        <div>
                          <v-btn-toggle v-model="currentGoalPeriod">
                            <v-btn flat value="day">
                              Today
                            </v-btn>
                            <v-btn flat value="week">
                              Week
                            </v-btn>
                            <v-btn flat value="month">
                              Month
                            </v-btn>
                            <v-btn flat value="year">
                              Year
                            </v-btn>
                          </v-btn-toggle>
                        </div>
                      </v-list-tile-sub-title>
                      <!-- Skeleton loading state for daily goals -->
                      <template v-if="$apollo.queries.goals.loading && goalsFirstLoad">
                        <div class="pt-2 pb-2" style="width: 100%;">
                          <!-- Chip skeletons -->
                          <v-layout class="mb-3" row wrap>
                            <v-flex xs6>
                              <div class="skeleton skeleton-chip mr-2" style="width: 120px; height: 28px;"></div>
                            </v-flex>
                            <v-flex xs6>
                              <div class="skeleton skeleton-chip" style="width: 120px; height: 28px;"></div>
                            </v-flex>
                          </v-layout>
                            <!-- Title skeleton -->
                          <div class="skeleton skeleton-text mb-3" style="width: 60%; height: 20px;"></div>
                          <!-- Subtitle skeleton -->
                          <div class="skeleton skeleton-text mb-3" style="width: 40%; height: 16px;"></div>
                        </div>
                      </template>
                      <!-- Actual content when loaded -->
                      <div v-else class="pt-2 pb-2 task-goals">
                        <v-layout
                          class="mb-3"
                          row
                          wrap
                          v-if="
                            filterTaskGoalsPeriod(currentTask.id, goals, 'week').length &&
                              filterTaskGoalsPeriod(currentTask.id, goals, 'month').length
                          "
                        >
                          <v-flex xs12>
                            <v-alert :value="true" color="success" icon="check_circle" outline>
                              You are all set.
                              Do daily milestones to complete weekly and monthly goals.
                            </v-alert>
                          </v-flex>
                        </v-layout>
                        <v-layout class="mb-3" row wrap v-else>
                          <v-flex xs6 v-if="!filterTaskGoalsPeriod(currentTask.id, goals, 'month').length">
                            <v-chip small
                              @click="(currentGoalPeriod = 'month'), (goalDetailsDialog = true)"
                            >
                              <v-avatar class="red text-white"><v-icon>close</v-icon></v-avatar>
                              Set Month's Goal
                            </v-chip>
                          </v-flex>
                          <v-flex xs6 v-if="filterTaskGoalsPeriod(currentTask.id, goals, 'month').length">
                            <v-chip small>
                              <v-avatar class="success text-white"><v-icon>check</v-icon></v-avatar>
                              Set Month's Goal
                            </v-chip>
                          </v-flex>
                          <v-flex xs6 v-if="!filterTaskGoalsPeriod(currentTask.id, goals, 'week').length">
                            <v-chip small @click="(currentGoalPeriod = 'week'), (goalDetailsDialog = true)">
                              <v-avatar class="red text-white"><v-icon>close</v-icon></v-avatar>
                              Set Week's Goal
                            </v-chip>
                          </v-flex>
                          <v-flex xs6 v-if="filterTaskGoalsPeriod(currentTask.id, goals, 'week').length">
                            <v-chip small>
                              <v-avatar class="success text-white"><v-icon>check</v-icon></v-avatar>
                              Set Week's Goal
                            </v-chip>
                          </v-flex>
                        </v-layout>
                        <!-- Event execution timer alert -->
                        <v-layout class="mb-3" row wrap v-if="eventExecutionInProgress">
                          <v-flex xs12>
                            <v-alert :value="true" color="info" icon="timer" outline>
                              <div class="d-flex align-center">
                                <div class="flex-grow-1">
                                  <div class="caption">Refreshing goals in {{ eventExecutionTimeLeft }} seconds...</div>
                                </div>
                                <div>
                                  <v-progress-circular
                                    :value="((60 - eventExecutionTimeLeft) / 60) * 100"
                                    size="32"
                                    width="3"
                                    color="info"
                                  >
                                    {{ eventExecutionTimeLeft }}
                                  </v-progress-circular>
                                </div>
                              </div>
                            </v-alert>
                          </v-flex>
                        </v-layout>
                        <div v-if="filterTaskGoalsPeriod(currentTask.id, goals, currentGoalPeriod).length">
                          <div
                            :key="taskGoals.id"
                            v-for="taskGoals in filterTaskGoalsPeriod(currentTask.id, goals, currentGoalPeriod)"
                          >
                            <v-list two-line subheader>
                              <goal-item-list
                                :key="`goal-${taskGoals.id}-${currentGoalPeriod}`"
                                :goal="taskGoals"
                                :progress="getWeekProgress(currentGoalPeriod, taskGoals)"
                                :passive="$apollo.queries.goals.loading && goalsFirstLoad"
                                @delete-task-goal="deleteTaskGoal"
                                @refresh-task-goal="refreshTaskGoal"
                                @toggle-goal-display-dialog="toggleGoalDisplayDialog"
                              />
                            </v-list>
                          </div>
                        </div>
                        <small class="no-goals-text" v-else>
                          No goal or activity logged.
                        </small>
                        <div class="add-new">
                          <v-btn small flat @click="goalDetailsDialog = true">
                            <v-icon>add</v-icon>
                            Add Goal or Activity
                          </v-btn>
                        </div>
                      </div>
                    </v-list-tile-content>
                  </v-list-tile>
                </v-list>
                <div v-else-if="!$apollo.queries.goals.loading">
                  <v-card-text class="text-xs-center">
                    <p>No current items to display. Please go to Routine Settings and add routine items.</p>
                  </v-card-text>
                </div>
              </v-card>
            </div>
          </v-flex>
          <v-flex hidden-xs sm2 d-flex class="pl-2 pr-3 hidden-xs">
            <div style="display: flex; flex-direction: column; justify-content: space-between;">
              <v-card class="mb-3 pb-3">
                <div class="text-xs-center">
                  <v-progress-circular
                    :value="countTotal('D')"
                    :size="50"
                    :rotate="-90"
                    class="mt-3"
                    width="6"
                    color="primary"
                    >D</v-progress-circular
                  >
                </div>
              </v-card>
              <v-card class="mb-3 pb-3">
                <div class="text-xs-center">
                  <v-progress-circular
                    :value="countTotal('K')"
                    :size="50"
                    :rotate="-90"
                    class="mt-3"
                    width="6"
                    color="primary"
                    >K</v-progress-circular
                  >
                </div>
              </v-card>
              <v-card class="mb-3 pb-3">
                <div class="text-xs-center">
                  <v-progress-circular
                    :value="countTotal('G')"
                    :size="50"
                    :rotate="-90"
                    class="mt-3"
                    width="6"
                    color="primary"
                    >G</v-progress-circular
                  >
                </div>
              </v-card>
            </div>
          </v-flex>
          <!-- <v-flex xs6 d-flex>goal time left </v-flex> -->
          <!-- <v-flex xs6 d-flex>Routine time left</v-flex> -->
          <v-flex
            xs12
            class="pr-3 pl-3 mb-3"
            d-flex
            v-if="!!countTaskTotal(currentTask) &&
                  currentGoalPeriod === 'day' &&
                  filterTaskGoalsPeriod(currentTask.id, goals, 'week').length > 0"
          >
            <v-card>
              <v-card-title>
                <b>Week Goal Streak</b>
              </v-card-title>
              <div
                :key="weekGoal.id"
                v-for="weekGoal in filterTaskGoalsPeriod(currentTask.id, goals, 'week')"
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
            </v-card>
          </v-flex>
          <v-flex xs12 class="pl-3 pr-3 pb-3" d-flex>
            <v-card>
              <v-tabs
                v-model="tabs"
                right
              >
                <v-tab>
                  Upcoming
                </v-tab>
                <v-tab>
                  Past
                </v-tab>
              </v-tabs>
              <v-list
                subheader
                style="width:100%"
                v-if="filterUpcomingPastTask(tabs, tasklist) && filterUpcomingPastTask(tabs, tasklist).length > 0"
                class="concentrated-view elevation-0"
              >
                <div v-for="(task, index) in filterUpcomingPastTask(tabs, tasklist)" :key="`task-${task.id}`">
                  <v-divider v-if="index != 0" :key="`divider-${task.id}`" :inset="task.inset"></v-divider>
                  <v-list-tile
                    :key="`tile-${task.id}`"
                    @click="updateSelectedTaskRef(task.id)"
                    :class="task.id === selectedTaskRef ? 'active' : ''"
                    avatar
                  >
                    <v-progress-circular
                      :value="countTaskPercentage(task)"
                      :size="48"
                      :rotate="-90"
                      class="mr-3 circular-task"
                      width="2"
                      color="warning"
                    >
                      <v-list-tile-avatar>
                        <v-btn
                          fab
                          small
                          class="elevation-0"
                          :disabled="getButtonDisabled(task)"
                          :color="getCurrentButtonColor(task)"
                          @click="checkDialogClick($event, task)"
                        >
                          <v-icon>{{ getButtonIcon(task) }}</v-icon>
                        </v-btn>
                      </v-list-tile-avatar>
                    </v-progress-circular>
                    <v-list-tile-content>
                      <v-list-tile-title>
                        <span>{{ task.name }}</span>
                      </v-list-tile-title>
                      <v-list-tile-sub-title v-if="task.id === selectedTaskRef">
                        <div class="time-text">
                          {{ task.time }} - {{ countTaskCompleted(task) }}/{{ countTaskTotal(task) }}
                        </div>
                        <div>
                          <v-btn-toggle v-model="currentGoalPeriod">
                            <v-btn flat value="day">
                              Today
                            </v-btn>
                            <v-btn flat value="week">
                              Week
                            </v-btn>
                            <v-btn flat value="month">
                              Month
                            </v-btn>
                            <v-btn flat value="year">
                              Year
                            </v-btn>
                          </v-btn-toggle>
                        </div>
                      </v-list-tile-sub-title>
                      <v-list-tile-sub-title v-else>
                        {{ task.time }}
                      </v-list-tile-sub-title>
                      <div v-if="task.id === selectedTaskRef" class="pt-2 pb-2 task-goals">
                        <v-layout
                          class="mb-3"
                          row
                          wrap
                          v-if="
                            filterTaskGoalsPeriod(task.id, goals, 'week').length &&
                              filterTaskGoalsPeriod(task.id, goals, 'month').length
                          "
                        >
                          <v-flex xs12>
                            <v-alert :value="true" color="success" icon="check_circle" outline>
                              You are all set.
                              Do daily milestones to complete weekly and monthly goals.
                            </v-alert>
                          </v-flex>
                        </v-layout>
                        <v-layout class="mb-3" row wrap v-else>
                          <v-flex xs6 v-if="!filterTaskGoalsPeriod(task.id, goals, 'month').length">
                            <v-chip small
                              @click="(currentGoalPeriod = 'month'), (goalDetailsDialog = true)"
                            >
                              <v-avatar class="red text-white"><v-icon>close</v-icon></v-avatar>
                              Set Month's Goal
                            </v-chip>
                          </v-flex>
                          <v-flex xs6 v-if="filterTaskGoalsPeriod(task.id, goals, 'month').length">
                            <v-chip small>
                              <v-avatar class="success text-white"><v-icon>check</v-icon></v-avatar>
                              Set Month's Goal
                            </v-chip>
                          </v-flex>
                          <v-flex xs6 v-if="!filterTaskGoalsPeriod(task.id, goals, 'week').length">
                            <v-chip small @click="(currentGoalPeriod = 'week'), (goalDetailsDialog = true)">
                              <v-avatar class="red text-white"><v-icon>close</v-icon></v-avatar>
                              Set Week's Goal
                            </v-chip>
                          </v-flex>
                          <v-flex xs6 v-if="filterTaskGoalsPeriod(task.id, goals, 'week').length">
                            <v-chip small>
                              <v-avatar class="success text-white"><v-icon>check</v-icon></v-avatar>
                              Set Week's Goal
                            </v-chip>
                          </v-flex>
                        </v-layout>
                        <div v-if="filterTaskGoalsPeriod(task.id, goals, currentGoalPeriod).length">
                          <div
                            :key="taskGoals.id"
                            v-for="taskGoals in filterTaskGoalsPeriod(task.id, goals, currentGoalPeriod)"
                          >
                            <v-list two-line subheader>
                              <goal-item-list
                                :key="`goal-${taskGoals.id}-${currentGoalPeriod}-${task.id}`"
                                :goal="taskGoals"
                                :progress="getWeekProgress(currentGoalPeriod, taskGoals)"
                                :passive="$apollo.queries.goals.loading && goalsFirstLoad"
                                @delete-task-goal="deleteTaskGoal"
                                @refresh-task-goal="refreshTaskGoal"
                                @toggle-goal-display-dialog="toggleGoalDisplayDialog"
                              />
                            </v-list>
                          </div>
                        </div>
                        <small class="no-goals-text" v-else>
                          No goal or activity logged.
                        </small>
                        <div class="add-new">
                          <v-btn small flat @click="goalDetailsDialog = true">
                            <v-icon>add</v-icon>
                            Add Goal or Activity
                          </v-btn>
                        </div>
                      </div>
                    </v-list-tile-content>
                    <v-list-tile-action v-if="task.id !== selectedTaskRef">
                      <v-list-tile-action-text>
                        <b>{{ countTaskCompleted(task) }}</b
                        >/{{ countTaskTotal(task) }}
                      </v-list-tile-action-text>
                      <v-list-tile-action-text>tasks</v-list-tile-action-text>
                    </v-list-tile-action>
                  </v-list-tile>
                </div>
              </v-list>
              <div v-if="filterUpcomingPastTask(tabs, tasklist) && filterUpcomingPastTask(tabs, tasklist).length === 0">

                  <v-card-text class="text-xs-center">
                    <p>No upcoming routine items.</p>
                  </v-card-text>

              </div>
            </v-card>
          </v-flex>
        </v-layout>
      </template>
    </div>
    <div v-else>
      <div class="pl-3 pr-3">
        <p class="pt-4">
          Work on your daily agenda to bring you closer to your lifetime goal.
        </p>
        <template
          v-if="agendaGoals && agendaGoals.find((goal) => goal.period === 'lifetime')"
        >
          <v-card>
            <v-card-title>
              <h3>Remember your Lifetime Goals</h3>
            </v-card-title>
            <v-card-text class="pt-0">
              <ul>
                <li
                  v-for="goalItem in agendaGoals.find(
                    (goal) => goal.period === 'lifetime'
                  ).goalItems"
                  :key="goalItem.id"
                >
                  {{ goalItem.body }}
                </li>
              </ul>
            </v-card-text>
          </v-card>
        </template>
      </div>
      <div class="text-xs-center date-navigation" hidden>
        <v-btn
          fab
          outline
          small
          absolute
          left
          color="primary"
          :disabled="disablePrevious()"
          @click="previousDate()"
        >
          <v-icon dark> keyboard_arrow_left </v-icon>
        </v-btn>
        <v-btn
          fab
          outline
          small
          absolute
          right
          color="primary"
          @click="nextDate()"
        >
          <v-icon dark> keyboard_arrow_right </v-icon>
        </v-btn>
        <div class="date-today">{{ today }}</div>
      </div>
      <div v-if="tasklist && tasklist.length">
        <v-timeline dense clipped>
          <!-- eslint-disable vue/valid-v-for -->
          <template v-for="task in tasklist">
            <!-- eslint-disable-next-line vue/valid-v-for -->
            <span :key="`task-${task.id}`">
              <v-timeline-item
                fill-dot
                :class="`pb-4 pt-4 routine-item ${getActiveClass(task)}`"
                :color="getButtonColor(task)"
                medium
              >
                <template v-slot:icon>
                  <v-icon @click="setActiveSelection(task)" class="white--text">{{ getButtonIcon(task) }}</v-icon>
                </template>
                <v-layout>
                  <v-flex xs2>
                    <strong>{{ task.time }}</strong>
                  </v-flex>
                  <v-flex>
                    <strong>{{ task.name }}</strong>
                    <br />
                    <a @click="() => $router.push(`/agenda/tree/${task.id}`)"
                      >Go to Month Planner</a
                    >
                    <div class="caption">
                      <pre>{{ task.description }}</pre>
                    </div>
                  </v-flex>
                </v-layout>
              </v-timeline-item>
              <template v-for="period in periods">
                <!-- eslint-disable-next-line vue/valid-v-for -->
                <v-timeline-item
                  hide-dot
                  :key="`period-${task.id}-${period}`"
                  class="pb-0 pt-2"
                >
                  <v-layout
                    class="period-separator"
                    align-center
                    justify-space-between
                  >
                    <v-flex xs7>
                      <span style="text-transform: uppercase">{{
                        period
                      }}</span>
                    </v-flex>
                    <v-flex xs5 text-xs-right>
                      <!-- <v-btn
                        flat
                        icon
                        color="primary"
                        v-if="isEditable"
                        @click="
                          selectedTaskRef = task.id;
                          currentGoalPeriod = period;
                          goalDetailsDialog = true"
                        >
                        <v-icon>content_copy</v-icon>
                        <v-icon class="overlay-icon">arrow_back</v-icon>
                      </v-btn> -->
                      <v-btn
                        flat
                        icon
                        color="primary"
                        v-if="isEditable && period !== 'year'"
                        @click="clonePeriodGoalItem(task, period)"
                      >
                        <v-icon>content_copy</v-icon>
                        <v-icon class="overlay-icon">arrow_upward</v-icon>
                      </v-btn>
                      <v-btn
                        flat
                        icon
                        color="primary"
                        v-if="isEditable"
                        @click="newGoalItem(task, period)"
                      >
                        <v-icon>add</v-icon>
                      </v-btn>
                      <v-btn flat icon color="primary" v-else>
                        <v-icon></v-icon>
                      </v-btn>
                    </v-flex>
                  </v-layout>
                </v-timeline-item>
                <template v-if="filterTaskGoalsPeriod(task.id, agendaGoals, period).length">
                  <timeline-item-list
                    v-for="(taskGoals, i) in filterTaskGoalsPeriod(
                      task.id,
                      agendaGoals,
                      period
                    )"
                    :key="`goal-${task.id}-${period}-${i}`"
                    :goal="taskGoals"
                    :period="period"
                    @delete-task-goal="deleteTaskAgendaGoal"
                  />
                </template>
                <template v-else>
                  <v-timeline-item
                    :key="period"
                    class="mb-0 pb-3 pt-3"
                    hide-dot
                  >
                    <span>No goal or activity set.</span>
                  </v-timeline-item>
                </template>
              </template>
            </span>
          </template>
        </v-timeline>
      </div>
      <div v-if="tasklist && tasklist.length === 0">
        <v-card-text class="text-xs-center">
          <p>
            No items to display. Please go to Routine Settings and add routine
            items.
          </p>
        </v-card-text>
      </div>
    </div>
    <v-dialog
      v-model="goalDetailsDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="goalDetailsDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>Add Goal</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <goal-list
          :goals="isTodaySelected ? goals : agendaGoals"
          :date="date"
          :period="currentGoalPeriod"
          :selectedBody="selectedBody"
          :tasklist="tasklist"
          :selectedTaskRef="selectedTaskRef"
          @toggle-goal-details-dialog="toggleGoalDetailsDialog"
        />
        <v-alert
          :value="true"
          color="success"
          icon="ev_station"
          outline
          class="ml-3 mr-3"
        >
          It's better to set Month and Weekly goals first to better guide daily
          milestones.
        </v-alert>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="goalDisplayDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar color="white">
          <v-spacer></v-spacer>
          <v-btn icon @click="toggleGoalDisplayDialog(null, false)">
            <v-icon>close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card class="no-shadow">
          <v-card-text class="pa-0">
            <goal-creation
              :newGoalItem="selectedGoalItem"
              v-on:add-update-goal-entry="toggleGoalDisplayDialog"
            />
          </v-card-text>
        </v-card>
      </v-card>
    </v-dialog>
    <v-dialog v-model="quickTaskDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">{{ quickTaskTitle }}</span>
        </v-card-title>
        <v-card-text>
          <p>
            {{ quickTaskDescription }}
          </p>
          <quick-goal-creation
            :goals="goals"
            :date="date"
            period="day"
            :tasklist="tasklist"
            :selectedTaskRef="selectedTaskRef"
            @start-quick-goal-task="checkClick"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="toggleStepModal"
      width="500"
    >
      <v-card>
        <v-card-title
          class="headline grey lighten-2"
          primary-title
        >
          Routine Steps
        </v-card-title>

        <v-card-text v-if="currentTask && currentTask.steps">
          <ul>
            <li v-for="step in currentTask.steps" v-bind:key="step.name">{{ step.name }}</li>
          </ul>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            flat
            @click="toggleStepModal = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </container-box>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';
import gql from 'graphql-tag';

import { TIMES_UP_TIME, PROACTIVE_START_TIME } from '../constants/settings';
import { defaultGoalItem } from '../constants/goals';
import eventBus, { EVENTS } from '../utils/eventBus';
import { MeasurementMixin } from '../utils/measurementMixins';

import GoalList from '../components/GoalList.vue';
import TimelineItemList from '../components/TimelineItemList.vue';
import GoalItemList from '../components/GoalItemList.vue';
import ContainerBox from '../components/ContainerBox.vue';
import { stepupMilestonePeriodDate, threshold } from '../utils/getDates';
import QuickGoalCreation from '../components/QuickGoalCreation.vue';
import StreakChecks from '../components/StreakChecks.vue';
import GoalCreation from '../components/GoalCreation.vue';
import WakeCheck from '../components/WakeCheck.vue';

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
  mixins: [MeasurementMixin],
  components: {
    GoalList,
    GoalItemList,
    TimelineItemList,
    ContainerBox,
    QuickGoalCreation,
    StreakChecks,
    GoalCreation,
    WakeCheck,
  },
  apollo: {
    tasklist: {
      query: gql`
      query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            date
            skip
            tasklist {
              id
              name
              description
              time
              points
              ticked
              passed
              wait
              startEvent
              endEvent
              tags
              steps {
                name
              }
              stimuli {
                name
                splitRate
                earned
              }
            }
          }
        }
      `,
      skip() {
        // Skip query if user is not authenticated
        return !this.$root.$data.email;
      },
      update(data) {
        this.isLoading = false;
        this.tasklist = data.routineDate && data.routineDate.date
          ? data.routineDate.tasklist
          : [];
        if (data.routineDate === null) {
          this.addNewDayRoutine();
          return this.tasklist;
        }
        this.did = data.routineDate.id;
        if (this.isTodaySelected) this.setPassedWait();
        this.skipDay = !!data.routineDate.skip;
        return data.routineDate.tasklist;
      },
      variables() {
        return {
          date: this.date,
        };
      },
      error() {
        clearInterval(this.timerId);
        this.isLoading = false;
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      },
    },
    agendaGoals: {
      query: gql`
        query agendaGoals($date: String!) {
          agendaGoals(date: $date) {
            id
            date
            period
            goalItems {
              id
              body
              progress
              isComplete
              taskRef
              goalRef
            }
          }
        }
      `,
      skip() {
        // Skip query if user is not authenticated
        return !this.$root.$data.email;
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
      query: gql`
        query dailyGoals($date: String!) {
          dailyGoals(date: $date) {
            id
            date
            period
            goalItems {
              id
              body
              progress
              isComplete
              taskRef
              goalRef
              isMilestone
              contribution
              reward
              tags
              status
              completedAt
              subTasks {
                id
                body
                isComplete
              }
            }
          }
        }
      `,
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
      isLoading: true,
      goalDetailsDialog: false,
      goalDisplayDialog: false,
      quickTaskDialog: false,
      quickTaskTitle: '',
      quickTaskDescription: '',
      defaultGoalItem,
      selectedGoalItem: {},
      tasklist: [],
      did: '',
      skipDay: false,
      currentGoalPeriod: 'day',
      selectedBody: '',
      selectedTaskRef: '',
      date: moment().format('DD-MM-YYYY'),
      todayDate: moment().format('DD-MM-YYYY'),
      weekDays: this.buildWeekdays(),
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
      // Queue for events waiting for goal IDs per routine item
      pendingEvents: [],
      // Track created goal IDs per routine item for placeholder replacement
      routineGoalIds: {}, // { routineItemId: goalId }
      // Analytics: Track component mount time for session duration
      mountTime: Date.now(),
    };
  },
  watch: {
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$apollo.queries.tasklist.refetch();
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
          const taskKey = `${this.date}-${newTask.id}`;

          // Execute endEvent if task is complete and endEvent hasn't been executed yet
          if (isComplete && !isOldComplete && !this.executedEndEvents.has(taskKey)) {
            this.checkEventExecutionForTask(newTask.id, 'K');
          }
        }
      },
      immediate: true,
    },
    // Update global task list when tasklist changes
    tasklist: {
      handler(newTasklist) {
        // Update the global current task store with the task list
        this.$currentTask.setTasklist(newTasklist || []);
      },
      immediate: true,
    },
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

    console.log('DashBoard: Event listeners registered');
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

    // Clean up timer
    this.stopEventExecutionTimer();
  },
  methods: {
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
      // Only refetch if day goals were created
      this.refetchDailyGoals();
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
      // Refresh all Apollo queries in this component when user logs in
      try {
        if (this.$apollo.queries.tasklist) {
          this.$apollo.queries.tasklist.refetch();
        }
        if (this.$apollo.queries.agendaGoals) {
          this.$apollo.queries.agendaGoals.refetch();
        }
        if (this.$apollo.queries.goals) {
          this.$apollo.queries.goals.refetch();
        }
        console.log('DashBoard: Apollo queries refreshed successfully');
      } catch (error) {
        console.warn('DashBoard: Error refreshing Apollo queries:', error);
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
    checkEventExecutionForTask(taskId, stimulusName) {
      // Find the task in the current tasklist
      const task = this.tasklist.find((t) => t.id === taskId);

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
    buildWeekdays() {
      const weekDays = [];
      const dayShort = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const currentDate = moment();

      const weekStart = currentDate.clone().startOf('week');
      // const weekEnd = currentDate.clone().endOf('isoWeek');

      dayShort.forEach((day, i) => {
        weekDays.push({
          dayNumber: moment(weekStart).add(i, 'days').format('DD'),
          isActive: moment().weekday() === i,
          day,
        });
      });

      return weekDays;
    },
    deleteTaskAgendaGoal(id) {
      this.agendaGoals.forEach((goal) => {
        goal.goalItems = goal
          && goal.goalItems
          && goal.goalItems.filter((goalItem) => goalItem.id !== id);
      });
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
    setDate(indx) {
      const currentDate = moment();
      const weekStart = currentDate.clone().startOf('week');

      this.weekDays = this.weekDays.map((weekDay, i) => {
        if (Number(indx) === i) {
          weekDay.isActive = true;
          return weekDay;
        }
        weekDay.isActive = false;
        return weekDay;
      });
      this.date = moment(weekStart).add(indx, 'days').format('DD-MM-YYYY');
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
      this.isLoading = true;
      this.$apollo
        .mutate({
          mutation: gql`
            mutation addRoutine($date: String!) {
              addRoutine(date: $date) {
                id
              }
            }
          `,
          variables: {
            date: this.date,
          },
        })
        .then(() => this.$apollo.queries.tasklist.refetch())
        .then(() => {
          this.isLoading = false;
        })
        .catch(() => {
          clearInterval(this.timerId);
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
    deleteTaskGoal(id) {
      this.goals.forEach((goal) => {
        goal.goalItems = goal.goalItems.filter((goalItem) => goalItem.id !== id);
      });
    },
    refreshTaskGoal(taskRef) {
      this.$apollo.queries.tasklist.refetch();
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
        has_goals: this.filterTaskGoalsPeriod(task.id, this.goals, 'day').length > 0,
      });

      if (!task.passed && !task.wait && !task.ticked) {
        if (this.filterTaskGoalsPeriod(task.id, this.goals, 'day').length) {
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
                    name
                    ticked
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

            return this.$apollo.queries.tasklist.refetch();
          })
          .then(() => {
            // Check for event execution after task state changes and refetch completes
            console.log('DashBoard: Tasklist refetch completed, checking events for task:', task.id);
            this.checkEventExecutionForTask(task.id, 'D');
            return this.$apollo.queries.goals.refetch();
          })
          .catch(() => {
            task.ticked = false;
            clearInterval(this.timerId);
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
            skip: !!this.skipDay,
          },
        })
        .catch(() => {
          setTimeout(() => {
            this.skipDay = false;
          }, 1000);
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
              },
            })
            .catch(() => {
              clearInterval(this.timerId);
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
            })
            .catch(() => {
              clearInterval(this.timerId);
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
      const aggregatePoints = this.tasklist.reduce((total, num) => {
        const currentStimulus = num.stimuli.find((st) => st.name === stimulus);
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
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      const completed = 100 * (stimulus.earned / task.points);
      return isNaN(completed) ? 0 : completed;
    },
    countTaskCompleted(task) {
      if (task && task.id) {
        const dStimulus = task.stimuli.find((st) => st.name === 'D');
        const stimulus = task.stimuli.find((st) => st.name === 'K');
        const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
        const completed = Number(
          (count * (Number(stimulus.earned) / Number(task.points))).toFixed(0),
        );
        return isNaN(completed) ? 0 : completed;
      }
      return 0;
    },
    countTaskTotal(task) {
      if (task && task.id) {
        const dStimulus = task.stimuli.find((st) => st.name === 'D');
        const stimulus = task.stimuli.find((st) => st.name === 'K');
        const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
        return count;
      }
      return 0;
    },
  },
  computed: {
    today() {
      return moment(this.date, 'DD-MM-YYYY').format('DD MMMM YYYY');
    },
    isTodaySelected() {
      return this.todayDate === this.date;
    },
    currentTask() {
      if (Array.isArray(this.tasklist) && this.tasklist.length) {
        const currentActiveTask = this.tasklist.find((task, idx) => {
          const taskTime = moment(task.time, 'HH:mm');
          const currentTime = moment();
          const nextTask = this.tasklist[idx + 1];
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

<style>
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

.weekdays {
  width: 100%;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  font-weight: 500;
}

.weekdays .day {
  padding: 16px;
  border-radius: 4px;
  text-align: center;
}

#mobileLayout .weekdays .day {
  border-radius: 16px;
}

.weekdays .day.active {
  background-color: #288bd5;
  color: #fff;
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
  border-radius: 4px;
  box-shadow: none;
}

.concentrated-view .v-list__tile__sub-title .v-item-group .v-btn {
  height: 24px;
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
