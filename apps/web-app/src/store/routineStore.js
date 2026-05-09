/**
 * Routine Store
 *
 * Shared reactive store for routine data using Vue.observable pattern.
 * This store centralizes routine state that was previously duplicated
 * across 5+ components (AgendaTreeTime, DashBoard, GoalCreationContainer, etc.)
 *
 * Features:
 * - In-memory cache with 5-minute TTL
 * - Offline caching handled by Apollo cache persistence
 */
import Vue from 'vue';
import moment from 'moment';

// ============================================================================
// REACTIVE STORE STATE
// ============================================================================

const routineStore = Vue.observable({
  // Current routine data
  routineId: '',
  date: moment().format('DD-MM-YYYY'),
  tasklist: [],
  skipDay: false,

  // Loading states per operation
  isLoading: false,
  isAddingRoutine: false,

  // Error state
  error: null,

  // Cache for multiple dates (keyed by date string)
  routineCache: {},
});

// ============================================================================
// ACTIONS
// ============================================================================

const routineActions = {
  /**
         * Set the current routine date
         * @param {string} date - Date in DD-MM-YYYY format
         */
  setDate(date) {
    routineStore.date = date;
  },

  /**
         * Set the routine ID
         * @param {string} id - Routine document ID
         */
  setRoutineId(id) {
    routineStore.routineId = id || '';
  },

  /**
         * Set the tasklist
         * @param {Array} tasklist - Array of task objects
         */
  setTasklist(tasklist) {
    routineStore.tasklist = tasklist || [];
  },

  /**
         * Set skip day flag
         * @param {boolean} skip - Whether the day is skipped
         */
  setSkipDay(skip) {
    routineStore.skipDay = !!skip;
  },

  /**
         * Set loading state
         * @param {boolean} isLoading - Loading state
         */
  setLoading(isLoading) {
    routineStore.isLoading = isLoading;
  },

  /**
         * Set adding routine state
         * @param {boolean} isAdding - Adding state
         */
  setAddingRoutine(isAdding) {
    routineStore.isAddingRoutine = isAdding;
  },

  /**
         * Set error state
         * @param {Error|null} error - Error object or null
         */
  setError(error) {
    routineStore.error = error;
  },

  /**
         * Update routine data from API response
         * @param {Object} routineData - Routine data from GraphQL response
         */
  updateFromResponse(routineData) {
    if (routineData) {
      routineStore.routineId = routineData.id || '';
      routineStore.skipDay = !!routineData.skip;
      routineStore.tasklist = routineData.tasklist || [];

      // Cache the routine by date (in-memory)
      if (routineData.date) {
        routineStore.routineCache[routineData.date] = {
          id: routineData.id,
          skip: routineData.skip,
          tasklist: routineData.tasklist,
          fetchedAt: Date.now(),
        };
      }
    } else {
      routineStore.routineId = '';
      routineStore.tasklist = [];
      routineStore.skipDay = false;
    }
  },

  /**
         * Get cached routine for a specific date (from in-memory cache)
         * @param {string} date - Date in DD-MM-YYYY format
         * @returns {Object|null} Cached routine data or null
         */
  getCachedRoutine(date) {
    const cached = routineStore.routineCache[date];
    // Cache expires after 5 minutes
    if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
      return cached;
    }
    return null;
  },

  /**
         * Clear the cache for a specific date or all dates
         * @param {string} [date] - Optional date to clear, clears all if not provided
         */
  clearCache(date) {
    if (date) {
      delete routineStore.routineCache[date];
    } else {
      routineStore.routineCache = {};
    }
  },

  /**
         * Reset the store to initial state
         */
  reset() {
    routineStore.routineId = '';
    routineStore.date = moment().format('DD-MM-YYYY');
    routineStore.tasklist = [];
    routineStore.skipDay = false;
    routineStore.isLoading = false;
    routineStore.isAddingRoutine = false;
    routineStore.error = null;
  },
};

// ============================================================================
// COMPUTED GETTERS
// ============================================================================

/**
 * Get task by ID from current tasklist
 * @param {string} taskId - Task ID
 * @returns {Object|undefined} Task object or undefined
 */
const getTaskById = (taskId) => routineStore.tasklist.find((t) => t.id === taskId);

/**
 * Get tasks filtered by tag
 * @param {string} tag - Tag to filter by
 * @returns {Array} Filtered tasks
 */
const getTasksByTag = (tag) => routineStore.tasklist.filter(
  (t) => t.tags && t.tags.includes(tag),
);

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Direct state access
  state: routineStore,

  // Actions
  setDate: routineActions.setDate,
  setRoutineId: routineActions.setRoutineId,
  setTasklist: routineActions.setTasklist,
  setSkipDay: routineActions.setSkipDay,
  setLoading: routineActions.setLoading,
  setAddingRoutine: routineActions.setAddingRoutine,
  setError: routineActions.setError,
  updateFromResponse: routineActions.updateFromResponse,
  getCachedRoutine: routineActions.getCachedRoutine,
  clearCache: routineActions.clearCache,
  reset: routineActions.reset,

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

  // Computed helpers
  getTaskById,
  getTasksByTag,
};
