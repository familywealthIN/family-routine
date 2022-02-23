<template>
  <div>
    <template v-for="(subTaskItem, i) in subTasks">
      <v-list-tile v-bind:key="subTaskItem.id">
        <v-list-tile-action>
          <v-checkbox
            v-model="subTaskItem.isComplete"
            @change="completeSubTaskItem(
              subTaskItem.id,
              subTaskItem.isComplete,
            )"
          ></v-checkbox>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title :class="{ completed: subTaskItem.isComplete}">
            {{subTaskItem.body}}
          </v-list-tile-title>
        </v-list-tile-content>
        <v-list-tile-action>
          <v-btn
            flat
            icon
            @click="deleteSubTaskItem(subTaskItem, i)"
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
  props: ['subTasks', 'editMode', 'newGoalItem', 'taskId', 'date', 'period'],

  data() {
    return {
      show: true,
      newGoalItemBody: '',
      subTaskItem: [],
      animateEntry: false,
      lastCompleteItemId: '',
    };
  },
  methods: {
    deleteSubTaskItem(subTaskItem, index) {
      const { id } = subTaskItem;
      const { taskId, period, date } = this;
      this.subTasks.splice(index, 1);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteSubTaskItem(
            $id: ID!
            $taskId: ID!
            $period: String!
            $date: String!
          ) {
            deleteSubTaskItem(
              id: $id
              taskId: $taskId,
              period: $period
              date: $date
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          taskId,
          period,
          date,
        },
      }).catch((error) => {
        redirectOnError(this.$router, error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    completeSubTaskItem(id, isComplete) {
      this.lastCompleteItemId = id;
      const {
        period,
        date,
        taskId,
      } = this;

      this.$apollo.mutate({
        mutation: gql`
          mutation completeSubTaskItem(
            $id: ID!
            $taskId: ID!
            $period: String!
            $date: String!
            $isComplete: Boolean!
          ) {
            completeSubTaskItem(
              id: $id
              taskId: $taskId
              period: $period
              date: $date
              isComplete: $isComplete
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          taskId,
          period,
          date,
          isComplete: Boolean(isComplete),
        },
      })
        // .then(() => (this.$emit('refresh-task-goal', goalRef)))
        .catch((error) => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
          redirectOnError(this.$router, error);
        });
    },
  },
  watch: {
    progress(val, oldVal) {
      if (val !== oldVal) {
        this.animateEntry = true;
        setTimeout(() => { this.animateEntry = false; }, 2000);
      }
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
