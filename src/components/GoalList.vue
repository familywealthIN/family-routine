<template>
  <v-layout row wrap>
    <v-flex xs12 d-flex>
      <div class="pl-3 pr-3 formGoal mt-3 mb-2">
        <v-text-field
          clearable
          v-model="newGoalItem.body"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="inputGoal"
          @keyup.enter="addGoalItem"
        >
        </v-text-field>
        <v-btn
          icon
          color="success"
          fab
          dark
          class="ml-3 mr-0"
          @click="addGoalItem(newGoalItem)"
        >
          <v-icon dark>send</v-icon>
        </v-btn>
      </div>
    </v-flex>
    <v-flex xs12 d-flex>
      <v-select
        class="pl-3 pr-3"
        :items="tasklist"
        v-model="newGoalItem.taskRef"
        item-text="name"
        item-value="id"
        label="Routine Task"
      ></v-select>
    </v-flex>
    <v-flex class="pl-3" v-if="showMilestoneOption" xs6 d-flex>
    <v-checkbox
      v-model="newGoalItem.isMilestone"
      label="Milestone?"
    ></v-checkbox>
    </v-flex>
    <v-flex class="pr-3" v-if="newGoalItem.isMilestone" xs6 d-flex>
      <v-select
        :items="goalItemsRef"
        v-model="newGoalItem.goalRef"
        item-text="body"
        item-value="id"
        label="Goal Task"
      ></v-select>
    </v-flex>
  </v-layout>
</template>
<script>
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';
import { stepupMilestonePeriodDate, periodGoalDates } from '../utils/getDates';

export default {
  props: ['goals', 'date', 'period', 'tasklist', 'goalDetailsDialog', 'selectedTaskRef'],
  apollo: {
    goalItemsRef: {
      query: gql`
        query goalDatePeriod($period: String!, $date: String!) {
          goalDatePeriod(period: $period, date: $date) {
            id
            date
            period
            goalItems {
              id
              body
            }
          }
        }
      `,
      update(data) {
        this.loading = false;
        return data.goalDatePeriod && data.goalDatePeriod.date
          ? data.goalDatePeriod.goalItems
          : [];
      },
      variables() {
        return {
          ...stepupMilestonePeriodDate(this.period, this.date),
        };
      },
      error() {
        this.loading = false;
      },
    },
  },
  data() {
    return {
      show: true,
      newGoalItem: {
        body: '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
      },
      defaultGoalItem: {
        body: '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
      },
      goalItem: [],
      showMilestoneOption: true,
    };
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
    addGoalItem() {
      const value = this.newGoalItem.body && this.newGoalItem.body.trim();
      const date = periodGoalDates(this.period, this.date);
      const goal = this.getGoal(this.period, date);

      if (!value) {
        return;
      }

      this.$apollo.mutate({
        mutation: gql`
          mutation addGoalItem(
            $body: String!
            $period: String!
            $date: String!
            $isComplete: Boolean!
            $isMilestone: Boolean!
            $goalRef: String
            $taskRef: String
          ) {
            addGoalItem(
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
              isMilestone: $isMilestone
              goalRef: $goalRef,
              taskRef: $taskRef,
            ) {
              id
              body
              isComplete
              isMilestone
              goalRef
              taskRef
            }
          }
        `,
        variables: {
          body: this.newGoalItem.body,
          period: this.period,
          date,
          isComplete: false,
          isMilestone: this.newGoalItem.isMilestone,
          goalRef: this.newGoalItem.goalRef,
          taskRef: this.newGoalItem.taskRef,
        },
        update: (scope, { data: { addGoalItem } }) => {
          goal.goalItems.push({
            id: addGoalItem.id,
            body: this.newGoalItem.body,
            isMilestone: this.newGoalItem.isMilestone,
            isComplete: false,
            goalRef: this.newGoalItem.goalRef,
            taskRef: this.newGoalItem.taskRef,
          });
          this.newGoalItem = { ...this.defaultGoalItem };
          this.$emit('toggle-goal-details-dialog', false);
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
  },
  watch: {
    selectedTaskRef(val) {
      this.newGoalItem.taskRef = val;
      this.defaultGoalItem.taskRef = val;
    },
  },
};
</script>

<style lang="stylus" scoped>
  .completed {
    text-decoration: line-through;
  }

  .formGoal {
    display: flex;
    grid-column: 2;
    width: 100%;
  }

  .inputGoal {
    display:inline-block;
    flex-shrink: 0;
    flex-grow: 1;
  }
</style>
