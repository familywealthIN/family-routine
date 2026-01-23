<template>
  <div v-if="taskData" class="task-creation-form">
    <v-divider class="my-4"></v-divider>

    <!-- Success Message -->
    <v-alert v-if="taskSuccess" type="success" dismissible @click="taskSuccess = false">
      Task successfully created!
    </v-alert>

    <!-- Task Information Card -->
    <v-card outlined class="mb-4 modern-shadow-sm">
      <v-card-title class="subtitle-1">
        <v-icon left>task_alt</v-icon>
        Extracted Task Information
      </v-card-title>
      <v-card-text>
        <!-- Editable Task Title -->
        <v-text-field
          v-model="taskData.title"
          label="Task Title"
          prepend-icon="title"
          filled
          class="mb-3"
        ></v-text-field>

        <!-- Editable Task Description -->
        <v-textarea
          v-model="taskData.description"
          label="Task Description"
          prepend-icon="description"
          filled
          auto-grow
          rows="3"
          class="mb-3"
        ></v-textarea>

        <!-- Task Date -->
        <v-text-field
          v-model="taskData.dueDate"
          label="Task Date"
          prepend-icon="event"
          filled
          type="date"
          class="mb-3"
        ></v-text-field>

        <!-- Tags -->
        <goal-tags-input
          :goalTags="taskData.tags"
          :userTags="userTags"
          @update-new-tag-items="updateTaskTags"
          class="mb-3"
        ></goal-tags-input>

        <!-- Routine Task Selection -->
        <v-select
          :items="routines"
          v-model="taskData.taskRef"
          item-text="name"
          item-value="taskId"
          label="Routine Task"
          prepend-icon="schedule"
          filled
          class="mb-3"
        ></v-select>

        <!-- Milestone Checkbox -->
        <v-checkbox
          v-model="taskData.isMilestone"
          label="Milestone?"
          class="mb-3"
        ></v-checkbox>

        <!-- Goal Reference (only show when milestone is checked) -->
        <v-select
          v-if="taskData.isMilestone"
          :items="goalItemsRef"
          v-model="taskData.goalRef"
          item-text="body"
          item-value="id"
          label="Goal Task"
          prepend-icon="flag"
          filled
          class="mb-3"
        ></v-select>
      </v-card-text>
    </v-card>

    <!-- Related tasks timeline -->
    <v-flex xs12 d-flex v-if="taskData.goalRef">
      <related-tasks-timeline :tasks="relatedTasks" />
    </v-flex>
  </div>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import GoalTagsInput from '../../molecules/GoalTagsInput/GoalTagsInput.vue';
import RelatedTasksTimeline from '../../molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue';
import { USER_TAGS } from '../../../constants/settings';
import eventBus, { EVENTS } from '../../../utils/eventBus';
import getJSON from '../../../utils/getJSON';

