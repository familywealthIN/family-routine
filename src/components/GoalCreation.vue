<template>
  <v-form ref="form" v-model="valid">
    <v-container  style="max-width: 900px;" fill-height>
      <v-layout wrap class="goal-creation">
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
        <v-flex xs12>
          <v-card class="no-shadow">
            <v-toolbar dense class="toolbar">
              <v-btn-toggle
                small
                v-model="newGoalItem.period"
                rounded="0"
                group
                label="Period"
                @change="updatePeriod()"
                :disabled="newItemLoaded"
                required
              >
                <v-btn value="year" small :disabled="newItemLoaded">
                  Year
                </v-btn>

                <v-btn value="month" small :disabled="newItemLoaded">
                  Month
                </v-btn>

                <v-btn value="week" small :disabled="newItemLoaded">
                  Week
                </v-btn>

                <v-btn value="day" small :disabled="newItemLoaded">
                  Day
                </v-btn>
              </v-btn-toggle>
              <!-- <v-select
                :items="periodOptionList"
                :disabled="newItemLoaded"
                v-model="newGoalItem.period"
                item-text="label"
                item-value="value"
                :rules="formRules.dropDown"
                label="Period"
                @change="updatePeriod()"
                required
              ></v-select> -->
              <v-select
                prepend-inner-icon="event"
                small
                class="ml-1 mr-1"
                v-if="dateOptionList.length"
                :items="dateOptionList"
                :disabled="newItemLoaded"
                v-model="newGoalItem.date"
                item-text="label"
                item-value="value"
                :rules="formRules.dropDown"
                label="Date"
                @change="triggerGoalItemsRef()"
                solo
                required
              ></v-select>
              <v-select
                small
                prepend-inner-icon="history"
                class="ml-1 mr-1"
                :items="tasklist"
                :disabled="newItemLoaded"
                v-model="newGoalItem.taskRef"
                item-text="name"
                item-value="id"
                label="Routine Task"
                solo
              ></v-select>
              <template v-if="showMilestoneOption">
                <v-checkbox :disabled="newItemLoaded" v-model="newGoalItem.isMilestone" label="Milestone?" class="pt-0 pr-2"></v-checkbox>
              </template>
              <template v-if="newGoalItem.isMilestone">
                <v-select
                  prepend-inner-icon="assignment"
                  :items="goalItemsRef"
                  v-model="newGoalItem.goalRef"
                  :disabled="newItemLoaded"
                  item-text="body"
                  item-value="id"
                  label="Goal Task"
                  solo
                ></v-select>
              </template>
            </v-toolbar>
            <v-card-text class="pt-0">
            <v-flex xs12 d-flex>
          <goal-tags-input
            :goalTags="newGoalItem.tags"
            :userTags="userTags"
            @update-new-tag-items="updateNewTagItems"
          ></goal-tags-input>
        </v-flex>
        <v-flex xs12 v-if="shouldShowStatus(newGoalItem.period) && newGoalItem.body">
          <div class="d-flex align-center status-container">
            <task-status-tag
              :status="getNewTaskStatus(newGoalItem.taskRef, newGoalItem.originalDate, newGoalItem)"
              class="status-chip"
            />
          </div>
        </v-flex>
        <v-layout row wrap>
        <v-flex sm8 d-flex>
          <v-tabs
          v-model="active"
        >
          <v-tab>Description</v-tab>
          <v-tab>Reward</v-tab>
          <v-tab-item>
            <v-card flat>
              <v-card-text class="pt-2 pr-0 pb-0 pl-0">
                <vue-easymde v-model="newGoalItem.contribution" ref="markdownEditor" />
              </v-card-text>
            </v-card>
          </v-tab-item>
          <v-tab-item>
            <v-card flat>
              <v-card-text>
                <v-textarea v-model="newGoalItem.reward">
                  <template v-slot:label>
                    <div>
                      Reward / Resolution
                    </div>
                  </template>
                </v-textarea>
              </v-card-text>
            </v-card>
          </v-tab-item>
        </v-tabs>
        </v-flex>
        <v-flex sm4  d-flex v-if="newGoalItem.period === 'day' && newGoalItem.id">
          <sub-task-item-list
            :subTasks="newGoalItem.subTasks"
            :taskId="newGoalItem.id"
            :period="newGoalItem.period"
            :date="newGoalItem.date"
            @update-sub-task-items="updateSubTaskItems"
          />
        </v-flex>
      </v-layout>
    </v-card-text>
        <v-flex xs12>
          <div style="float: right;" class="mr-1">
            <v-btn color="primary" :disabled="!valid" :loading="buttonLoading" @click="saveGoalItem" class="mr-3">
              Save
            </v-btn>
          </div>
        </v-flex>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>
  </v-form>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import VueEasymde from 'vue-easymde';

