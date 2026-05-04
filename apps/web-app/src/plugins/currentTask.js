import currentTaskStore from '../store/currentTask';

// Vue plugin to make currentTask globally accessible
export default {
  install(Vue) {
    // Add the currentTask store to Vue prototype so it's available in all components
    // eslint-disable-next-line no-param-reassign
    Vue.prototype.$currentTask = currentTaskStore;

    // Also add as a global property
    // eslint-disable-next-line no-param-reassign
    Vue.config.globalProperties = Vue.config.globalProperties || {};
    // eslint-disable-next-line no-param-reassign
    Vue.config.globalProperties.$currentTask = currentTaskStore;

    // Add a mixin that makes currentTask reactive in all components
    Vue.mixin({
      computed: {
        $currentTaskData() {
          return this.$currentTask.currentTask;
        },
        $currentTaskList() {
          return this.$currentTask.tasklist;
        },
        $currentTaskLoading() {
          return this.$currentTask.isLoading;
        },
        $currentTaskError() {
          return this.$currentTask.error;
        },
      },
    });
  },
};
