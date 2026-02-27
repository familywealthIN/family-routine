/**
 * Goal Store
 *
 * Shared reactive store for goal data using Vue.observable pattern.
 * This store centralizes goal state that was previously duplicated
 * across 14+ components with various query variations.
 *
 * Offline caching is now handled by Apollo cache persistence.
 */
import Vue from 'vue';
import moment from 'moment';

// ============================================================================
// REACTIVE STORE STATE
// ============================================================================

const goalStore = Vue.observable({
  // Current filter state
  currentDate: moment().format('DD-MM-YYYY'),
  currentPeriod: 'day',
  currentTag: '',
  currentTaskRef: '',
  currentGoalRef: '',

  // Goal data collections
  goals: [], // goalDatePeriod results
  goalsByTag: {}, // Keyed by tag name
  goalsByGoalRef: [], // goalsByGoalRef results
  agendaGoals: [], // agendaGoals results
  monthTaskGoals: [], // monthTaskGoals results

  // Loading states per query type
  isLoadingGoals: false,
  isLoadingGoalsByTag: false,
  isLoadingGoalsByGoalRef: false,
  isLoadingAgendaGoals: false,
  isLoadingMonthTaskGoals: false,

  // Mutation loading states
  isAddingGoal: false,
  isCompletingGoal: false,
  isDeletingGoal: false,

  // Error states
  error: null,
  mutationError: null,

  // Cache for queries (keyed by query params hash)
  queryCache: {},
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a cache key from query parameters
 */
const getCacheKey = (queryType, params) => `${queryType}:${JSON.stringify(params)}`;

/**
 * Check if cache entry is valid (not expired)
 */
const isCacheValid = (cacheEntry, maxAge = 5 * 60 * 1000) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.fetchedAt < maxAge;
};

// ============================================================================
// COMPUTED GETTERS (defined early to avoid use-before-define)
// ============================================================================

/**
 * Get all goal items flattened from goals array
 */
const getAllGoalItems = () => goalStore.goals.reduce(
  (acc, goal) => [...acc, ...(goal.goalItems || [])],
  [],
);

/**
 * Get goal items filtered by period
 */
const getGoalItemsByPeriod = (period) => {
  const goal = goalStore.goals.find((g) => g.period === period);
  return goal ? goal.goalItems || [] : [];
};

/**
 * Get goal items filtered by task ref
 */
const getGoalItemsByTaskRef = (taskRef) => getAllGoalItems().filter((item) => item.taskRef === taskRef);

/**
 * Get goals for a specific tag
 */
const getGoalsForTag = (tag) => goalStore.goalsByTag[tag] || [];

/**
 * Check if any query is loading
 */
const isAnyLoading = () => goalStore.isLoadingGoals
  || goalStore.isLoadingGoalsByTag
  || goalStore.isLoadingGoalsByGoalRef
  || goalStore.isLoadingAgendaGoals
  || goalStore.isLoadingMonthTaskGoals;

/**
 * Check if any mutation is in progress
 */
const isAnyMutating = () => goalStore.isAddingGoal
  || goalStore.isCompletingGoal
  || goalStore.isDeletingGoal;

// ============================================================================
// ACTIONS
// ============================================================================

const goalActions = {
  // ---------------------------------------------------------------------------
  // Filter State Actions
  // ---------------------------------------------------------------------------

  setCurrentDate(date) {
    goalStore.currentDate = date;
  },

  setCurrentPeriod(period) {
    goalStore.currentPeriod = period;
  },

  setCurrentTag(tag) {
    goalStore.currentTag = tag;
  },

  setCurrentTaskRef(taskRef) {
    goalStore.currentTaskRef = taskRef;
  },

  setCurrentGoalRef(goalRef) {
    goalStore.currentGoalRef = goalRef;
  },

  // ---------------------------------------------------------------------------
  // Goal Data Actions
  // ---------------------------------------------------------------------------

  /**
         * Set goals from goalDatePeriod query
         */
  setGoals(goals) {
    goalStore.goals = goals || [];
  },

  /**
         * Set goals by tag (stores in map keyed by tag)
         */
  setGoalsByTag(tag, goals) {
    Vue.set(goalStore.goalsByTag, tag, goals || []);
  },

  /**
         * Set goals by goal ref
         */
  setGoalsByGoalRef(goals) {
    goalStore.goalsByGoalRef = goals || [];
  },

  /**
         * Set agenda goals
         */
  setAgendaGoals(goals) {
    goalStore.agendaGoals = goals || [];
  },

  /**
         * Set month task goals
         */
  setMonthTaskGoals(goals) {
    goalStore.monthTaskGoals = goals || [];
  },

  // ---------------------------------------------------------------------------
  // Loading State Actions
  // ---------------------------------------------------------------------------

  setLoadingGoals(isLoading) {
    goalStore.isLoadingGoals = isLoading;
  },

  setLoadingGoalsByTag(isLoading) {
    goalStore.isLoadingGoalsByTag = isLoading;
  },

  setLoadingGoalsByGoalRef(isLoading) {
    goalStore.isLoadingGoalsByGoalRef = isLoading;
  },

  setLoadingAgendaGoals(isLoading) {
    goalStore.isLoadingAgendaGoals = isLoading;
  },

  setLoadingMonthTaskGoals(isLoading) {
    goalStore.isLoadingMonthTaskGoals = isLoading;
  },

  setAddingGoal(isAdding) {
    goalStore.isAddingGoal = isAdding;
  },

  setCompletingGoal(isCompleting) {
    goalStore.isCompletingGoal = isCompleting;
  },

  setDeletingGoal(isDeleting) {
    goalStore.isDeletingGoal = isDeleting;
  },

  // ---------------------------------------------------------------------------
  // Error Actions
  // ---------------------------------------------------------------------------

  setError(error) {
    goalStore.error = error;
  },

  setMutationError(error) {
    goalStore.mutationError = error;
  },

  clearErrors() {
    goalStore.error = null;
    goalStore.mutationError = null;
  },

  // ---------------------------------------------------------------------------
  // Cache Actions
  // ---------------------------------------------------------------------------

  /**
         * Store query result in cache
         */
  setCacheEntry(queryType, params, data) {
    const key = getCacheKey(queryType, params);
    goalStore.queryCache[key] = {
      data,
      fetchedAt: Date.now(),
    };
  },

  /**
         * Get cached query result if valid
         */
  getCacheEntry(queryType, params, maxAge) {
    const key = getCacheKey(queryType, params);
    const entry = goalStore.queryCache[key];
    return isCacheValid(entry, maxAge) ? entry.data : null;
  },

  /**
         * Clear cache for a specific query type or all
         */
  clearCache(queryType) {
    if (queryType) {
      Object.keys(goalStore.queryCache).forEach((key) => {
        if (key.startsWith(`${queryType}:`)) {
          delete goalStore.queryCache[key];
        }
      });
    } else {
      goalStore.queryCache = {};
    }
  },

  // ---------------------------------------------------------------------------
  // Reset Actions
  // ---------------------------------------------------------------------------

  /**
         * Reset all goal data
         */
  reset() {
    goalStore.goals = [];
    goalStore.goalsByTag = {};
    goalStore.goalsByGoalRef = [];
    goalStore.agendaGoals = [];
    goalStore.monthTaskGoals = [];
    goalStore.error = null;
    goalStore.mutationError = null;
    goalStore.queryCache = {};
  },

  /**
         * Reset only loading states
         */
  resetLoadingStates() {
    goalStore.isLoadingGoals = false;
    goalStore.isLoadingGoalsByTag = false;
    goalStore.isLoadingGoalsByGoalRef = false;
    goalStore.isLoadingAgendaGoals = false;
    goalStore.isLoadingMonthTaskGoals = false;
    goalStore.isAddingGoal = false;
    goalStore.isCompletingGoal = false;
    goalStore.isDeletingGoal = false;
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Direct state access
  state: goalStore,

  // Actions
  ...goalActions,

  // Reactive getters
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
  get error() {
    return goalStore.error;
  },
  get mutationError() {
    return goalStore.mutationError;
  },

  // Computed helpers
  getAllGoalItems,
  getGoalItemsByPeriod,
  getGoalItemsByTaskRef,
  getGoalsForTag,
  isAnyLoading,
  isAnyMutating,
};
