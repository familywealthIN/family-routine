<template>
  <div class="timeline-item-list">
    <template v-for="(goalItem, i) in goal.goalItems">
      <v-timeline-item
        :class="`${periodPadding(period)} mb-0 pb-0`"
        :color="goalItem.isComplete ? 'green' : 'grey'"
        v-bind:key="goalItem.id"
        align-middle
        small
      >
        <v-layout align-center justify-space-between>
          <v-flex> {{ goalItem.body }} {{ progressText(goal.period, goalItem.progress) }} </v-flex>
          <v-flex xs5 text-xs-right>
            <span v-if="editMode">
              <v-btn flat icon @click="editGoalItem(goalItem, goal.period, goal.date)">
                <v-icon>edit</v-icon>
              </v-btn>
            </span>
            <span>
              <v-btn flat icon @click="deleteGoalItem(i, goal.period, goal.date)">
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
import { threshold } from '../utils/getDates';

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
    periodPadding(period) {
      if (period === 'month') {
        return 'month-padding';
      }
      if (period === 'week') {
        return 'week-padding';
      }
      if (period === 'day') {
        return 'day-padding';
      }
      return '';
    },
    progressText(period, progress) {
      if (period === 'year') {
        return `(${progress || 0}/${threshold.yearMonths})`;
      }
      if (period === 'month') {
        return `(${progress || 0}/${threshold.monthWeeks})`;
      }
      if (period === 'week') {
        return `(${progress || 0}/${threshold.weekDays})`;
      }
      return '';
    },
    progressPercent(period, progress) {
      if (period === 'year') {
        return progress ? (progress / 10) * 100 : 0;
      }
      if (period === 'month') {
        return progress ? (progress / 3) * 100 : 0;
      }
      if (period === 'week') {
        return progress ? (progress / 5) * 100 : 0;
      }
      return 0;
    },
    deleteGoalItem(index, period, date) {
      const { id } = this.goal.goalItems[index];
      this.goal.goalItems.splice(index, 1);
      this.$emit('delete-task-goal', id);

      this.$apollo
        .mutate({
          mutation: gql`
            mutation deleteGoalItem($id: ID!, $period: String!, $date: String!) {
              deleteGoalItem(id: $id, period: $period, date: $date) {
                id
              }
            }
          `,
          variables: {
            id,
            period,
            date,
          },
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
    editGoalItem(goalItem, period, date) {
      this.$emit('update-new-goal-item', goalItem, period, date);
    },
  },
};
</script>

<style>
.month-padding {
  padding-left: 32px !important;
}
.week-padding {
  padding-left: 48px !important;
}
.day-padding {
  padding-left: 72px !important;
}
</style>
