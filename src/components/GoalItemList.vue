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
              goalItem.isMilestone,
              goalItem.goalRef,
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
        <v-list-tile-action v-if="lastCompleteItemId === goalItem.id && animateEntry">
          <div style="width: 150px">
            <streak-checks :progress="progress || 0" :animate="true"></streak-checks>
          </div>
        </v-list-tile-action>
        <v-list-tile-action v-else>
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

import StreakChecks from './StreakChecks.vue';

export default {
  props: ['goal', 'editMode', 'newGoalItem', 'progress'],
  components: {
    StreakChecks,
  },
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      goalItem: [],
      animateEntry: false,
      lastCompleteItemId: '',
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
      }).catch(() => {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    completeGoalItemText(goalItem, period, date) {
      // eslint-disable-next-line no-param-reassign
      goalItem.period = period;
      // eslint-disable-next-line no-param-reassign
      goalItem.date = date;
      this.$emit('toggle-goal-display-dialog', goalItem, true);
    },
    completeGoalItem(id, isComplete, period, date, taskRef, isMilestone, goalRef) {
      this.lastCompleteItemId = id;
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
      })
        .then(() => (this.$emit('refresh-task-goal', goalRef)))
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
    editGoalItem(goalItem, period, date) {
      this.$emit('update-new-goal-item', goalItem, period, date);
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
