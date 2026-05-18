import Vue from 'vue';
import moment from 'moment';

// Create a reactive store for currentTask
const currentTaskStore = Vue.observable({
  // Current task data
  task: null,
  tasklist: [],
  date: moment().format('DD-MM-YYYY'),

  // Loading states
  isLoading: false,
  error: null,
});

// Computed property to get the current active task
const getCurrentTask = () => {
  if (Array.isArray(currentTaskStore.tasklist) && currentTaskStore.tasklist.length) {
    const currentActiveTask = currentTaskStore.tasklist.find((task, idx) => {
      const taskTime = moment(task.time, 'HH:mm');
      const currentTime = moment();
      const nextTask = currentTaskStore.tasklist[idx + 1];
      const nextTimeString = nextTask ? nextTask.time : '23:59';
      const nextTime = moment(nextTimeString, 'HH:mm');
      const isTimeBeforeFirstTask = idx === 0 && currentTime.diff(taskTime, 'minutes') <= 0;
      if (isTimeBeforeFirstTask) {
        return isTimeBeforeFirstTask;
      }
      const isTimeGreaterThanTask = currentTime.diff(taskTime, 'minutes') >= 0;
      const isTimeLessThanNextTask = currentTime.diff(nextTime, 'minutes') <= -1;
      return isTimeGreaterThanTask && isTimeLessThanNextTask;
    });
    return currentActiveTask || {};
  }
  return {};
};

// Actions to manage the store
const currentTaskActions = {
  setCurrentTask(task) {
    currentTaskStore.task = task || {};
  },

  setTasklist(tasklist) {
    currentTaskStore.tasklist = tasklist || [];
    // Update current task when tasklist changes
    currentTaskStore.task = getCurrentTask();
  },

  setDate(date) {
    currentTaskStore.date = date;
  },

  setLoading(isLoading) {
    currentTaskStore.isLoading = isLoading;
  },

  setError(error) {
    currentTaskStore.error = error;
  },

  updateTask() {
    // Manually update the current task (useful for time-based updates)
    currentTaskStore.task = getCurrentTask();
  },

  clearTask() {
    currentTaskStore.task = null;
    currentTaskStore.tasklist = [];
    currentTaskStore.error = null;
  },
};

// Export the store and actions
export default {
  // Direct access to the store state
  state: currentTaskStore,

  // Actions
  setCurrentTask: currentTaskActions.setCurrentTask,
  setTasklist: currentTaskActions.setTasklist,
  setDate: currentTaskActions.setDate,
  setLoading: currentTaskActions.setLoading,
  setError: currentTaskActions.setError,
  updateTask: currentTaskActions.updateTask,
  clearTask: currentTaskActions.clearTask,

  // Reactive getters that return live values
  get currentTask() {
    return currentTaskStore.task || getCurrentTask();
  },

  get tasklist() {
    return currentTaskStore.tasklist;
  },

  get isLoading() {
    return currentTaskStore.isLoading;
  },

  get error() {
    return currentTaskStore.error;
  },

  get date() {
    return currentTaskStore.date;
  },
};
