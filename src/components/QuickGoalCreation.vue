<template>
  <v-layout pl-3 pr-3 row wrap>
    <v-flex xs12 d-flex>
      <div class="form-goal mt-2 mb-2">
        <v-text-field
          clearable
          v-model="newGoalItem.body"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="input-goal"
          @keyup.enter="addGoalItem"
        >
        </v-text-field>
      </div>
    </v-flex>
    <v-flex xs12 d-flex>
      <v-select
        :items="goalItemsRef"
        v-model="newGoalItem.goalRef"
        item-text="body"
        item-value="id"
        label="Goal Task"
      >
      </v-select>
    </v-flex>    <!-- Condensed timeline showing related goals based on selected goalRef -->
    <v-flex xs12 d-flex v-if="relatedTasks.length > 0 && newGoalItem.goalRef">
      <v-card flat class="condensed-timeline mb-3 modern-shadow-sm" style="width: 100%;">
        <v-card-title class="pb-2">
          <v-icon left small>track_changes</v-icon>
          <span class="subtitle-2">Related Goals ({{ relatedTasks.length }})</span>
        </v-card-title>
        <v-card-text class="pt-0">
          <v-timeline dense>
            <v-timeline-item
              v-for="task in relatedTasks"
              :key="task.id"
              :color="task.isComplete ? 'green' : 'orange'"
              small
              class="mb-1"
            >              <v-layout align-center>
                <v-flex>
                  <div v-if="task.date" class="caption text--secondary">
                    {{ formatDateToDayOfWeek(task.date) }}
                  </div>
                  <span class="caption text--secondary">{{ formatTime(task.time) }}</span>
                  <div class="body-2">{{ task.body }}</div>
                  <div v-if="task.tags && task.tags.length > 0" class="mt-1">
                    <v-chip
                      v-for="tag in task.tags"
                      :key="tag"
                      x-small
                      outlined
                      class="mr-1"
                    >
                      {{ tag }}
                    </v-chip>
                  </div>
                </v-flex>
              </v-layout>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
      </v-card>
    </v-flex>
    <v-flex xs12 d-flex>
      <goal-tags-input
        :goalTags="newGoalItem.tags"
        :userTags="userTags"
        @update-new-tag-items="updateNewTagItems"
      ></goal-tags-input>
    </v-flex>
    <v-flex x12 d-flex>
      <v-btn
        color="success"
        :loading="buttonLoading"
        :disabled="buttonLoading"
        @click="addGoalItem(newGoalItem)"
      >
        Start Task
      </v-btn>
    </v-flex>
  </v-layout>
</template>
<script>
import gql from 'graphql-tag';
import moment from 'moment';

import { taskStatusMixin } from '@/composables/useTaskStatus';
import { stepupMilestonePeriodDate, periodGoalDates } from '../utils/getDates';
import getJSON from '../utils/getJSON';
import GoalTagsInput from './GoalTagsInput.vue';
import { USER_TAGS } from '../constants/settings';

