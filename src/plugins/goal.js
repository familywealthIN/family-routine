/**
 * Goal Plugin
 *
 * Vue plugin that makes goal store and composables globally accessible.
 * Provides this.$goals in all components with reactive computed properties.
 *
 * Relies on Apollo's cache-and-network fetch policy for automatic cache updates.
 *
 * Usage:
 *   // In main.js
 *   import goalPlugin from './plugins/goal';
 *   Vue.use(goalPlugin);
 *
 *   // In components
 *   this.$goals.goals        // reactive goals array
 *   this.$goals.addGoalItem  // mutation methods
 */
import goalStore from '../store/goalStore';
import {
  useGoalDatePeriod,
  useGoalsByTag,
  useGoalsByGoalRef,
  useAgendaGoals,
  useMonthTaskGoals,
  GOAL_QUERY_VARIANTS,
} from '../composables/useGoalQueries';
import { useGoalMutations } from '../composables/useGoalMutations';

export default {
  install(Vue) {
    // Store references for composables (lazy initialized)
    let goalDatePeriodComposable = null;
    let goalsByTagComposable = null;
    let goalsByGoalRefComposable = null;
    let agendaGoalsComposable = null;
    let monthTaskGoalsComposable = null;
    let goalMutationsComposable = null;

    /**
     * Lazy initialization of composables with Apollo client
     */
    const getGoalDatePeriodComposable = (vm) => {
      if (!goalDatePeriodComposable && vm.$apollo) {
        goalDatePeriodComposable = useGoalDatePeriod(vm.$apollo);
      }
      return goalDatePeriodComposable;
    };

    const getGoalsByTagComposable = (vm) => {
      if (!goalsByTagComposable && vm.$apollo) {
        goalsByTagComposable = useGoalsByTag(vm.$apollo);
      }
      return goalsByTagComposable;
    };

    const getGoalsByGoalRefComposable = (vm) => {
      if (!goalsByGoalRefComposable && vm.$apollo) {
        goalsByGoalRefComposable = useGoalsByGoalRef(vm.$apollo);
      }
      return goalsByGoalRefComposable;
    };

    const getAgendaGoalsComposable = (vm) => {
      if (!agendaGoalsComposable && vm.$apollo) {
        agendaGoalsComposable = useAgendaGoals(vm.$apollo);
      }
      return agendaGoalsComposable;
    };

    const getMonthTaskGoalsComposable = (vm) => {
      if (!monthTaskGoalsComposable && vm.$apollo) {
        monthTaskGoalsComposable = useMonthTaskGoals(vm.$apollo);
      }
      return monthTaskGoalsComposable;
    };

    const getGoalMutationsComposable = (vm) => {
      if (!goalMutationsComposable && vm.$apollo) {
        // Pass the actual Apollo Client (not the DollarApollo wrapper)
        // so cache functions like readQuery/writeQuery are available
        const client = vm.$apollo.provider.defaultClient;
        goalMutationsComposable = useGoalMutations(client);
      }
      return goalMutationsComposable;
    };

    /**
     * Create the $goals object with store access and methods
     */
    const createGoalsProxy = (vm) => ({
      // =====================================================================
      // INITIALIZATION & OFFLINE SUPPORT
      // =====================================================================

      // =====================================================================
      // REACTIVE STATE GETTERS
      // =====================================================================

      // Direct store state access (reactive)
      get state() {
        return goalStore.state;
      },

      // Reactive getters - Filter state
      get currentDate() {
        return goalStore.currentDate;
      },
      get currentPeriod() {
        return goalStore.currentPeriod;
      },
      get currentTag() {
        return goalStore.currentTag;
      },
      get currentTaskRef() {
        return goalStore.currentTaskRef;
      },
      get currentGoalRef() {
        return goalStore.currentGoalRef;
      },

      // Reactive getters - Goal data
      get goals() {
        return goalStore.goals;
      },
      get goalsByTag() {
        return goalStore.goalsByTag;
      },
      get goalsByGoalRef() {
        return goalStore.goalsByGoalRef;
      },
      get agendaGoals() {
        return goalStore.agendaGoals;
      },
      get monthTaskGoals() {
        return goalStore.monthTaskGoals;
      },

      // Reactive getters - Loading states
      get isLoadingGoals() {
        return goalStore.isLoadingGoals;
      },
      get isLoadingGoalsByTag() {
        return goalStore.isLoadingGoalsByTag;
      },
      get isLoadingGoalsByGoalRef() {
        return goalStore.isLoadingGoalsByGoalRef;
      },
      get isLoadingAgendaGoals() {
        return goalStore.isLoadingAgendaGoals;
      },
      get isLoadingMonthTaskGoals() {
        return goalStore.isLoadingMonthTaskGoals;
      },
      get isAddingGoal() {
        return goalStore.isAddingGoal;
      },
      get isCompletingGoal() {
        return goalStore.isCompletingGoal;
      },
      get isDeletingGoal() {
        return goalStore.isDeletingGoal;
      },

      // Reactive getters - Error states
      get error() {
        return goalStore.error;
      },
      get mutationError() {
        return goalStore.mutationError;
      },

      // =====================================================================
      // STORE ACTIONS
      // =====================================================================

      // Store actions - Filter state
      setCurrentDate: goalStore.setCurrentDate,
      setCurrentPeriod: goalStore.setCurrentPeriod,
      setCurrentTag: goalStore.setCurrentTag,
      setCurrentTaskRef: goalStore.setCurrentTaskRef,
      setCurrentGoalRef: goalStore.setCurrentGoalRef,

      // Store actions - Goal data
      setGoals: goalStore.setGoals,
      setGoalsByTag: goalStore.setGoalsByTag,
      setGoalsByGoalRef: goalStore.setGoalsByGoalRef,
      setAgendaGoals: goalStore.setAgendaGoals,
      setMonthTaskGoals: goalStore.setMonthTaskGoals,

      // Store actions - Loading states
      setLoadingGoals: goalStore.setLoadingGoals,
      setLoadingGoalsByTag: goalStore.setLoadingGoalsByTag,
      setLoadingGoalsByGoalRef: goalStore.setLoadingGoalsByGoalRef,
      setLoadingAgendaGoals: goalStore.setLoadingAgendaGoals,
      setLoadingMonthTaskGoals: goalStore.setLoadingMonthTaskGoals,

      // Store actions - Error handling
      setError: goalStore.setError,
      setMutationError: goalStore.setMutationError,
      clearErrors: goalStore.clearErrors,

      // Store actions - Cache
      setCacheEntry: goalStore.setCacheEntry,
      getCacheEntry: goalStore.getCacheEntry,
      clearCache: goalStore.clearCache,

      // Store actions - Reset
      reset: goalStore.reset,
      resetLoadingStates: goalStore.resetLoadingStates,

      // =====================================================================
      // COMPUTED HELPERS
      // =====================================================================
      getAllGoalItems: goalStore.getAllGoalItems,
      getGoalItemsByPeriod: goalStore.getGoalItemsByPeriod,
      getGoalItemsByTaskRef: goalStore.getGoalItemsByTaskRef,
      getGoalsForTag: goalStore.getGoalsForTag,
      isAnyLoading: goalStore.isAnyLoading,
      isAnyMutating: goalStore.isAnyMutating,

      // Query methods (lazy initialized)
      async fetchGoals(period, date, options) {
        const composable = getGoalDatePeriodComposable(vm);
        if (composable) {
          return composable.fetchGoals(period, date, options);
        }
        console.warn('Apollo client not available for fetchGoals');
        return [];
      },

      /**
       * Alias for fetchGoals - returns full goalDatePeriod response
       * Used by components that need access to { id, date, period, goalItems }
       */
      async fetchGoalDatePeriod(period, date, options) {
        const composable = getGoalDatePeriodComposable(vm);
        if (composable) {
          return composable.fetchGoals(period, date, options);
        }
        console.warn('Apollo client not available for fetchGoalDatePeriod');
        return null;
      },

      async fetchGoalsByTag(tag, options) {
        const composable = getGoalsByTagComposable(vm);
        if (composable) {
          return composable.fetchGoalsByTag(tag, options);
        }
        console.warn('Apollo client not available for fetchGoalsByTag');
        return [];
      },

      async fetchMultipleTags(tags) {
        const composable = getGoalsByTagComposable(vm);
        if (composable) {
          return composable.fetchMultipleTags(tags);
        }
        console.warn('Apollo client not available for fetchMultipleTags');
        return {};
      },

      async fetchGoalsByGoalRef(goalRef, options) {
        const composable = getGoalsByGoalRefComposable(vm);
        if (composable) {
          return composable.fetchGoalsByGoalRef(goalRef, options);
        }
        console.warn('Apollo client not available for fetchGoalsByGoalRef');
        return [];
      },

      async fetchAgendaGoals(date, options) {
        const composable = getAgendaGoalsComposable(vm);
        if (composable) {
          return composable.fetchAgendaGoals(date, options);
        }
        console.warn('Apollo client not available for fetchAgendaGoals');
        return [];
      },

      async fetchMonthTaskGoals(date, taskRef, options) {
        const composable = getMonthTaskGoalsComposable(vm);
        if (composable) {
          return composable.fetchMonthTaskGoals(date, taskRef, options);
        }
        console.warn('Apollo client not available for fetchMonthTaskGoals');
        return [];
      },

      // Mutation methods (lazy initialized)
      async addGoalItem(goalItemData, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.addGoalItem(goalItemData, options);
        }
        console.warn('Apollo client not available for addGoalItem');
        return null;
      },

      async completeGoalItem(params, options) {
        console.log('[goal.js plugin] completeGoalItem called with:', params);
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.completeGoalItem(params, options);
        }
        console.warn('Apollo client not available for completeGoalItem');
        return null;
      },

      async deleteGoalItem({ id, date, period }, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.deleteGoalItem({ id, date, period }, options);
        }
        console.warn('Apollo client not available for deleteGoalItem');
        return null;
      },

      async updateGoalItem(idOrUpdates, updates, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          // The composable handles both calling patterns:
          // 1. (id, updates, options) - plugin style
          // 2. ({ id, ...fields }, options) - container style
          return composable.updateGoalItem(idOrUpdates, updates, options);
        }
        console.warn('Apollo client not available for updateGoalItem');
        return null;
      },

      async updateContribution(id, contribution, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.updateContribution(id, contribution, options);
        }
        console.warn('Apollo client not available for updateContribution');
        return null;
      },

      async completeSubTaskItem(params, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.completeSubTaskItem(params, options);
        }
        console.warn('Apollo client not available for completeSubTaskItem');
        return null;
      },

      async addSubTaskItem({ taskId, body, period, date, isComplete }, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.addSubTaskItem(
            {
              taskId,
              body,
              period,
              date,
              isComplete,
            },
            options
          );
        }
        console.warn('Apollo client not available for addSubTaskItem');
        return null;
      },

      async deleteSubTaskItem({ id, taskId, date, period }, options) {
        const composable = getGoalMutationsComposable(vm);
        if (composable) {
          return composable.deleteSubTaskItem(
            {
              id,
              taskId,
              date,
              period,
            },
            options
          );
        }
        console.warn('Apollo client not available for deleteSubTaskItem');
        return null;
      },

      // Query variants for different use cases
      QUERY_VARIANTS: GOAL_QUERY_VARIANTS,
    });

    // Add to Vue prototype
    Object.defineProperty(Vue.prototype, '$goals', {
      get() {
        // Create proxy on first access per component
        if (!this.goalsProxyCache) {
          this.goalsProxyCache = createGoalsProxy(this);
        }
        return this.goalsProxyCache;
      },
    });

    // Add global mixin for reactive computed properties
    Vue.mixin({
      computed: {
        /**
         * Reactive goals array from store
         */
        $goalsData() {
          return this.$goals.goals;
        },

        /**
         * Reactive goals by tag map
         */
        $goalsByTagData() {
          return this.$goals.goalsByTag;
        },

        /**
         * Reactive agenda goals
         */
        $agendaGoalsData() {
          return this.$goals.agendaGoals;
        },

        /**
         * Reactive month task goals
         */
        $monthTaskGoalsData() {
          return this.$goals.monthTaskGoals;
        },

        /**
         * Reactive goals loading state
         */
        $goalsLoading() {
          return this.$goals.isLoadingGoals;
        },

        /**
         * Reactive any loading state
         */
        $goalsAnyLoading() {
          return this.$goals.isAnyLoading();
        },

        /**
         * Reactive any mutating state
         */
        $goalsMutating() {
          return this.$goals.isAnyMutating();
        },

        /**
         * Reactive goals error
         */
        $goalsError() {
          return this.$goals.error;
        },

        /**
         * Reactive mutation error
         */
        $goalsMutationError() {
          return this.$goals.mutationError;
        },
      },
    });
  },
};
