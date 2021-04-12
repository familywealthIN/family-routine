<template>
  <div>
    <template v-for="(goalItem, i) in goal.goalItems">
      <v-timeline-item
        class="mb-0 pb-0"
        :color="goalItem.isComplete ? 'green' : 'grey'"
        v-bind:key="goalItem.id"
        align-middle
        small
      >
        <v-layout align-center justify-space-between>
          <v-flex>
            {{goalItem.body}} {{progressText(goal.period, goalItem.progress)}}
          </v-flex>
          <v-flex xs5 text-xs-right>
            <span v-if="editMode">
              <v-btn
                flat
                icon
                @click="editGoalItem(goalItem, goal.period, goal.date)"
              >
                <v-icon>edit</v-icon>
              </v-btn>
            </span>
            <span>
              <v-btn
                flat
                icon
                @click="deleteGoalItem(i, goal.period, goal.date)"
              >
                <v-icon>delete</v-icon>
              </v-btn>
            </span>
          </v-flex>
        </v-layout>
        <v-progress-linear
          color="success"
          v-if="goal.period !== 'day' && goalItem.progress !== null"
          :value="progressPercent(goal.period, goalItem.progress)"
        ></v-progress-linear>
      </v-timeline-item>
    </template>
  </div>
</template>
<script>
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';

export default {
  props: ['goal', 'editMode', 'newGoalItem', 'period'],
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      goalItem: [],
    };
  },
  methods: {
    progressText(period, progress) {
      if (period === 'year') {
        return `(${progress}/10)`;
      } if (period === 'month') {
        return `(${progress}/3)`;
      } if (period === 'week') {
        return `(${progress}/5)`;
      }
      return '';
    },
    progressPercent(period, progress) {
      if (period === 'year') {
        return (progress / 10) * 100;
      } if (period === 'month') {
        return (progress / 3) * 100;
      } if (period === 'week') {
        return (progress / 5) * 100;
      }
      return 0;
    },
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
    editGoalItem(goalItem, period, date) {
      this.$emit('update-new-goal-item', goalItem, period, date);
    },
  },
};
</script>
