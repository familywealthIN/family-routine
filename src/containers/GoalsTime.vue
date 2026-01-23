<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.goals.loading || (rangeType === 'past' && $apollo.queries.pastGoals.loading)">
    <v-card
      dark
      flat
      class="image-card"
    >
      <v-btn
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
        <v-icon>widgets</v-icon>
      </v-btn>
      <v-btn
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
        <v-icon>add</v-icon>
      </v-btn>
      <v-img
        src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
        gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
      >
        <v-container fill-height>
          <v-layout align-center>
            <strong class="display-4 font-weight-regular mr-4">{{getLifetimeGoalsCount()}}</strong>
            <v-layout column justify-end>
              <div class="headline font-weight-light">Lifetime Goals</div>
            </v-layout>
          </v-layout>
        </v-container>
      </v-img>
    </v-card>
    <v-card-text class="image-card-page py-0 px-0">
      <template v-for="period in periods">
        <div v-if="period.name === 'day'" :key="period.name">
          <div class="text-xs-center"><h2 class="pt-4 pb-3 pl-2">{{ currentMonth }}</h2></div>
          <v-sheet>
            <v-calendar
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
            </v-calendar>
          </v-sheet>
          <v-layout>
            <v-flex
              xs4
              class="text-xs-left"
            >
              <v-btn outline color="primary" @click="$refs.calendar[0].prev()">
                <v-icon
                  left
                  dark
                >
                  keyboard_arrow_left
                </v-icon>
                Prev
              </v-btn>
            </v-flex>
            <v-flex xs4></v-flex>
            <v-flex
              xs4
              class="text-xs-right"
            >
              <v-btn outline color="primary" @click="$refs.calendar[0].next()">
                Next
                <v-icon
                  right
                  dark
                >
                  keyboard_arrow_right
                </v-icon>
              </v-btn>
            </v-flex>
          </v-layout>
          <div class="text-xs-center pt-3 pb-3" >
            <v-btn-toggle v-model="rangeType" >
              <v-btn flat value="upcoming">
                Upcoming
              </v-btn>
              <v-btn flat value="past">
                Past
              </v-btn>
              <v-btn flat value="all">
                All
              </v-btn>
            </v-btn-toggle>
          </div>
        </div>
        <div v-else :key="`${period.name}-filter`">
          <goals-filter-time
            :key="period.name"
            :goals="allGoals"
            :periodFilter="period.name"
            :rangeType="rangeType"
            :updateNewGoalItem="updateNewGoalItem"
          />
        </div>
      </template>
    </v-card-text>
    <v-dialog
      v-model="addGoalItemDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="closeGoalItemDialog()">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ goalActionText || 'Add Goal'}}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card>
          <v-card-text class="pa-0">
            <goal-creation :newGoalItem="newGoalItem" v-on:add-update-goal-entry="addUpdateGoalEntry" />
          </v-card-text>
        </v-card>
      </v-card>
    </v-dialog>
    <v-dialog v-model="goalDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="goalDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>{{selectedDayGoalTitle}}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <goal-item-list @update-new-goal-item="updateNewGoalItem" :goal="selectedDayGoal" :editMode="true" />
      </v-card>
    </v-dialog>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import { MeasurementMixin } from '@/utils/measurementMixins.js';

import { defaultGoalItem, periodsArray } from '../constants/goals';

import GoalItemList from '../components/organisms/GoalItemList/GoalItemList.vue';
import GoalsFilterTime from '../components/organisms/GoalsFilterTime/GoalsFilterTime.vue';
import GoalCreation from '../components/organisms/GoalCreation/GoalCreation.vue';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';

export default {
  mixins: [MeasurementMixin],
  components: {
    GoalItemList,
    GoalCreation,
    GoalsFilterTime,
    ContainerBox,
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
    goalActionText: 'Add Goal',
    groupId: '',
    defaultGoalItem,
    newGoalItem: {
      body: '',
      deadline: '',
      contribution: '',
      reward: '',
      isComplete: false,
      isMilestone: false,
      taskRef: '',
      goalRef: '',
      tags: [],
    },
    periods: periodsArray,
    rangeType: 'upcoming',
    goalDialog: false,
    selectedDayGoalTitle: '',
    selectedDayGoal: {}
  }),
  methods: {
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
        this.selectedDayGoal = this.goalsMap[date][0];
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
