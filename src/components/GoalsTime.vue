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
        <v-card
          dark
          flat
        >
          <v-btn
            absolute
            bottom
            color="info"
            right
            fab
            @click="addGoalItemDialog = true"
          >
            <v-icon>add</v-icon>
          </v-btn>
          <v-img
            src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
            gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
          >
            <v-container fill-height>
              <v-layout align-center>
                <strong class="display-4 font-weight-regular mr-4">{{(goals && goals.length) || 0}}</strong>
                <v-layout column justify-end>
                  <div class="headline font-weight-light">Goals</div>
                </v-layout>
              </v-layout>
            </v-container>
          </v-img>
        </v-card>
        <v-card-text class="py-0 px-0">
          <v-list subheader>
            <v-subheader
              class="subheading"
            >
              Goals
            </v-subheader>
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
              <goal-item-list @update-new-goal-item="updateNewGoalItem" :goal="goal"/>
            </v-list-group>
          </v-list>
        </v-card-text>
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
          <v-toolbar-title>{{ settingsName || 'Settings'}}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card>
          <v-card-text>
            <goal-creation :newGoalItem="newGoalItem" />
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
            deadline
            contribution
            reward
            isComplete
            isMilestone
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
    settingsName: '',
    groupId: '',
    defaultGoalItem: {
      body: '',
      deadline: '',
      contribution: '',
      reward: '',
      isComplete: false,
      isMilestone: false,
      taskRef: '',
      goalRef: '',
    },
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
    updateNewGoalItem(goalItem, period, date) {
      console.log('updateNewGoalItem');
      this.newGoalItem = {
        ...goalItem,
        period,
        date,
      }
      this.addGoalItemDialog = true;
    },
    closeGoalItemDialog() {
      this.newGoalItem = {...this.defaultGoalItem};
      this.addGoalItemDialog = false;
    }
  },
};
</script>

<style>
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
