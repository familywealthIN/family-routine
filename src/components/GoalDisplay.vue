<template>
  <v-form
    ref="form"
    v-model="valid"
  >
    <v-layout wrap >
      <v-flex xs12 d-flex>
        <v-text-field
          v-model="selectedGoalItem.body"
          id="selectedGoalItemBody"
          name="selectedGoalItemBody"
          label="Type your task"
          class="inputGoal"
          :rules="formRules.body"
          required
        >
        </v-text-field>
      </v-flex>
      <v-flex xs4 d-flex>
        <v-select
          :items="periodOptionList"
          :disabled="true"
          v-model="selectedGoalItem.period"
          item-text="label"
          item-value="value"
          :rules="formRules.dropDown"
          label="Period"
          required
        ></v-select>
      </v-flex>
      <v-flex v-if="dateOptionList.length" xs8 d-flex>
        <v-select
          :items="dateOptionList"
          :disabled="true"
          v-model="selectedGoalItem.date"
          item-text="label"
          item-value="value"
          :rules="formRules.dropDown"
          label="Date"
          required
        ></v-select>
      </v-flex>
      <v-flex v-else xs8 d-flex>
      </v-flex>
      <v-flex xs12 d-flex>
        <v-select
          :items="tasklist"
          :disabled="true"
          v-model="selectedGoalItem.taskRef"
          item-text="name"
          item-value="id"
          label="Routine Task"
        ></v-select>
      </v-flex>
      <v-flex v-if="showMilestoneOption" xs6 d-flex>
        <v-checkbox
          :disabled="true"
          v-model="selectedGoalItem.isMilestone"
          label="Milestone?"
        ></v-checkbox>
      </v-flex>
      <v-flex v-if="selectedGoalItem.isMilestone" xs6 d-flex>
        <v-select
          :disabled="true"
          :items="goalItemsRef"
          v-model="selectedGoalItem.goalRef"
          item-text="body"
          item-value="id"
          label="Goal Task"
        ></v-select>
      </v-flex>
      <v-flex xs12 v-if="selectedGoalItem.period === 'day'">
        <v-card class="pl-3 pr-3 mb-3">
          <v-card-title class="headline">Sub Tasks</v-card-title>
          <div class="pl-3 pr-3 formGoal mt-3 mb-2">
            <v-text-field
              clearable
              v-model="newSubTaskItemBody"
              id="newSubTaskItemBody"
              name="newSubTaskItemBody"
              label="Type your sub task"
              class="inputGoal"
              @keyup.enter="addSubTaskItem"
            >
            </v-text-field>
            <v-btn
                icon
                color="success"
                fab
                dark
                class="ml-3 mr-0"
                @click="addSubTaskItem(newSubTaskItemBody)"
            >
                <v-icon dark>send</v-icon>
            </v-btn>
          </div>
          <v-list two-line subheader>
            <v-spacer></v-spacer>
              <v-subheader
                class="subheading"
                v-if="selectedGoalItem && selectedGoalItem.subTasks && selectedGoalItem.subTasks.length == 0"
              >
                You have 0 sub tasks
              </v-subheader>
              <v-subheader class="subheading" v-else>
                {{ selectedGoalItem && selectedGoalItem.subTasks && selectedGoalItem.subTasks.length }} sub tasks
              </v-subheader>
              <sub-task-item-list
                  :subTasks="selectedGoalItem.subTasks"
                  :taskId="selectedGoalItem.id"
                  :period="selectedGoalItem.period"
                  :date="selectedGoalItem.date"
              />
          </v-list>
        </v-card>
      </v-flex>
      <v-flex xs12>
        <v-textarea
          v-model="selectedGoalItem.contribution"
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
          v-model="selectedGoalItem.reward"
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

import SubTaskItemList from './SubTaskItemList.vue';

import redirectOnError from '../utils/redirectOnError';

import {
  getDatesOfYear,
  getWeeksOfYear,
  getMonthsOfYear,
  getYearsOfLife,
  stepupMilestonePeriodDate,
} from '../utils/getDates';

export default {
  props: ['selectedGoalItem'],
  components: {
    SubTaskItemList,
  },
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
          ...stepupMilestonePeriodDate(this.selectedGoalItem.period, this.selectedGoalItem.date),
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
      isNewItemLoaded: false,
      newSubTaskItemBody: '',
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
      switch (this.selectedGoalItem.period) {
        case 'day':
          if (this.isNewItemLoaded) {
            return getDatesOfYear(this.selectedGoalItem.date);
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
      console.log(this.selectedGoalItem.period,
        this.selectedGoalItem.date,
        this.selectedGoalItem.date !== '01-01-1970',
        this.goalItemsRef
        && this.goalItemsRef.length);
      return this.selectedGoalItem.period
        && this.selectedGoalItem.date
        && this.selectedGoalItem.date !== '01-01-1970'
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
      if (this.selectedGoalItem.period === 'lifetime') {
        this.selectedGoalItem.date = '01-01-1970';
      } else {
        this.selectedGoalItem.date = '';
      }
    },
    saveGoalItem() {
      this.$refs.form.validate();
      if (this.valid) {
        this.buttonLoading = true;
        if (this.selectedGoalItem.id) {
          this.updateGoalItem();
        }
      }
    },
    addSubTaskItem() {
      const value = this.newSubTaskItemBody && this.newSubTaskItemBody.trim();

      if (!value) {
        return;
      }

      const { date, id } = this.selectedGoalItem;

      this.$apollo.mutate({
        mutation: gql`
          mutation addSubTaskItem(
            $taskId: ID!
            $body: String!
            $period: String!
            $date: String!
            $isComplete: Boolean!
          ) {
            addSubTaskItem(
              taskId: $taskId
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
            ) {
              id
              body
              isComplete
            }
          }
        `,
        variables: {
          taskId: id,
          body: this.newSubTaskItemBody,
          period: 'day',
          date,
          isComplete: false,
        },
        update: (scope, { data: { addSubTaskItem } }) => {
          if (!this.selectedGoalItem.subTasks) {
            this.selectedGoalItem.subTasks = [];
          }

          this.selectedGoalItem.subTasks = [
            ...this.selectedGoalItem.subTasks,
            {
              id: addSubTaskItem.id,
              body: this.newSubTaskItemBody,
              isComplete: false,
            }
          ];
          this.newSubTaskItemBody = '';
        },
        error: (error) => {
          console.log('show task adding error', error);
        },
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
      } = this.selectedGoalItem;

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
          // const goalItem = {
          //   ...this.selectedGoalItem,
          //   id: updateGoalItem.id,
          // };
          this.$emit('toggle-goal-display-dialog', false);
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
    selectedGoalItem(newVal, oldVal) {
      this.isNewItemLoaded = !!newVal.id && (oldVal.date === '' || typeof oldVal.date === 'undefined');
      const isNewDateItemLoaded = newVal.date !== oldVal.date && (oldVal.date === '' || typeof oldVal.date === 'undefined');
      if (isNewDateItemLoaded || (this.goalItemsRef && this.goalItemsRef.length === 0)) {
        this.triggerGoalItemsRef();
      }
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

  .headline {
    color: rgba(0, 0, 0, 0.54);
    font-size: 14px !important;
    line-height: 16px !important;
    font-weight: bold;
  }
</style>
