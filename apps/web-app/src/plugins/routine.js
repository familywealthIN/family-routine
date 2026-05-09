/**
 * Routine Plugin
 *
 * Vue plugin that makes routine store and composables globally accessible.
 * Provides this.$routine in all components with reactive computed properties.
 *
 * Usage:
 *   // In main.js
 *   import routinePlugin from './plugins/routine';
 *   Vue.use(routinePlugin);
 *
 *   // In components
 *   this.$routine.tasklist  // reactive tasklist
 *   this.$routine.fetchRoutine(date)  // fetch routine
 *   this.$routineTasklist   // computed property via mixin
 */
import routineStore from '../store/routineStore';
import { useRoutineQueries, ROUTINE_QUERY_VARIANTS } from '../composables/useRoutineQueries';

export default {
  install(Vue) {
    // Store reference to apollo client (set after app creation)
    let apolloClient = null;
    let routineComposable = null;

    /**
     * Lazy initialization of composable with Apollo client
     */
    const getComposable = (vm) => {
      if (!routineComposable && vm.$apollo) {
        apolloClient = vm.$apollo;
        routineComposable = useRoutineQueries(apolloClient);
      }
      return routineComposable;
    };

    /**
     * Create the $routine object with store access and methods
     */
    const createRoutineProxy = (vm) => ({
      // Direct store state access (reactive)
      get state() {
        return routineStore.state;
      },

      // Reactive getters
      get routineId() {
        return routineStore.routineId;
      },
      get date() {
        return routineStore.date;
      },
      get tasklist() {
        return routineStore.tasklist;
      },
      get skipDay() {
        return routineStore.skipDay;
      },
      get isLoading() {
        return routineStore.isLoading;
      },
      get isAddingRoutine() {
        return routineStore.isAddingRoutine;
      },
      get error() {
        return routineStore.error;
      },

      // Store actions
      setDate: routineStore.setDate,
      setRoutineId: routineStore.setRoutineId,
      setTasklist: routineStore.setTasklist,
      setSkipDay: routineStore.setSkipDay,
      setLoading: routineStore.setLoading,
      setError: routineStore.setError,
      updateFromResponse: routineStore.updateFromResponse,
      getCachedRoutine: routineStore.getCachedRoutine,
      getIndexedDBCache: routineStore.getIndexedDBCache,
      loadFromIndexedDB: routineStore.loadFromIndexedDB,
      clearCache: routineStore.clearCache,
      reset: routineStore.reset,
      init: routineStore.init,

      // Computed helpers
      getTaskById: routineStore.getTaskById,
      getTasksByTag: routineStore.getTasksByTag,

      // Composable methods (lazy initialized)
      async fetchRoutine(date, options) {
        const composable = getComposable(vm);
        if (composable) {
          return composable.fetchRoutine(date, options);
        }
        console.warn('Apollo client not available for fetchRoutine');
        return null;
      },

      async addRoutine(date) {
        const composable = getComposable(vm);
        if (composable) {
          return composable.addRoutine(date);
        }
        console.warn('Apollo client not available for addRoutine');
        return null;
      },

      async refetch() {
        const composable = getComposable(vm);
        if (composable) {
          return composable.refetch();
        }
        return null;
      },

      // Query variants for different use cases
      QUERY_VARIANTS: ROUTINE_QUERY_VARIANTS,
    });

    // Add to Vue prototype
    Object.defineProperty(Vue.prototype, '$routine', {
      get() {
        // Create proxy on first access per component
        if (!this._routineProxy) {
          this._routineProxy = createRoutineProxy(this);
        }
        return this._routineProxy;
      },
    });

    // Add global mixin for reactive computed properties
    Vue.mixin({
      computed: {
        /**
         * Reactive tasklist from routine store
         */
        $routineTasklist() {
          return this.$routine.tasklist;
        },

        /**
         * Reactive routine ID
         */
        $routineId() {
          return this.$routine.routineId;
        },

        /**
         * Reactive routine date
         */
        $routineDate() {
          return this.$routine.date;
        },

        /**
         * Reactive skip day flag
         */
        $routineSkipDay() {
          return this.$routine.skipDay;
        },

        /**
         * Reactive loading state
         */
        $routineLoading() {
          return this.$routine.isLoading;
        },

        /**
         * Reactive error state
         */
        $routineError() {
          return this.$routine.error;
        },
      },
    });
  },
};
