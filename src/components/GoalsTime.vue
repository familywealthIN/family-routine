<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.goals.loading">
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
    <v-card-text class="py-0 px-0">
      <template v-for="period in periods">
        <goals-filter-time
          v-bind:key="period.name"
          :goals="goals"
          :periodFilter="period.name"
          :rangeType="rangeType"
          :updateNewGoalItem="updateNewGoalItem"
        />
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
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import redirectOnError from '../utils/redirectOnError';
import { defaultGoalItem, periodsArray } from '../constants/goals';

import GoalItemList from './GoalItemList.vue';
import GoalsFilterTime from './GoalsFilterTime.vue';
import GoalCreation from './GoalCreation.vue';
import ContainerBox from './ContainerBox.vue';

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
  },
  data: () => ({
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
  }),
  methods: {
  },
  methods: {
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
    }
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
