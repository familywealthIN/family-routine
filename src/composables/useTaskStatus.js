import {
  TASK_STATUS,
  TASK_STATUS_CONFIG,
  determineTaskStatus,
  getInitialTaskStatus,
  updateTaskStatusOnComplete,
} from '@/utils/taskStatus';

/**
 * Mixin for Vue 2 components to use task status
 */
const taskStatusMixin = {
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

export default taskStatusMixin;
