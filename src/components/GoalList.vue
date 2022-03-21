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
          class="ml-3 mr-0"
          :loading="buttonLoading"
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
  props: ['goals', 'selectedBody', 'date', 'period', 'tasklist', 'goalDetailsDialog', 'selectedTaskRef'],
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
              taskRef
            }
          }
        }
      `,
      update(data) {
        this.loading = false;
        this.goalItems = data && data.goalDatePeriod && data.goalDatePeriod.goalItems;
        return data.goalDatePeriod && data.goalDatePeriod.date
          ? this.groupGoalItemsRef(data.goalDatePeriod.goalItems)
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
      buttonLoading: false,
      newGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
      },
      defaultGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
      },
      goalItems: [],
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
      this.buttonLoading = true;
      const value = this.newGoalItem.body && this.newGoalItem.body.trim();
      const date = periodGoalDates(this.period, this.date);
      const goal = this.getGoal(this.period, date);

      if (!value) {
        this.buttonLoading = false;
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
          this.buttonLoading = false;
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
    sortTimes(array) {
      return array.sort((a, b) => {
        const [aHours, aMinutes] = a.time.split(':');
        const [bHours, bMinutes] = b.time.split(':');

        if (parseInt(aHours, 10) - parseInt(bHours, 10) === 0) {
          return parseInt(aMinutes, 10) - parseInt(bMinutes, 10);
        }
        return parseInt(aHours, 10) - parseInt(bHours, 10);
      });
    },
    groupGoalItemsRef(goalItems) {
      const groupedGoalItems = [];
      let currentTaskRef = '';
      goalItems.sort((a, b) => {
        if (a.taskRef < b.taskRef) { return -1; }
        if (a.taskRef > b.taskRef) { return 1; }
        return 0;
      });

      goalItems.forEach((goalItem) => {
        const timeTask = this.tasklist.find((task) => task.id === goalItem.taskRef);
        // eslint-disable-next-line no-param-reassign
        goalItem.time = timeTask.time;
      });

      this.sortTimes(goalItems);

      goalItems.forEach((goalItem) => {
        if (goalItem.taskRef !== currentTaskRef) {
          currentTaskRef = goalItem.taskRef;
          const selectedTask = this.tasklist.find((task) => task.id === currentTaskRef);
          groupedGoalItems.push({ header: selectedTask.name });
        }

        groupedGoalItems.push(goalItem);
      });

      this.autoSelectGoalRef();

      return groupedGoalItems;
    },
    autoSelectGoalRef() {
      if (this.goalItems && this.goalItems.length) {
        this.goalItems.forEach((goalItem) => {
          if (this.selectedTaskRef && goalItem.taskRef === this.selectedTaskRef) {
            this.newGoalItem.goalRef = goalItem.id;
          }
        });
      }
    },
  },
  watch: {
    selectedBody(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
          body: newVal,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          body: newVal,
        };
      }
    },
    selectedTaskRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
        };
        this.autoSelectGoalRef();
      }
    },
    period(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
        };
      }
    },
  },
};
</script>

<style>
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

  .v-select-list .v-subheader {
    padding: 0 8px 0 8px;
    height: 30px;
    border-bottom: 1px solid #ccc;
  }
</style>