export default {
  name: 'OrganismAiTaskCreationForm',
  components: {
    GoalTagsInput,
    RelatedTasksTimeline,
  },
  props: {
    searchQuery: {
      type: String,
      required: true,
    },
    currentTask: {
      type: Object,
      default: null,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    routines: {
      type: Array,
      default: () => [],
    },
    relatedGoalsData: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      taskData: null,
      taskSuccess: false,
      saving: false,
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
    };
  },
  computed: {
    relatedTasks() {
      if (!this.taskData.goalRef || !this.relatedGoalsData || !Array.isArray(this.relatedGoalsData)) {
        return [];
      }

      // Since goalsByGoalRef already filters by goalRef on the server,
      // we just need to flatten the goalItems and add time information
      const relatedTasks = [];
      this.relatedGoalsData.forEach((goal) => {
        if (goal.goalItems && Array.isArray(goal.goalItems)) {
          goal.goalItems.forEach((goalItem) => {
            // Add time from tasklist if available
            if (goalItem.goalRef === this.taskData.goalRef) {
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
    isValid() {
      return !!(this.taskData && this.taskData.title && this.taskData.description);
    },
  },
  watch: {
    isValid: {
      handler(newVal) {
        this.$emit('update:valid', newVal);
      },
      immediate: true,
    },
    'taskData.goalRef': function (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$emit('goal-ref-changed', newVal);
      }
    },
    searchQuery: {
      handler(newVal) {
        // Always attempt extraction once when searchQuery arrives
        if (newVal && !this.taskData) {
          this.createTask();
        }
      },
      immediate: true,
    },
    taskData: {
      deep: true,
      handler(newVal) {
        if (newVal && newVal.taskRef && !newVal.goalRef) {
          // Auto-select goalRef when taskRef is selected and matches current task
          this.$nextTick(() => {
            if (this.goalItemsRef && Array.isArray(this.goalItemsRef)) {
              const matchingGoalItem = this.goalItemsRef.find(
                (item) => item.taskRef === newVal.taskRef,
              );
              if (matchingGoalItem) {
                this.taskData.goalRef = matchingGoalItem.id;
                this.taskData.isMilestone = true;
              }
            }
          });
        }

        // Enforce milestone/goalRef relationship
        if (newVal && !newVal.isMilestone) {
          this.taskData.goalRef = '';
        }
      },
    },
    'taskData.taskRef': {
      handler(newVal) {
        if (newVal) {
          // Auto-fill tags from selected routine task
          const selectedTask = this.routines.find((task) => task.taskId === newVal);
          if (selectedTask && selectedTask.tags && selectedTask.tags.length > 0) {
            this.taskData.tags = [...new Set([...(this.taskData.tags || []), ...selectedTask.tags])];
          }
        }
      },
    },
    currentTask(newVal) {
      if (newVal && newVal.id && this.taskData && !this.taskData.taskRef) {
        this.taskData.taskRef = newVal.id;
      }
    },
    goalItemsRef(newGoalItems) {
      if (this.taskData && this.currentTask && this.currentTask.id) {
        const matchingGoalItem = newGoalItems.find(
          (item) => item.taskRef === this.currentTask.id,
        );
        if (matchingGoalItem && !this.taskData.goalRef) {
          this.taskData.goalRef = matchingGoalItem.id;
          this.taskData.isMilestone = true;
        }
      }
    },
  },
  methods: {
    updateTaskTags(tags) {
      if (this.taskData) {
        this.taskData.tags = tags;
      }
    },
    setLocalUserTag(newTags) {
      if (newTags && newTags.length > 0) {
        const currentTags = getJSON(localStorage.getItem(USER_TAGS), []);
        const mergedTags = [...new Set([...currentTags, ...newTags])];
        localStorage.setItem(USER_TAGS, JSON.stringify(mergedTags));
        this.userTags = mergedTags;
      }
    },
    getTaskDate() {
      if (this.taskData && this.taskData.dueDate) {
        return moment(this.taskData.dueDate).format('DD-MM-YYYY');
      }
      return moment().format('DD-MM-YYYY');
    },
    async createTask() {
      if (!this.searchQuery.trim()) {
        this.$emit('error', 'Please enter a task description');
        return;
      }

      this.$emit('update:loading', true);

      try {
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation extractDayTask($query: String!) {
              extractDayTask(query: $query) {
                title
                description
                dueDate
                tags
                priority
              }
            }
          `,
          variables: {
            query: this.searchQuery,
          },
        });

        if (result.data && result.data.extractDayTask) {
          this.taskData = {
            ...result.data.extractDayTask,
            goalRef: '',
            taskRef: '',
            isMilestone: false,
            dueDate: result.data.extractDayTask.dueDate || moment().format('YYYY-MM-DD'),
          };

          // Auto-select current task immediately if available
          if (this.currentTask && this.currentTask.id) {
            this.taskData.taskRef = this.currentTask.id;

            // Auto-select goalRef and milestone checkbox
            this.$nextTick(() => {
              if (this.goalItemsRef && Array.isArray(this.goalItemsRef)) {
                const matchingGoalItem = this.goalItemsRef.find(
                  (item) => item.taskRef === this.currentTask.id,
                );
                if (matchingGoalItem) {
                  this.taskData.goalRef = matchingGoalItem.id;
                  this.taskData.isMilestone = true;
                }
              }
            });
          }
        } else {
          this.$emit('error', 'Failed to extract task information from your query');
        }
      } catch (error) {
        console.error('Error extracting task:', error);
        this.$emit('error', 'Failed to process your request. Please try again.');
      } finally {
        this.$emit('update:loading', false);
      }
    },
    async saveTask() {
      if (!this.taskData || !this.taskData.title || !this.taskData.description) {
        this.$emit('error', 'Please fill in all required fields');
        return;
      }

      this.saving = true;
      this.$emit('update:saving', true);

      try {
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation addGoalItem(
              $date: String!
              $period: String!
              $body: String!
              $contribution: String
              $taskRef: String!
              $goalRef: String
              $tags: [String]
              $isMilestone: Boolean!
            ) {
              addGoalItem(
                date: $date
                period: $period
                body: $body
                contribution: $contribution
                taskRef: $taskRef
                goalRef: $goalRef
                tags: $tags
                isMilestone: $isMilestone
              ) {
                id
                body
                contribution
                taskRef
                goalRef
                tags
                isMilestone
              }
            }
          `,
          variables: {
            date: this.getTaskDate(),
            period: 'day',
            body: this.taskData.title,
            contribution: this.taskData.description,
            taskRef: this.taskData.taskRef || '',
            goalRef: this.taskData.isMilestone ? this.taskData.goalRef || null : null,
            tags: this.taskData.tags || [],
            isMilestone: this.taskData.isMilestone || false,
          },
        });

        if (result.data && result.data.addGoalItem) {
          this.taskSuccess = true;
          this.setLocalUserTag(this.taskData.tags || []);

          // Emit global event for dashboard refetch
          eventBus.$emit(EVENTS.TASK_CREATED, result.data.addGoalItem);

          // Emit success to parent
          this.$emit('task-created', result.data.addGoalItem);
          this.$emit('success');
        } else {
          this.$emit('error', 'Failed to create task');
        }
      } catch (error) {
        console.error('Error saving task:', error);
        this.$emit('error', 'Failed to save task. Please try again.');
      } finally {
        this.saving = false;
        this.$emit('update:saving', false);
      }
    },
    resetForm() {
      this.taskData = null;
      this.taskSuccess = false;
      this.saving = false;
    },
  },
};
</script>

<style scoped>
.modern-shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
