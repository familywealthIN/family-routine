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
      <v-flex xs12 d-flex>
        <goal-tags-input
          :goalTags="selectedGoalItem.tags"
          :userTags="userTags"
          @update-new-tag-items="updateNewTagItems"
        ></goal-tags-input>
      </v-flex>
      <v-flex xs12 v-if="selectedGoalItem.id && selectedGoalItem.period === 'day'">
        <sub-task-item-list
          :subTasks="selectedGoalItem.subTasks"
          :taskId="selectedGoalItem.id"
          :period="selectedGoalItem.period"
          :date="selectedGoalItem.date"
          @update-sub-task-items="updateSubTaskItems"
        />
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
            :disabled="!valid"
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
import GoalTagsInput from './GoalTagsInput.vue';

import {
  getDatesOfYear,
  getWeeksOfYear,
  getMonthsOfYear,
  getYearsOfLife,
  stepupMilestonePeriodDate,
} from '../utils/getDates';
import getJSON from '../utils/getJSON';
import { USER_TAGS } from '../constants/settings';

export default {
  props: ['selectedGoalItem'],
  components: {
    SubTaskItemList,
    GoalTagsInput,
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
              taskRef
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
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
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
        tags = [],
      } = this.selectedGoalItem;

      if (!body) {
        return;
      }

      this.setLocalUserTag(tags);

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
            $tags: [String]
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
              tags: $tags
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
          tags,
        },
        update: (scope, { data: { updateGoalItem } }) => {
          console.log(updateGoalItem);
          this.$emit('toggle-goal-display-dialog', false, updateGoalItem);
          this.resetForm();
        },
      }).catch(() => {
        this.resetForm();
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
    updateNewTagItems(tags) {
      this.selectedGoalItem.tags = tags;
    },
    updateSubTaskItems(subTasks) {
      this.newGoalItem.subTasks = subTasks;
    },
    setLocalUserTag(newTags) {
      const userTags = getJSON(localStorage.getItem(USER_TAGS), []);
      newTags.forEach((tag) => {
        if (!userTags.includes(tag)) {
          userTags.push(tag);
        }
      });
      localStorage.setItem(USER_TAGS, JSON.stringify(userTags));
      this.userTags = [...userTags];
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
</style>