export default {
  components: {
    GoalTagsInput,
  },
  mixins: [taskStatusMixin],
  props: [
    'goals',
    'selectedBody',
    'date',
    'period',
    'tasklist',
    'goalDetailsDialog',
    'selectedTaskRef',
  ],
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
    relatedGoalsData: {
      query: gql`
        query goalsByGoalRef($goalRef: String!) {
          goalsByGoalRef(goalRef: $goalRef) {
            id
            date
            period
            goalItems {
              id
              body
              isComplete
              goalRef
              taskRef
              tags
              isMilestone
            }
          }
        }
      `,
      variables() {
        return {
          goalRef: this.newGoalItem.goalRef,
        };
      },
      skip() {
        return !this.newGoalItem.goalRef;
      },
      update(data) {
        return data && data.goalsByGoalRef ? data.goalsByGoalRef : [];
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
        tags: [],
      },
      defaultGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      goalItems: [],
      showMilestoneOption: true,
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
    };
  },
  computed: {
    relatedTasks() {
      if (!this.newGoalItem.goalRef || !this.relatedGoalsData || !Array.isArray(this.relatedGoalsData)) {
        return [];
      }

      // Since goalsByGoalRef already filters by goalRef on the server,
      // we just need to flatten the goalItems and add time information
      const relatedTasks = [];
      this.relatedGoalsData.forEach((goal) => {
        if (goal.goalItems && Array.isArray(goal.goalItems)) {
          goal.goalItems.forEach((goalItem) => {
            // Add time from tasklist if available
            if (goalItem.goalRef === this.newGoalItem.goalRef) {
              relatedTasks.push({
                id: goalItem.id,
                body: goalItem.body,
                date: goal.date,
                period: goal.period,
                isComplete: goalItem.isComplete,
                goalRef: goalItem.goalRef,
                taskRef: goalItem.taskRef,
                tags: goalItem.tags || [],
              });
            }
          });
        }
      });

      // Sort by time and limit to 10 for condensed view
      return relatedTasks
        .sort((a, b) => {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        })
        .slice(0, 10);
    },
  },
  mounted() {
    // Initialize tags from the selected task if available
    this.initializeTagsFromSelectedTask();
  },
  methods: {
    initializeTagsFromSelectedTask() {
      if (this.selectedTaskRef && this.tasklist && this.tasklist.length > 0) {
        const selectedTask = this.tasklist.find((task) => task.id === this.selectedTaskRef);
        const taskTags = selectedTask && selectedTask.tags ? [...selectedTask.tags] : [];

        this.newGoalItem.tags = taskTags;
        this.defaultGoalItem.tags = taskTags;
      }
    },
    formatTime(time) {
      if (!time) return '';
      return time; // Time is already in HH:MM format
    },
    formatDateToDayOfWeek(date) {
      if (!date) return '';
      try {
        // Use moment to parse the date - it handles multiple formats automatically
        const momentDate = moment(date, ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'YYYY/MM/DD']);

        if (!momentDate.isValid()) {
          console.warn('Invalid date format:', date);
          return date; // Return original if parsing fails
        }
        return momentDate.format('dddd'); // Returns full day name (e.g., 'Monday')
      } catch (error) {
        console.error('Error formatting date to day of week:', error);
        return date; // Return original date if error occurs
      }
    },
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

      this.setLocalUserTag(this.newGoalItem.tags);

      this.$apollo
        .mutate({
          mutation: gql`
            mutation addGoalItem(
              $body: String!
              $period: String!
              $date: String!
              $isComplete: Boolean!
              $isMilestone: Boolean!
              $goalRef: String
              $taskRef: String
              $tags: [String]
              $originalDate: String
            ) {
              addGoalItem(
                body: $body
                period: $period
                date: $date
                isComplete: $isComplete
                isMilestone: $isMilestone
                goalRef: $goalRef
                taskRef: $taskRef
                tags: $tags
                originalDate: $originalDate
              ) {
                id
                body
                isComplete
                isMilestone
                goalRef
                taskRef
                status
                createdAt
                originalDate
              }
            }
          `,
          variables: {
            body: this.newGoalItem.body,
            period: this.period,
            date,
            isComplete: false,
            isMilestone: !!this.newGoalItem.goalRef || this.newGoalItem.isMilestone,
            goalRef: this.newGoalItem.goalRef,
            taskRef: this.newGoalItem.taskRef,
            tags: this.newGoalItem.tags,
            originalDate: this.newGoalItem.originalDate || null,
          },
          update: (scope, { data: { addGoalItem } }) => {
            goal.goalItems.push({
              id: addGoalItem.id,
              body: this.newGoalItem.body,
              isMilestone: !!this.newGoalItem.goalRef || this.newGoalItem.isMilestone,
              isComplete: false,
              goalRef: this.newGoalItem.goalRef,
              taskRef: this.newGoalItem.taskRef,
              tags: [...this.newGoalItem.tags],
            });
            const task = this.tasklist.find((taskItem) => taskItem.id === this.newGoalItem.taskRef);
            this.newGoalItem = { ...this.defaultGoalItem };
            this.$emit('start-quick-goal-task', task);
            this.buttonLoading = false;
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
        if (a.taskRef < b.taskRef) {
          return -1;
        }
        if (a.taskRef > b.taskRef) {
          return 1;
        }
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
    updateNewTagItems(tags) {
      this.newGoalItem.tags = tags;
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
    getGoalRefBody(goalRefId) {
      if (!this.goalItems || !goalRefId) return '';
      const goalItem = this.goalItems.find((item) => item.id === goalRefId);
      return goalItem ? goalItem.body : goalRefId;
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
        // Find the selected task and get its tags
        const selectedTask = this.tasklist.find((task) => task.id === newVal);
        const taskTags = selectedTask && selectedTask.tags ? [...selectedTask.tags] : [];

        this.newGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
          tags: taskTags,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
          tags: taskTags,
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
    'newGoalItem.goalRef': function newGoalItemGoalRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        // Refetch related goals when goalRef changes
        if (this.$apollo.queries.relatedGoalsData) {
          this.$apollo.queries.relatedGoalsData.refetch();
        }
      }
    },
    tasklist(newVal) {
      // Initialize tags when tasklist is loaded or updated
      if (newVal && newVal.length > 0) {
        this.initializeTagsFromSelectedTask();
      }
    },
  },
};
</script>

<style>
.form-goal {
  display: flex;
  grid-column: 2;
  width: 100%;
}

.input-goal {
  display: inline-block;
  flex-shrink: 0;
  flex-grow: 1;
}

.v-select-list .v-subheader {
  padding: 0 8px 0 8px;
  height: 30px;
  border-bottom: 1px solid #ccc;
}

.condensed-timeline {
  background: rgba(255, 152, 0, 0.05);
  border-left: 3px solid #FF9800;
}

.condensed-timeline .v-timeline {
  padding-top: 0;
}

.condensed-timeline .v-timeline-item {
  padding-bottom: 8px !important;
}

.condensed-timeline .v-timeline-item__body {
  max-width: calc(100% - 32px);
}

.condensed-timeline .v-card-title {
  padding-bottom: 8px;
}

.condensed-timeline .v-card-text {
  padding-top: 0;
}
</style>
