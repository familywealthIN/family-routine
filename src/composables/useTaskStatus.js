import { ref } from 'vue';
import {
  TASK_STATUS,
  TASK_STATUS_CONFIG,
  determineTaskStatus,
  getInitialTaskStatus,
  updateTaskStatusOnComplete,
} from '@/utils/taskStatus';

/**
 * Composable for managing task status functionality
 */
export function useTaskStatus() {
  const currentTask = ref(null);
  const tasklist = ref([]);

  /**
   * Set the current task and tasklist context
   */
  const setTaskContext = (task, tasklistData) => {
    currentTask.value = task;
    tasklist.value = tasklistData || [];
  };

  /**
   * Calculate status for a task item
   */
  const calculateTaskStatus = (taskItem, isComplete = false, originalDate = null) => determineTaskStatus({
    taskItem,
    currentTask: currentTask.value,
    tasklist: tasklist.value,
    isComplete,
    originalDate,
  });

  /**
   * Get initial status for a new task
   */
  const getNewTaskStatus = (taskRef, originalDate = null, task = null) => getInitialTaskStatus({
    currentTask: task || currentTask.value,
    taskRef,
    originalDate,
  });

  /**
   * Update status when task is completed
   */
  const updateStatusOnComplete = (taskItem) => updateTaskStatusOnComplete({
    taskItem,
    currentTask: currentTask.value,
    tasklist: tasklist.value,
  });

  /**
   * Get status configuration for display
   */
  const getStatusConfig = (status) => TASK_STATUS_CONFIG[status] || TASK_STATUS_CONFIG[TASK_STATUS.TODO];

  /**
   * Check if a status should be displayed (only for day period tasks)
   */
  const shouldShowStatus = (period) => period === 'day';

  return {
    // State
    currentTask,
    tasklist,

    // Constants
    TASK_STATUS,
    TASK_STATUS_CONFIG,

    // Methods
    setTaskContext,
    calculateTaskStatus,
    getNewTaskStatus,
    updateStatusOnComplete,
    getStatusConfig,
    shouldShowStatus,
  };
}

/**
 * Mixin for Vue 2 components to use task status
 */
export const taskStatusMixin = {
  data() {
    return {
      TASK_STATUS,
      TASK_STATUS_CONFIG,
    };
  },
  methods: {
    calculateTaskStatus(taskItem, isComplete = false, originalDate = null) {
      return determineTaskStatus({
        taskItem,
        currentTask: this.$currentTaskData,
        tasklist: this.$currentTaskList || [],
        isComplete,
        originalDate,
      });
    },
    getNewTaskStatus(taskRef, originalDate = null, task = null) {
      return getInitialTaskStatus({
        currentTask: task || this.$currentTaskData,
        taskRef,
        originalDate,
      });
    },
    updateStatusOnComplete(taskItem) {
      return updateTaskStatusOnComplete({
        taskItem,
        currentTask: this.$currentTaskData,
        tasklist: this.$currentTaskList || [],
      });
    },
    getStatusConfig(status) {
      return TASK_STATUS_CONFIG[status] || TASK_STATUS_CONFIG[TASK_STATUS.TODO];
    },
    shouldShowStatus(period) {
      return period === 'day';
    },
  },
};
