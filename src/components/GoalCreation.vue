<template>
  <v-form
    ref="form"
    v-model="valid"
  >
    <v-layout wrap >
      <v-flex xs12 d-flex>
        <v-text-field
          v-model="newGoalItem.body"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="inputGoal"
          :rules="formRules.body"
          @keyup.enter="addGoalItem"
          required
        >
        </v-text-field>
      </v-flex>
      <v-flex xs4 d-flex>
        <v-select
          :items="periodOptionList"
          :disabled="newItemLoaded"
          v-model="newGoalItem.period"
          item-text="label"
          item-value="value"
          :rules="formRules.dropDown"
          label="Period"
          @change="updatePeriod()"
          required
        ></v-select>
      </v-flex>
      <v-flex v-if="dateOptionList.length" xs8 d-flex>
        <v-select
          :items="dateOptionList"
          :disabled="newItemLoaded"
          v-model="newGoalItem.date"
          item-text="label"
          item-value="value"
          :rules="formRules.dropDown"
          label="Date"
          @change="triggerGoalItemsRef()"
          required
        ></v-select>
      </v-flex>
      <v-flex v-else xs8 d-flex>
      </v-flex>
      <v-flex xs12 d-flex>
        <v-select
          :items="tasklist"
          v-model="newGoalItem.taskRef"
          item-text="name"
          item-value="id"
          label="Routine Task"
        ></v-select>
      </v-flex>
      <v-flex v-if="showMilestoneOption" xs6 d-flex>
        <v-checkbox
          v-model="newGoalItem.isMilestone"
          label="Milestone?"
        ></v-checkbox>
      </v-flex>
      <v-flex v-if="newGoalItem.isMilestone" xs6 d-flex>
        <v-select
          :items="goalItemsRef"
          v-model="newGoalItem.goalRef"
          item-text="body"
          item-value="id"
          label="Goal Task"
        ></v-select>
      </v-flex>
      <v-flex xs12 v-if="newGoalItem.period === 'day'">
        <sub-task-item-list
          :subTasks="newGoalItem.subTasks"
          :taskId="newGoalItem.id"
          :period="newGoalItem.period"
          :date="newGoalItem.date"
        />
      </v-flex>
      <v-flex xs12>
        <v-textarea
          v-model="newGoalItem.contribution"
        >
          <template v-slot:label>
            <div>
              Contribution / Description
            </div>
          </template>
        </v-textarea>
      </v-flex>
      <v-flex xs12>
        <v-textarea
          v-model="newGoalItem.reward"
        >
          <template v-slot:label>
            <div>
              Reward / Resolution
            </div>
          </template>
        </v-textarea>
      </v-flex>
      <v-flex xs12>
        <div style="float: right;">
          <v-btn
            color="primary"
            :disabled="!valid || buttonLoading"
            :loading="buttonLoading"
            @click="saveGoalItem"
          >
            Save
          </v-btn>
        </div>
      </v-flex>
    </v-layout>
  </v-form>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import redirectOnError from '../utils/redirectOnError';

import {
  getDatesOfYear,
  getWeeksOfYear,
  getMonthsOfYear,
  getYearsOfLife,
  stepupMilestonePeriodDate,
} from '../utils/getDates';
import SubTaskItemList from './SubTaskItemList.vue';