import taskStatusMixin from '@/composables/useTaskStatus';
import {
  getDatesOfYear,
  getWeeksOfYear,
  getMonthsOfYear,
  getYearsOfLife,
  stepupMilestonePeriodDate,
} from '../utils/getDates';
import SubTaskItemList from './SubTaskItemList.vue';
import GoalTagsInput from './GoalTagsInput.vue';
import TaskStatusTag from './TaskStatusTag.vue';
import getJSON from '../utils/getJSON';
import { USER_TAGS } from '../constants/settings';

export default {
  components: {
    SubTaskItemList,
    GoalTagsInput,
    VueEasymde,
    TaskStatusTag,
  },
  mixins: [taskStatusMixin],
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
        return data.routineDate && data.routineDate.date ? data.routineDate.tasklist : [];
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
        return data.goalDatePeriod && data.goalDatePeriod.date ? data.goalDatePeriod.goalItems : [];
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
      active: 0,
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
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
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
      console.log(
        this.newGoalItem.period,
        this.newGoalItem.date,
        this.newGoalItem.date !== '01-01-1970',
        this.goalItemsRef && this.goalItemsRef.length,
      );
      return (
        this.newGoalItem.period
        && this.newGoalItem.date
        && this.newGoalItem.date !== '01-01-1970'
        && this.goalItemsRef
        && this.goalItemsRef.length
      );
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

    updateNewTagItems(tags) {
      this.newGoalItem.tags = tags;
    },

    updateSubTaskItems(subTasks) {
      this.newGoalItem.subTasks = subTasks;
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
        tags = [],
        originalDate = null,
      } = this.newGoalItem;

      if (!body) {
        return;
      }

      this.setLocalUserTag(tags);

      this.$apollo
        .mutate({
          mutation: gql`
            mutation addGoalItem(
              $body: String!
              $period: String!
              $date: String!
              $isComplete: Boolean
              $isMilestone: Boolean
              $deadline: String
              $contribution: String
              $reward: String
              $taskRef: String
              $goalRef: String
              $tags: [String]
              $originalDate: String
            ) {
              addGoalItem(
                body: $body
                period: $period
                date: $date
                isComplete: $isComplete
                isMilestone: $isMilestone
                deadline: $deadline
                contribution: $contribution
                reward: $reward
                taskRef: $taskRef
                goalRef: $goalRef
                tags: $tags
                originalDate: $originalDate
              ) {
                id
                body
                isComplete
                isMilestone
                status
                createdAt
                originalDate
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
            tags,
            originalDate: originalDate || null,
          },
          update: (scope, { data: { addGoalItem } }) => {
            const goalItem = {
              ...this.newGoalItem,
              id: addGoalItem.id,
            };
            this.$emit('add-update-goal-entry', goalItem, false);
            this.resetForm();
          },
        })
        .catch(() => {
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
      } = this.newGoalItem;

      this.setLocalUserTag(tags);

      if (!body) {
        return;
      }

      this.$apollo
        .mutate({
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
                id: $id
                body: $body
                period: $period
                date: $date
                isMilestone: $isMilestone
                deadline: $deadline
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
            const goalItem = {
              ...this.newGoalItem,
              id: updateGoalItem.id,
            };
            this.$emit('add-update-goal-entry', goalItem, false);
            this.resetForm();
          },
        })
        .catch(() => {
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
    newGoalItem(newVal, oldVal) {
      this.newItemLoaded = !!newVal.id && (oldVal.date === '' || typeof oldVal.date === 'undefined');
      if (
        newVal.date !== oldVal.date
        && (oldVal.date === '' || typeof oldVal.date === 'undefined')
      ) {
        this.triggerGoalItemsRef();
      }
    },
  },
};
</script>

<style>
  @import '~easymde/dist/easymde.min.css';
  .v-toolbar {
    box-shadow: none;
  }
  .v-toolbar .v-input__control {
    min-height: auto !important;
    min-width: 175px;
  }
  .v-toolbar .v-input__control .v-input__slot {
    margin-bottom: 0;
    background: transparent !important;
    border: none;
    box-shadow: none !important;
  }
  .no-shadow {
    box-shadow: none !important;
  }
  .v-input--checkbox .v-messages {
    display: none;
  }
  .goal-creation #newGoalItemBody {
    max-height: 42px;
    font-size: 36px;
    font-weight: 700;
  }

  .toolbar {
    overflow-y: hidden;
    overflow-x: auto;
    width: 100%;
  }
  .v-toolbar__content {
    width: 100%;
  }

  .status-chip {
    max-width: fit-content;
    margin-left: 0;
  }

  .status-container {
    justify-content: flex-start;
    align-items: center;
    gap: 8px;
  }
</style>
