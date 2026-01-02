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
      <goal-tags-input
        class="ml-3 mr-3"
        :goalTags="newGoalItem.tags"
        :userTags="userTags"
        @update-new-tag-items="updateNewTagItems"
      ></goal-tags-input>
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

import { stepupMilestonePeriodDate, periodGoalDates } from '../../../utils/getDates';
import getJSON from '../../../utils/getJSON';
import GoalTagsInput from '../../molecules/GoalTagsInput/GoalTagsInput.vue';
import { USER_TAGS } from '../../../constants/settings';
import measurementMixins from '../../../utils/measurementMixins';

export default {
  mixins: [measurementMixins],
  components: {
    GoalTagsInput,
  },
  props: ['goals', 'selectedBody', 'date', 'period', 'tasklist', 'goalDetailsDialog', 'selectedTaskRef', 'isDefaultMilestone'],
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
        isMilestone: this.isDefaultMilestone || false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      defaultGoalItem: {
        body: this.selectedBody || '',
        isMilestone: this.isDefaultMilestone || false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      goalItems: [],
      showMilestoneOption: true,
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
    };
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
    getGoal(period, date) {
      const goal = this.goals.find((aGoal) => aGoal && aGoal.period === period && aGoal.date === date);
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
            $tags: [String]
          ) {
            addGoalItem(
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
              isMilestone: $isMilestone
              goalRef: $goalRef,
              taskRef: $taskRef,
              tags: $tags
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
          goalRef: this.newGoalItem.isMilestone ? this.newGoalItem.goalRef : null,
          taskRef: this.newGoalItem.taskRef,
          tags: this.newGoalItem.tags,
        },
        update: (scope, { data: { addGoalItem } }) => {
          goal.goalItems.push({
            id: addGoalItem.id,
            body: this.newGoalItem.body,
            isMilestone: this.newGoalItem.isMilestone,
            isComplete: false,
            goalRef: this.newGoalItem.goalRef,
            taskRef: this.newGoalItem.taskRef,
            tags: [...this.newGoalItem.tags],
          });
          this.newGoalItem = { ...this.defaultGoalItem };
          this.$apollo.queries.goalItemsRef.refetch();
          this.$emit('toggle-goal-details-dialog', false);
          this.buttonLoading = false;
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
    sortTimes(array) {
      return array.sort((a, b) => {
        try {
          // Handle cases where time might be undefined
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1; // Move items without time to the end
          if (!b.time) return -1; // Move items without time to the end

          const [aHours, aMinutes] = a.time.split(':');
          const [bHours, bMinutes] = b.time.split(':');

          if (parseInt(aHours, 10) - parseInt(bHours, 10) === 0) {
            return parseInt(aMinutes, 10) - parseInt(bMinutes, 10);
          }
          return parseInt(aHours, 10) - parseInt(bHours, 10);
        } catch (error) {
          // Track the error for analytics
          this.trackError('sort_times_error', error, {
            component: 'GoalList',
            method: 'sortTimes',
            itemA: a,
            itemB: b,
          });
          console.error('Error in sortTimes:', error, { a, b });
          return 0; // Return neutral sort order on error
        }
      });
    },
    groupGoalItemsRef(goalItems) {
      try {
        const groupedGoalItems = [];
        let currentTaskRef = '';

        // Validate input
        if (!goalItems || !Array.isArray(goalItems)) {
          this.trackError('group_goal_items_invalid_input', new Error('Invalid goalItems input'), {
            component: 'GoalList',
            method: 'groupGoalItemsRef',
            goalItems,
          });
          return [];
        }

        goalItems.sort((a, b) => {
          if (a.taskRef < b.taskRef) { return -1; }
          if (a.taskRef > b.taskRef) { return 1; }
          return 0;
        });

        goalItems.forEach((goalItem) => {
          const timeTask = this.tasklist.find((task) => task.id === goalItem.taskRef);
          // eslint-disable-next-line no-param-reassign
          if (timeTask && timeTask.time) {
            // eslint-disable-next-line no-param-reassign
            goalItem.time = timeTask.time;
          } else {
            // Track when goal items don't have corresponding tasks or time data
            this.trackBusinessEvent('goal_item_missing_time', {
              goalItemId: goalItem.id,
              taskRef: goalItem.taskRef,
              hasTimeTask: !!timeTask,
              hasTime: !!(timeTask && timeTask.time),
              component: 'GoalList',
            });
            // Set a default time for items without a corresponding task or time
            // eslint-disable-next-line no-param-reassign
            goalItem.time = '23:59'; // Default to end of day
          }
        });

        this.sortTimes(goalItems);

        goalItems.forEach((goalItem) => {
          if (goalItem.taskRef !== currentTaskRef) {
            currentTaskRef = goalItem.taskRef;
            const selectedTask = this.tasklist.find((task) => task.id === currentTaskRef);

            if (selectedTask && selectedTask.name) {
              groupedGoalItems.push({ header: selectedTask.name });
            } else {
              // Track when goal items reference non-existent tasks
              this.trackBusinessEvent('goal_item_missing_task', {
                goalItemId: goalItem.id,
                taskRef: currentTaskRef,
                component: 'GoalList',
              });
              // Use a fallback header for missing tasks
              groupedGoalItems.push({ header: `Unknown Task (${currentTaskRef})` });
            }
          }

          groupedGoalItems.push(goalItem);
        });

        this.autoSelectGoalRef();

        return groupedGoalItems;
      } catch (error) {
        this.trackError('group_goal_items_error', error, {
          component: 'GoalList',
          method: 'groupGoalItemsRef',
          goalItems,
        });
        console.error('Error in groupGoalItemsRef:', error);
        return [];
      }
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
        const selectedTask = this.tasklist ? this.tasklist.find((task) => task.id === newVal) : null;

        if (newVal && !selectedTask) {
          // Track when selected task reference doesn't exist in tasklist
          this.trackBusinessEvent('selected_task_not_found', {
            selectedTaskRef: newVal,
            tasklistLength: this.tasklist ? this.tasklist.length : 0,
            component: 'GoalList',
          });
        }

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