export default {
  components: { SubTaskItemList },
  props: ['newGoalItem'],
  apollo: {
    tasklist: {
      query: gql`
        query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            date
            tasklist {
              id
              name
              time
              points
              ticked
              passed
              wait
            }
          }
        }
      `,
      update(data) {
        this.loading = false;
        return data.routineDate && data.routineDate.date
          ? data.routineDate.tasklist
          : [];
      },
      variables() {
        return {
          date: moment().format('DD-MM-YYYY'),
        };
      },
      error() {
        this.loading = false;
      },
    },
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
      skip() {
        return this.skipQuery;
      },
      variables() {
        return {
          ...stepupMilestonePeriodDate(this.newGoalItem.period, this.newGoalItem.date),
        };
      },
      error() {
        this.loading = false;
      },
    },
  },
  data() {
    return {
      skipQuery: true,
      valid: false,
      buttonLoading: false,
      newItemLoaded: false,
      formRules: {
        body: [
          (v) => !!v || 'Task Name is required',
          (v) => (v && v.length >= 3) || 'Name must be greater than 3 characters',
        ],
        dropDown: [(v) => !!v || 'This Option is required'],
      },
      periodOptionList: [
        {
          label: 'Day',
          value: 'day',
        },
        {
          label: 'Week',
          value: 'week',
        },
        {
          label: 'Month',
          value: 'month',
        },
        {
          label: 'Year',
          value: 'year',
        },
        {
          label: 'Lifetime',
          value: 'lifetime',
        },
      ],
    };
  },
  computed: {
    dateOptionList() {
      switch (this.newGoalItem.period) {
        case 'day':
          if (this.newItemLoaded) {
            return getDatesOfYear(this.newGoalItem.date);
          }
          return getDatesOfYear();
        case 'week':
          return getWeeksOfYear();
        case 'month':
          return getMonthsOfYear();
        case 'year':
          return getYearsOfLife();
        default:
          return [];
      }
    },
    showMilestoneOption() {
      // Important to trigger
      console.log(this.newGoalItem.period,
        this.newGoalItem.date,
        this.newGoalItem.date !== '01-01-1970',
        this.goalItemsRef
        && this.goalItemsRef.length);
      return this.newGoalItem.period
        && this.newGoalItem.date
        && this.newGoalItem.date !== '01-01-1970'
        && this.goalItemsRef
        && this.goalItemsRef.length;
    },
  },
  methods: {
    triggerGoalItemsRef() {
      this.$apollo.queries.goalItemsRef.skip = false;
      this.$apollo.queries.goalItemsRef.refetch();
    },
    updatePeriod() {
      if (this.newGoalItem.period === 'lifetime') {
        this.newGoalItem.date = '01-01-1970';
      } else {
        this.newGoalItem.date = '';
      }
    },
    saveGoalItem() {
      this.$refs.form.validate();
      if (this.valid) {
        this.buttonLoading = true;
        if (this.newGoalItem.id) {
          this.updateGoalItem();
        } else {
          this.addGoalItem();
        }
      }
    },

    addGoalItem() {
      const {
        body = '',
        period,
        date,
        deadline = '',
        contribution = '',
        reward = '',
        isComplete = false,
        isMilestone = false,
        taskRef = '',
        goalRef = '',
      } = this.newGoalItem;

      if (!body) {
        return;
      }

      this.$apollo.mutate({
        mutation: gql`
          mutation addGoalItem(
            $body: String!
            $period: String!
            $date: String!
            $isComplete: Boolean
            $isMilestone: Boolean
            $deadline: String,
            $contribution: String,
            $reward: String,
            $taskRef: String,
            $goalRef: String,
          ) {
            addGoalItem(
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
              isMilestone: $isMilestone
              deadline: $deadline,
              contribution: $contribution,
              reward: $reward,
              taskRef: $taskRef,
              goalRef: $goalRef,
            ) {
              id
              body
              isComplete
              isMilestone
            }
          }
        `,
        variables: {
          body,
          period,
          date,
          deadline: deadline || '',
          contribution: contribution || '',
          reward: reward || '',
          isComplete: isComplete || false,
          isMilestone: isMilestone || false,
          taskRef: taskRef || '',
          goalRef: goalRef || '',
        },
        update: (scope, { data: { addGoalItem } }) => {
          const goalItem = {
            ...this.newGoalItem,
            id: addGoalItem.id,
          };
          this.$emit('add-update-goal-entry', goalItem);
          this.resetForm();
        },
      }).catch((error) => {
        this.resetForm();
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
    updateGoalItem() {
      const {
        id,
        body = '',
        period,
        date,
        deadline = '',
        contribution = '',
        reward = '',
        isMilestone = false,
        taskRef = '',
        goalRef = '',
      } = this.newGoalItem;

      if (!body) {
        return;
      }

      this.$apollo.mutate({
        mutation: gql`
          mutation updateGoalItem(
            $id: ID!
            $body: String!
            $period: String!
            $date: String!
            $isMilestone: Boolean!
            $deadline: String!
            $contribution: String!
            $reward: String!
            $taskRef: String!
            $goalRef: String!
          ) {
            updateGoalItem(
              id: $id,
              body: $body
              period: $period
              date: $date
              isMilestone: $isMilestone
              deadline: $deadline,
              contribution: $contribution
              reward: $reward
              taskRef: $taskRef
              goalRef: $goalRef
            ) {
              id
              body
              isComplete
              isMilestone
            }
          }
        `,
        variables: {
          id,
          body,
          period,
          date,
          deadline: deadline || '',
          contribution: contribution || '',
          reward: reward || '',
          isMilestone: isMilestone || false,
          taskRef: taskRef || '',
          goalRef: goalRef || '',
        },
        update: (scope, { data: { updateGoalItem } }) => {
          const goalItem = {
            ...this.newGoalItem,
            id: updateGoalItem.id,
          };
          this.$emit('add-update-goal-entry', goalItem);
          this.resetForm();
        },
      }).catch((error) => {
        this.resetForm();
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
    resetForm() {
      this.buttonLoading = false;
      this.$refs.form.reset();
    },
  },
  watch: {
    newGoalItem(newVal, oldVal) {
      this.newItemLoaded = !!newVal.id && (oldVal.date === '' || typeof oldVal.date === 'undefined');
      if (newVal.date !== oldVal.date && (oldVal.date === '' || typeof oldVal.date === 'undefined')) {
        this.triggerGoalItemsRef();
      }
    },
  },
};
</script>
