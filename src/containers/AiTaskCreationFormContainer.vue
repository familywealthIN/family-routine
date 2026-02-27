<template>
  <AiTaskCreationForm
    :searchQuery="searchQuery"
    :goalItemsRef="goalItemsRef"
    :tasklist="tasklist"
    :relatedGoalsData="relatedGoalsData"
    :loading="loading"
    :taskData="taskData"
    :taskSuccess="taskSuccess"
    :saving="saving"
    :selectedDate="selectedDate"
    :selectedTaskRef="selectedTaskRef"
    :selectedGoalRef="selectedGoalRef"
    :promptTags="promptTags"
    @extract-task="createTask"
    @save-task="saveTask"
    @update-task-data="updateTaskData"
    @update:valid="(val) => $emit('update:valid', val)"
    @error="(msg) => $emit('error', msg)"
    @success="handleSuccess"
    @task-created="(task) => $emit('task-created', task)"
  />
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import AiTaskCreationForm from '../components/organisms/AiTaskCreationForm/AiTaskCreationForm.vue';
import eventBus, { EVENTS } from '../utils/eventBus';
import getJSON from '../utils/getJSON';
import { USER_TAGS } from '../constants/settings';

export default {
  name: 'AiTaskCreationFormContainer',
  components: {
    AiTaskCreationForm,
  },
  props: {
    searchQuery: {
      type: String,
      required: true,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    relatedGoalsData: {
      type: Array,
      default: () => [],
    },
    // Props from GoalTaskToolbar
    selectedDate: {
      type: String,
      default: '',
    },
    selectedTaskRef: {
      type: String,
      default: null,
    },
    selectedGoalRef: {
      type: String,
      default: null,
    },
    promptTags: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      taskData: null,
      taskSuccess: false,
      saving: false,
      loading: false,
    };
  },
  watch: {
    // Emit loading state changes to parent
    loading(newVal) {
      this.$emit('update:loading', newVal);
    },
    // Emit saving state changes to parent
    saving(newVal) {
      this.$emit('update:saving', newVal);
    },
    searchQuery: {
      handler(newVal) {
        if (newVal && !this.taskData) {
          this.createTask();
        }
      },
      immediate: true,
    },
  },
  methods: {
    updateTaskData(data) {
      this.taskData = data;
    },
    handleSuccess() {
      this.$emit('success');
    },
    setLocalUserTag(newTags) {
      if (newTags && newTags.length > 0) {
        const currentTags = getJSON(localStorage.getItem(USER_TAGS), []);
        const mergedTags = [...new Set([...currentTags, ...newTags])];
        localStorage.setItem(USER_TAGS, JSON.stringify(mergedTags));
      }
    },
    getTaskDate() {
      if (this.selectedDate) {
        return this.selectedDate;
      }
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

      this.loading = true;

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
            dueDate: result.data.extractDayTask.dueDate || moment().format('YYYY-MM-DD'),
          };

          // Merge prompt-level tags with AI-extracted tags
          const aiTags = result.data.extractDayTask.tags || [];
          this.taskData.tags = [...new Set([...aiTags, ...this.promptTags])];
        } else {
          this.$emit('error', 'Failed to extract task information from your query');
        }
      } catch (error) {
        console.error('Error extracting task:', error);
        this.$emit('error', 'Failed to process your request. Please try again.');
      } finally {
        this.loading = false;
      }
    },
    async saveTask() {
      if (!this.taskData || !this.taskData.title || !this.taskData.description) {
        this.$emit('error', 'Please fill in all required fields');
        return;
      }

      this.saving = true;

      const goalItemData = {
        date: this.getTaskDate(),
        period: 'day',
        body: this.taskData.title,
        contribution: this.taskData.description,
        taskRef: this.selectedTaskRef || '',
        goalRef: this.selectedGoalRef || null,
        tags: this.taskData.tags || [],
        isMilestone: !!this.selectedGoalRef,
      };

      // Close modal immediately — optimistic cache update shows item instantly
      this.taskSuccess = true;
      this.setLocalUserTag(this.taskData.tags || []);
      this.saving = false;
      this.$emit('task-created', goalItemData);
      this.$emit('success');

      // Fire mutation in background — Apollo optimisticResponse handles instant UI
      this.$goals.addGoalItem(goalItemData)
        .then((addedItem) => {
          if (addedItem) {
            eventBus.$emit(EVENTS.TASK_CREATED, addedItem);
          }
        })
        .catch((error) => {
          console.error('Error saving task:', error);
          // Optimistic update auto-rolls back on failure
          this.$emit('error', 'Failed to save task. Please try again.');
        });
    },
    resetForm() {
      this.taskData = null;
      this.taskSuccess = false;
      this.saving = false;
    },
  },
};
</script>
