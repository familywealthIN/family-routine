<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="!firstLoadDone">
    <atom-card
      dark
      flat
      class="image-card"
    >
      <atom-button
        absolute
        dark
        fab
        bottom
        class="second-right-btn"
        color="info"
        @click="() => {
          trackUserInteraction('milestones_navigation', 'button_click', {
            from_page: 'goals',
            to_page: 'milestones',
          });
          $router.push('/goals/milestones');
        }"
      >
        <atom-icon>widgets</atom-icon>
      </atom-button>
      <atom-button
        absolute
        dark
        fab
        bottom
        right
        color="info"
        @click="() => {
          trackUserInteraction('add_goal_dialog_open', 'button_click', {
            from_page: 'goals',
            goals_count: allGoals ? allGoals.length : 0,
          });
          addGoalItemDialog = true;
        }"
      >
        <atom-icon>add</atom-icon>
      </atom-button>
      <atom-img
        class="image-card-img"
        src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
        gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
      >
        <atom-container fill-height>
          <atom-layout align-center justify-center class="goal-stats-row">
            <div class="goal-stat-item text-xs-center">
              <div class="overline white--text stat-label">Total Day Tasks</div>
              <div class="display-3 white--text font-weight-medium">{{ getDayGoalsCount() }}</div>
            </div>
            <v-divider vertical dark class="goal-stat-divider"></v-divider>
            <div class="goal-stat-item text-xs-center">
              <div class="overline white--text stat-label">Total Week Tasks</div>
              <div class="display-3 white--text font-weight-medium">{{ getWeekGoalsCount() }}</div>
            </div>
            <v-divider vertical dark class="goal-stat-divider"></v-divider>
            <div class="goal-stat-item text-xs-center">
              <div class="overline white--text stat-label">Total Month Tasks</div>
              <div class="display-3 white--text font-weight-medium">{{ getMonthGoalsCount() }}</div>
            </div>
            <v-divider vertical dark class="goal-stat-divider"></v-divider>
            <div class="goal-stat-item text-xs-center">
              <div class="overline white--text stat-label">Total Year Tasks</div>
              <div class="display-3 white--text font-weight-medium">{{ getYearGoalsCount() }}</div>
            </div>
            <v-divider vertical dark class="goal-stat-divider"></v-divider>
            <div class="goal-stat-item text-xs-center">
              <div class="overline white--text stat-label">Total Life Tasks</div>
              <div class="display-3 white--text font-weight-medium">{{ getLifetimeGoalsCount() }}</div>
            </div>
          </atom-layout>
        </atom-container>
      </atom-img>
    </atom-card>
    <atom-card-text class="image-card-page py-0 px-0">
      <template v-for="period in periods">
        <div v-if="period.name === 'day'" :key="period.name">
          <div class="text-xs-center"><h2 class="pt-4 pb-3 pl-2">{{ currentMonth }}</h2></div>
          <atom-sheet>
            <atom-calendar
              ref="calendar"
              v-model="start"
              :type="type"
              :end="end"
              color="primary"
              @change="updateRange"
              @click:date="showGoalDialog"
            >
              <template v-slot:day="{ date }">
                <template v-for="goal in goalsMap[date]">
                  {{goal.goalItems.length}} Goals
                </template>
              </template>
            </atom-calendar>
          </atom-sheet>
          <atom-layout>
            <atom-flex
              xs4
              class="text-xs-left"
            >
              <atom-button outline color="primary" @click="calendarPrev" :loading="isNavigating" :disabled="isNavigating">
                <atom-icon
                  left
                  dark
                >keyboard_arrow_left</atom-icon>
                Prev
              </atom-button>
            </atom-flex>
            <atom-flex xs4></atom-flex>
            <atom-flex
              xs4
              class="text-xs-right"
            >
              <atom-button outline color="primary" @click="calendarNext" :loading="isNavigating" :disabled="isNavigating">
                Next
                <atom-icon
                  right
                  dark
                >keyboard_arrow_right</atom-icon>
              </atom-button>
            </atom-flex>
          </atom-layout>
          <div class="text-xs-center pt-3 pb-3" style="display: none;">
            <atom-btn-toggle v-model="rangeType" >
              <atom-button flat value="upcoming">
                Upcoming
              </atom-button>
              <atom-button flat value="past">
                Past
              </atom-button>
              <atom-button flat value="all">
                All
              </atom-button>
            </atom-btn-toggle>
          </div>
        </div>
        <div v-else :key="`${period.name}-filter`">
          <goals-filter-time
            :key="period.name"
            :goals="allGoals"
            :periodFilter="period.name"
            :rangeType="rangeType"
            :selectedMonth="currentMonthVariable"
            :updateNewGoalItem="updateNewGoalItem"
            @delete-task-goal="deleteTaskGoal"
            @complete-goal-item="completeGoalItem"
            @complete-sub-task="completeSubTask"
          />
        </div>
      </template>
    </atom-card-text>
    <atom-dialog
      v-model="addGoalItemDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <atom-card>
        <atom-toolbar dark color="primary">
          <atom-button icon dark @click="closeGoalItemDialog()">
            <atom-icon>close</atom-icon>
          </atom-button>
          <atom-toolbar-title>{{ goalActionText || 'Add Goal'}}</atom-toolbar-title>
          <atom-spacer></atom-spacer>
        </atom-toolbar>
        <atom-card class="no-shadow">
          <atom-card-text class="pa-0">
            <goal-creation :newGoalItem="newGoalItem" v-on:add-update-goal-entry="addUpdateGoalEntry" />
          </atom-card-text>
        </atom-card>
      </atom-card>
    </atom-dialog>
    <atom-dialog v-model="goalDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <atom-card>
        <atom-toolbar dark color="primary">
          <atom-button icon dark @click="goalDialog = false">
            <atom-icon>close</atom-icon>
          </atom-button>
          <atom-toolbar-title>{{selectedDayGoalTitle}}</atom-toolbar-title>
          <atom-spacer></atom-spacer>
        </atom-toolbar>
        <goal-item-list
          @update-new-goal-item="updateNewGoalItem"
          @delete-task-goal="deleteTaskGoal"
          @complete-goal-item="completeGoalItem"
          @complete-sub-task="completeSubTask"
          :goal="selectedDayGoal"
          :editMode="true"
        />
      </atom-card>
    </atom-dialog>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import { MeasurementMixin } from '@/utils/measurementMixins.js';

