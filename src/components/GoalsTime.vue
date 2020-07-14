<script>
/* eslint-disable max-len */
</script>
<template>
  <v-layout row >
    <v-flex xs12 sm6 offset-sm3>
      <v-card
          class="mx-auto"
          max-width="600"
        >
        <v-card-text class="py-0 px-0">
          <v-list subheader>
            <v-subheader
              class="subheading"
            >
              Goals
            </v-subheader>
            <div v-if="goals && goals.length">
              <v-list-group
                v-for="goal in goals"
                :key="goal.id"
                no-action
              >
                <template v-slot:activator>
                  <v-list-tile>
                    <v-list-tile-content>
                      <v-list-tile-title>{{ goal.period }} {{ goal.date }}</v-list-tile-title>
                    </v-list-tile-content>
                  </v-list-tile>
                </template>
                <goal-item-list @update-new-goal-item="updateNewGoalItem" :goal="goal" :editMode="true" />
              </v-list-group>
            </div>
            <div class="text-xs-center" v-else>
              You Don't have any Goals in life. Poor Fellow.
            </div>
          </v-list>
        </v-card-text>
        <v-btn
          absolute
          dark
          fab
          top
          class="second-right-btn"
          color="info"
          @click="$router.push('/goals/milestones')"
        >
          <v-icon>widgets</v-icon>
        </v-btn>
        <v-btn
          absolute
          dark
          fab
          top
          right
          color="info"
          @click="addGoalItemDialog = true"
        >
          <v-icon>add</v-icon>
        </v-btn>
      </v-card>
    </v-flex>
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
  </v-layout>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import redirectOnError from '../utils/redirectOnError';
import { defaultGoalItem } from '../constants/goals';

import GoalItemList from './GoalItemList.vue';
import GoalCreation from './GoalCreation.vue';

export default {
  components: {
    GoalItemList,
    GoalCreation,
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
