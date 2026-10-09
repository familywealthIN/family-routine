import agentStore from '../store/agentStore';

const apolloFromVm = (vm) => {
  if (!vm || !vm.$apollo) return null;
  if (typeof vm.$apollo.query === 'function' && typeof vm.$apollo.mutate === 'function') {
    return vm.$apollo;
  }
  return vm.$apollo.provider && vm.$apollo.provider.defaultClient;
};

export default {
  install(Vue) {
    const createAgentProxy = (vm) => ({
      get state() { return agentStore.state; },
      get agents() { return agentStore.agents; },
      get agentsByTaskRef() { return agentStore.agentsByTaskRef; },
      get statusByRoutineId() { return agentStore.statusByRoutineId; },
      get statusDay() { return agentStore.statusDay; },
      get lastResultByRoutineId() { return agentStore.lastResultByRoutineId; },
      get loading() { return agentStore.loading; },
      get error() { return agentStore.error; },

      getByTaskRef: agentStore.getByTaskRef,
      setLocalStatus: agentStore.setLocalStatus,
      clearLocalStatus: agentStore.clearLocalStatus,
      statusFor: agentStore.statusFor,
      clearDayStatuses: agentStore.clearDayStatuses,
      clearResult: agentStore.clearResult,
      openResultModal: agentStore.openResultModal,
      showSavedResult: agentStore.showSavedResult,
      closeResultModal: agentStore.closeResultModal,

      fetchAll() { return agentStore.fetchAll(apolloFromVm(vm)); },
      fetchByTaskRef(taskRef) { return agentStore.fetchByTaskRef(apolloFromVm(vm), taskRef); },
      add(input) { return agentStore.add(apolloFromVm(vm), input); },
      update(id, patch) { return agentStore.update(apolloFromVm(vm), id, patch); },
      remove(id) { return agentStore.remove(apolloFromVm(vm), id); },

      fireStartEventIfPresent({
        taskRef, goalId, goalDate, goalPeriod, implicit,
      }) {
        return agentStore.fireStartEventIfPresent({
          apollo: apolloFromVm(vm), vm, taskRef, goalId, goalDate, goalPeriod, implicit,
        });
      },

      adoptLocalRun(taskRef) { return agentStore.adoptLocalRun(apolloFromVm(vm), taskRef); },

      /** Would an end event actually dispatch for this routine? */
      canFireEndEvent(taskRef) {
        return agentStore.canFireEndEvent(taskRef);
      },

      fireEndEvent({ taskRef, goalId }) {
        return agentStore.fireEndEvent({
          apollo: apolloFromVm(vm), vm, taskRef, goalId,
        });
      },
    });

    Object.defineProperty(Vue.prototype, '$agent', {
      get() {
        if (!this._agentProxy) {
          this._agentProxy = createAgentProxy(this);
        }
        return this._agentProxy;
      },
    });
  },
};