import { defaultGoalItem, periodsArray } from '../constants/goals';

import GoalItemList from '../components/organisms/GoalItemList/GoalItemList.vue';
import GoalsFilterTime from '../components/organisms/GoalsFilterTime/GoalsFilterTime.vue';

import {
  AtomButton,
  AtomBtnToggle,
  AtomCalendar,
  AtomCard,
  AtomCardText,
  AtomContainer,
  AtomDialog,
  AtomFlex,
  AtomIcon,
  AtomImg,
  AtomLayout,
  AtomSheet,
  AtomSpacer,
  AtomToolbar,
  AtomToolbarTitle,
} from '../components/atoms';
import GoalCreation from '../containers/GoalCreationContainer.vue';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';

export default {
  mixins: [MeasurementMixin],
  components: {
    GoalItemList,
    GoalCreation,
    GoalsFilterTime,
    ContainerBox,
    AtomButton,
    AtomBtnToggle,
    AtomCalendar,
    AtomCard,
    AtomCardText,
    AtomContainer,
    AtomDialog,
    AtomFlex,
    AtomIcon,
    AtomImg,
    AtomLayout,
    AtomSheet,
    AtomSpacer,
    AtomToolbar,
    AtomToolbarTitle,
  },
  apollo: {
    goals: {
      query: gql`
        query goalsOptimized($currentMonth: String) {
          goalsOptimized(currentMonth: $currentMonth) {
            id
            date
            period
            goalItems {
              id
              body
              tags
              isComplete
              isMilestone
              contribution,
              reward,
              taskRef
              goalRef
              status
              createdAt
              originalDate
              subTasks {
                id
                body
                isComplete
              },
            }
          }
        }
      `,
      variables() {
        return {
          currentMonth: this.currentMonthVariable || moment().endOf('month').format('DD-MM-YYYY'),
        };
      },
      skip() {
        return !this.$root.$data.email;
      },
      result() {
        this.firstLoadDone = true;
      },
      update(data) {
        console.log('[GoalsTime] goals query update:', data);
        return data.goalsOptimized || [];
      },
    },
    pastGoals: {
      query: gql`
        query goalsPast {
          goalsPast {
            id
            date
            period
            goalItems {
              id
              body
              tags
              isComplete
              isMilestone
              contribution,
              reward,
              taskRef
              goalRef
              status
              createdAt
              originalDate
              subTasks {
                id
                body
                isComplete
              },
            }
          }
        }
      `,
      skip() {
        return !this.$root.$data.email || this.rangeType !== 'past';
      },
      update(data) {
        console.log('[GoalsTime] pastGoals query update:', data);
        return data.goalsPast || [];
      },
    },
  },
  watch: {
    goals(newVal) {
      // Reset navigation loading state when goals are loaded
      this.isNavigating = false;
      console.log('[GoalsTime] goals updated:', {
        count: newVal ? newVal.length : 0,
        periods: newVal ? newVal.reduce((acc, g) => {
          acc[g.period] = (acc[g.period] || 0) + 1;
          return acc;
        }, {}) : {},
        sample: newVal ? newVal.slice(0, 5).map((g) => ({ period: g.period, date: g.date, itemsCount: g.goalItems.length })) : [],
      });
    },
    allGoals(newVal) {
      console.log('[GoalsTime] allGoals computed:', {
        count: newVal ? newVal.length : 0,
        periods: newVal ? newVal.reduce((acc, g) => {
          acc[g.period] = (acc[g.period] || 0) + 1;
          return acc;
        }, {}) : {},
      });
    },
  },
  computed: {
    date() {
      return moment().format('DD-MM-YYYY');
    },
    // Merge goals from optimized query and past query
    allGoals() {
      const optimizedGoals = this.goals || [];
      const past = this.pastGoals || [];

      // Combine and deduplicate by id
      const goalsMap = new Map();
      [...optimizedGoals, ...past].forEach((goal) => {
        if (goal && goal.id) {
          goalsMap.set(goal.id, goal);
        }
      });

      return Array.from(goalsMap.values());
    },
    // convert the list of events into a map of lists keyed by date
    goalsMap() {
      const map = {};
      if(this.allGoals) {
        this.allGoals.forEach((goal) => {
          if(goal.period === 'day') {
            const date = this.formatCalendarDate(goal.date);
            (map[date] = map[date] || []).push(goal);
          }
        });
      }
      console.log('map', map);
      return map;
    },
    // Dynamically look up the selected day's goal from the current goalsMap
    selectedDayGoal() {
      if (!this.selectedDayDate || !(this.selectedDayDate in this.goalsMap)) {
        return {};
      }
      return this.goalsMap[this.selectedDayDate][0];
    },
  },
  data: () => ({
    type: 'month',
    start: moment().format('YYYY-MM-DD'),
    end: moment().endOf('year').format('YYYY-MM-DD'),
    currentMonth: moment().format('MMMM YYYY'),
    currentMonthVariable: moment().endOf('month').format('DD-MM-YYYY'),
    valid: true,
    addGoalItemDialog: false,
    buttonLoading: false,
    isNavigating: false,
    firstLoadDone: false,
    goalActionText: 'Add Goal',
    groupId: '',
    defaultGoalItem,
    newGoalItem: { ...defaultGoalItem }, // Use defaultGoalItem to ensure all fields are initialized
    periods: periodsArray,
    rangeType: 'upcoming',
    goalDialog: false,
    selectedDayGoalTitle: '',
    selectedDayDate: null, // Store the selected date instead of the goal object
  }),
  methods: {
    calendarPrev() {
      if (this.isNavigating) return;
      this.isNavigating = true;
      // Navigate to previous month by updating the start date
      const newDate = moment(this.start, 'YYYY-MM-DD').subtract(1, 'month');
      this.start = newDate.format('YYYY-MM-DD');
      this.currentMonth = newDate.format('MMMM YYYY');
      this.currentMonthVariable = newDate.endOf('month').format('DD-MM-YYYY');
    },
    calendarNext() {
      if (this.isNavigating) return;
      this.isNavigating = true;
      // Navigate to next month by updating the start date
      const newDate = moment(this.start, 'YYYY-MM-DD').add(1, 'month');
      this.start = newDate.format('YYYY-MM-DD');
      this.currentMonth = newDate.format('MMMM YYYY');
      this.currentMonthVariable = newDate.endOf('month').format('DD-MM-YYYY');
    },
    deleteTaskGoal({ id, period, date }) {
      this.$goals.deleteGoalItem({ id, period, date, dayDate: this.date })
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
      console.log('[GoalsTime] completeGoalItem received:', payload);
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
        .catch((error) => {
          if (onError) onError(error);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occurred while updating subtask',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    async updateRange({ start }) {
      this.currentMonth = moment(start.date, 'YYYY-MM-DD').format('MMMM YYYY');
      this.currentMonthVariable = moment(start.date, 'YYYY-MM-DD').endOf('month').format('DD-MM-YYYY');

      // Refetch optimized goals for the new month
      await this.$apollo.queries.goals.refetch({
        currentMonth: this.currentMonthVariable,
      });
    },
    formatCalendarDate(date) {
      return moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    },
    getGoal(period, date) {
      const goal = this.allGoals.find((aGoal) => aGoal.period === period && aGoal.date === date);
      if (!goal) {
        const newGoal = {
          id: `${Math.random()}`,
          period,
          date,
          goalItems: [],
        };
        if (!this.goals) {
          this.goals = [];
        }
        this.goals.push(newGoal);
        return newGoal;
      }

      return goal;
    },
    getLifetimeGoalsCount() {
      const lifetimeGoals = this.allGoals && this.allGoals.find((goal) => goal && goal.period === 'lifetime');
      return lifetimeGoals && lifetimeGoals.goalItems && lifetimeGoals.goalItems.length || 0
    },
    getMonthGoalsCount() {
      if (!this.allGoals) return 0;
      return this.allGoals
        .filter((goal) => goal && goal.period === 'month')
        .reduce((sum, goal) => sum + (goal.goalItems ? goal.goalItems.length : 0), 0);
    },
    getWeekGoalsCount() {
      if (!this.allGoals) return 0;
      return this.allGoals
        .filter((goal) => goal && goal.period === 'week')
        .reduce((sum, goal) => sum + (goal.goalItems ? goal.goalItems.length : 0), 0);
    },
    getDayGoalsCount() {
      if (!this.allGoals) return 0;
      return this.allGoals
        .filter((goal) => goal && goal.period === 'day')
        .reduce((sum, goal) => sum + (goal.goalItems ? goal.goalItems.length : 0), 0);
    },
    getYearGoalsCount() {
      if (!this.allGoals) return 0;
      return this.allGoals
        .filter((goal) => goal && goal.period === 'year')
        .reduce((sum, goal) => sum + (goal.goalItems ? goal.goalItems.length : 0), 0);
    },
    updateNewGoalItem(goalItem, period, date) {
      this.newGoalItem = {
        ...goalItem,
        tags: Array.isArray(goalItem.tags) ? [...goalItem.tags] : [],
        period,
        date,
      };
      this.goalActionText = 'Edit Goal';
      this.addGoalItemDialog = true;
    },
    closeGoalItemDialog() {
      this.newGoalItem = {...this.defaultGoalItem};
      this.addGoalItemDialog = false;
      this.goalActionText = 'Add Goal';
    },
    addUpdateGoalEntry(newGoalItem) {
      const goal = this.getGoal(newGoalItem.period, newGoalItem.date);
      let goalItem = goal
        .goalItems
        .find((aGoalItem) => aGoalItem.id === newGoalItem.id);
      if(goalItem && goalItem.id) {
        // Track goal update
        this.trackBusinessEvent('goal_updated', {
          goal_id: goalItem.id,
          period: newGoalItem.period,
          is_milestone: newGoalItem.isMilestone,
          has_deadline: !!newGoalItem.deadline,
          tags_count: newGoalItem.tags ? newGoalItem.tags.length : 0,
        });
        const goalItemIndex = goal.goalItems.indexOf(goalItem);
        Object.assign(goal.goalItems[goalItemIndex], newGoalItem);
      } else {
        // Track new goal creation
        this.trackBusinessEvent('goal_created', {
          period: newGoalItem.period,
          is_milestone: newGoalItem.isMilestone,
          has_deadline: !!newGoalItem.deadline,
          tags_count: newGoalItem.tags ? newGoalItem.tags.length : 0,
          goal_length: newGoalItem.body ? newGoalItem.body.length : 0,
        });
        goal.goalItems.push({
          ...newGoalItem,
        });
      }

      this.addGoalItemDialog = false;
      this.newGoalItem = { ...this.defaultGoalItem };
    },
    showGoalDialog({ date }) {
      if(date in this.goalsMap) {
        this.selectedDayGoalTitle = this.goalsMap[date][0].date
        this.selectedDayDate = date; // Store the date, computed property will look up the goal
        this.goalDialog = true;
      }
    },
  },
  mounted() {
    // Track goals page view
    this.trackPageView('goals');
    this.trackUserInteraction('goals_page_mounted', 'lifecycle', {
      component: 'GoalsTime',
      goals_count: this.allGoals ? this.allGoals.length : 0,
    });
  },
};
</script>

<style>
  .image-card-img {
    height: 180px;
    border-radius: 12px 12px 0 0;
  }
  @media (max-width: 600px) {
    .image-card-img {
      height: 260px;
    }
  }
  .goal-stats-row {
    gap: 0;
  }
  .goal-stat-item {
    flex: 1;
    padding: 4px 8px;
  }
  .goal-stat-divider.v-divider--vertical {
    margin: 8px 0;
    min-height: 48px;
    opacity: 0.5;
  }
  .stat-label {
    letter-spacing: 2px !important;
    font-size: 11px !important;
    margin-bottom: 4px;
    opacity: 0.85;
  }
  .second-right-btn {
   right: 84px;
  }
  .theme--light.v-subheader {
    border-bottom: 1px solid rgba(0,0,0,0.16);
  }
  .custom-loader {
    animation: loader 1s infinite;
    display: flex;
  }
  @-moz-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-webkit-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-o-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
