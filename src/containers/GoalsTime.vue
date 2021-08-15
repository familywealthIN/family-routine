<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.goals.loading">
    <v-card-text class="py-0 px-0">
      <template v-for="period in periods">
        <div v-if="period.name === 'day'" :key="period.name">
          <div class="text-xs-center"><h2 class="pt-3 pb-2 pl-2">{{ currentMonth }}</h2></div>
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
        <div v-else :key="period.name">
          <goals-filter-time
            :key="period.name"
            :goals="goals"
            :periodFilter="period.name"
            :rangeType="rangeType"
            :updateNewGoalItem="updateNewGoalItem"
          />
        </div>
      </template>
    </v-card-text>
    <v-btn
      fixed
      dark
      fab
      bottom
      class="second-right-btn"
      color="info"
      @click="$router.push('/goals/milestones')"
    >
      <v-icon>widgets</v-icon>
    </v-btn>
    <v-btn
      fixed
      dark
      fab
      bottom
      right
      color="info"
      @click="addGoalItemDialog = true"
    >
      <v-icon>add</v-icon>
    </v-btn>
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
          <v-card-text>
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

import redirectOnError from '../utils/redirectOnError';
import { defaultGoalItem, periodsArray } from '../constants/goals';

import GoalItemList from '../components/GoalItemList.vue';
import GoalsFilterTime from '../components/GoalsFilterTime.vue';
import GoalCreation from '../components/GoalCreation.vue';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  components: {
    GoalItemList,
    GoalCreation,
    GoalsFilterTime,
    ContainerBox,
  },
  apollo: {
    goals: gql`
      query {
        goals {
          id
          date
          period
          goalItems {
            id
            body
            isComplete
            isMilestone
            contribution,
            reward,
            taskRef
            goalRef
          }
        }
      }
    `,
  },
  computed: {
    date() {
      return moment().format('DD-MM-YYYY');
    },
    // convert the list of events into a map of lists keyed by date
    goalsMap() {
      const map = {};
      if(this.goals) {
        this.goals.forEach((goal) => {
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
    end: '2021-12-01',
    currentMonth: moment().format('MMMM YYYY'),
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
    },
    periods: periodsArray,
    rangeType: 'upcoming',
    goalDialog: false,
    selectedDayGoalTitle: '',
    selectedDayGoal: {}
  }),
  methods: {
    updateRange({ start }) {
      this.currentMonth = moment(start.date, 'YYYY-MM-DD').format('MMMM YYYY');
    },
    formatCalendarDate(date) {
      return moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    },
    getGoal(period, date) {
      const goal = this.goals.find((aGoal) => aGoal.period === period && aGoal.date === date);
      if (!goal) {
        const newGoal = {
          id: `${Math.random()}`,
          period,
          date,
          goalItems: [],
        };
        this.goals.push(newGoal);
        return newGoal;
      }

      return goal;
    },
    updateNewGoalItem(goalItem, period, date) {
      this.newGoalItem = {
        ...goalItem,
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
        const goalItemIndex = goal.goalItems.indexOf(goalItem);
        Object.assign(goal.goalItems[goalItemIndex], newGoalItem);
      } else {
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
