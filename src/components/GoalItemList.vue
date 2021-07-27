<template>
  <div>
    <template v-for="(goalItem, i) in goal.goalItems">
      <v-list-tile v-bind:key="goalItem.id">
        <v-list-tile-action>
          <v-checkbox
            v-model="goalItem.isComplete"
            @change="completeGoalItem(
              goalItem.id,
              goalItem.isComplete,
              goal.period,
              goal.date,
              goalItem.taskRef,
              goalItem.isMilestone
            )"
          ></v-checkbox>
        </v-list-tile-action>
        <v-list-tile-content
          @click="completeGoalItemText(goalItem, goal.period, goal.date, goalItem.taskRef)"
        >
        <v-list-tile-title :class="{ completed: goalItem.isComplete}">
          {{goalItem.body}}
        </v-list-tile-title>
        <!-- <v-list-tile-sub-title
          v-if="goalItem.isMilestone"
        >
          The goal is a milestone
        </v-list-tile-sub-title> -->
        </v-list-tile-content>
        <v-list-tile-action v-if="editMode">
          <v-btn
            flat
            icon
            @click="editGoalItem(goalItem, goal.period, goal.date)"
          >
            <v-icon>edit</v-icon>
          </v-btn>
        </v-list-tile-action>
        <v-list-tile-action>
          <v-btn
            flat
            icon
            @click="deleteGoalItem(i, goal.period, goal.date)"
          >
            <v-icon>delete</v-icon>
          </v-btn>
        </v-list-tile-action>
      </v-list-tile>
    </template>
  </div>
</template>
<script>
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';

export default {
  props: ['goal', 'editMode', 'newGoalItem'],
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      goalItem: [],
    };
  },
  methods: {
    deleteGoalItem(index, period, date) {
      const { id } = this.goal.goalItems[index];
      this.goal.goalItems.splice(index, 1);
      this.$emit('delete-task-goal', id);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteGoalItem(
            $id: ID!
            $period: String!
            $date: String!
          ) {
            deleteGoalItem(
              id: $id
              period: $period
              date: $date
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          period,
          date,
        },
        error: (error) => {
          redirectOnError(this.$router, error);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        },
      });
    },
    completeGoalItemText(goalItem, period, date, taskRef) {
      // eslint-disable-next-line no-param-reassign
      goalItem.isComplete = !goalItem.isComplete;
      this.completeGoalItem(goalItem.id, goalItem.isComplete, period, date, taskRef, goalItem.isMilestone);
    },
    completeGoalItem(id, isComplete, period, date, taskRef, isMilestone) {
      this.$apollo.mutate({
        mutation: gql`
          mutation completeGoalItem(
            $id: ID!
            $period: String!
            $date: String!
            $taskRef: String!
            $isComplete: Boolean!
            $isMilestone: Boolean!
          ) {
            completeGoalItem(
              id: $id
              period: $period
              date: $date
              taskRef: $taskRef
              isComplete: $isComplete
              isMilestone: $isMilestone
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          period,
          date,
          taskRef,
          isComplete: Boolean(isComplete),
          isMilestone: Boolean(isMilestone),
        },
        error: (error) => {
          redirectOnError(this.$router, error);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        },
      });
    },
    editGoalItem(goalItem, period, date) {
      this.$emit('update-new-goal-item', goalItem, period, date);
    },
  },
};
</script>

<style>
  .completed {
    text-decoration: line-through;
  }
  .v-list__group__items--no-action .v-list__tile {
    padding-left: 16px;
  }
</style>
