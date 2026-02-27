/**
 * useRoutineQueries Composable
 *
 * Provides shared routine query functionality using Vue Composition API.
 * Centralizes the routineDate query (used in 5+ components) and addRoutine mutation.
 *
 * Usage:
 *   import { useRoutineQueries } from '@/composables/useRoutineQueries';
 *
 *   // In setup() or Options API
 *   const { tasklist, isLoading, fetchRoutine, addRoutine } = useRoutineQueries(this.$apollo);
 */
import { ref, computed } from '@vue/composition-api';
import gql from 'graphql-tag';
import routineStore from '../store/routineStore';
import {
  TASKLIST_STANDARD_FIELDS_STRING,
  TASKLIST_FULL_FIELDS_STRING,
  TASKLIST_CORE_FIELDS_STRING,
} from './graphql/fragments';

// ============================================================================
// QUERY DEFINITIONS
// ============================================================================

/**
 * Standard routine date query - most common usage
 */
export const ROUTINE_DATE_QUERY = gql`
  query getRoutineDate($date: String!) {
    routineDate(date: $date) {
      id
      date
      skip
      tasklist {
        ${TASKLIST_STANDARD_FIELDS_STRING}
      }
    }
  }
`;

/**
 * Full routine date query - includes all task fields
 */
export const ROUTINE_DATE_FULL_QUERY = gql`
  query getRoutineDateFull($date: String!) {
    routineDate(date: $date) {
      id
      date
      skip
      tasklist {
        ${TASKLIST_FULL_FIELDS_STRING}
      }
    }
  }
`;

/**
 * Core routine date query - without description
 */
export const ROUTINE_DATE_CORE_QUERY = gql`
  query getRoutineDateCore($date: String!) {
    routineDate(date: $date) {
      id
      date
      tasklist {
        ${TASKLIST_CORE_FIELDS_STRING}
        tags
      }
    }
  }
`;

// ============================================================================
// MUTATION DEFINITIONS
// ============================================================================

/**
 * Add routine mutation
 */
export const ADD_ROUTINE_MUTATION = gql`
  mutation addRoutine($date: String!) {
    addRoutine(date: $date) {
      id
    }
  }
`;

// ============================================================================
// COMPOSABLE FACTORY
// ============================================================================

/**
 * Query variant types
 */
export const ROUTINE_QUERY_VARIANTS = {
  STANDARD: 'standard',
  FULL: 'full',
  CORE: 'core',
};

/**
 * Get query by variant
 */
const getQueryByVariant = (variant) => {
  switch (variant) {
    case ROUTINE_QUERY_VARIANTS.FULL:
      return ROUTINE_DATE_FULL_QUERY;
    case ROUTINE_QUERY_VARIANTS.CORE:
      return ROUTINE_DATE_CORE_QUERY;
    case ROUTINE_QUERY_VARIANTS.STANDARD:
    default:
      return ROUTINE_DATE_QUERY;
  }
};

/**
 * Main composable for routine queries
 *
 * @param {Object} apolloClient - Apollo client instance (from this.$apollo)
 * @param {Object} options - Configuration options
 * @param {string} options.variant - Query variant (standard, full, minimal, core)
 * @param {boolean} options.useSharedStore - Whether to sync with shared store (default: true)
 * @param {boolean} options.autoCreateRoutine - Auto-create routine if not found (default: true)
 * @returns {Object} Composable state and methods
 */
export function useRoutineQueries(apolloClient, options = {}) {
  const {
    variant = ROUTINE_QUERY_VARIANTS.STANDARD,
    useSharedStore = true,
    autoCreateRoutine = true,
  } = options;

  // Local reactive state (for components that don't want shared state)
  const localTasklist = ref([]);
  const localRoutineId = ref('');
  const localSkipDay = ref(false);
  const localIsLoading = ref(false);
  const localError = ref(null);

  // Computed properties that read from shared or local store
  const tasklist = computed(() => (useSharedStore ? routineStore.tasklist : localTasklist.value));

  const routineId = computed(() => (useSharedStore ? routineStore.routineId : localRoutineId.value));

  const skipDay = computed(() => (useSharedStore ? routineStore.skipDay : localSkipDay.value));

  const isLoading = computed(() => (useSharedStore ? routineStore.isLoading : localIsLoading.value));

  const isAddingRoutine = computed(() => (useSharedStore
    ? routineStore.isAddingRoutine
    : localIsLoading.value));

  const error = computed(() => (useSharedStore ? routineStore.error : localError.value));

  /**
         * Set loading state
         */
  const setLoading = (loading) => {
    if (useSharedStore) {
      routineStore.setLoading(loading);
    } else {
      localIsLoading.value = loading;
    }
  };

  /**
         * Set error state
         */
  const setError = (err) => {
    if (useSharedStore) {
      routineStore.setError(err);
    } else {
      localError.value = err;
    }
  };

  /**
         * Update store from response
         * @param {Object} routineData - Routine data from API
         * @param {Object} persistOptions - Options for persistence
         */
  const updateFromResponse = (routineData, persistOptions = {}) => {
    if (useSharedStore) {
      routineStore.updateFromResponse(routineData, persistOptions);
    } else if (routineData) {
      localRoutineId.value = routineData.id || '';
      localSkipDay.value = !!routineData.skip;
      localTasklist.value = routineData.tasklist || [];
    } else {
      localRoutineId.value = '';
      localSkipDay.value = false;
      localTasklist.value = [];
    }
  };

  /**
         * Add a new routine for a date
         *
         * @param {string} date - Date in DD-MM-YYYY format
         * @returns {Promise<Object>} Created routine data
         */
  const addRoutine = async (date) => {
    if (useSharedStore) {
      routineStore.setAddingRoutine(true);
    }

    try {
      const { data } = await apolloClient.mutate({
        mutation: ADD_ROUTINE_MUTATION,
        variables: { date },
      });

      // Clear cache for this date to force refetch
      if (useSharedStore) {
        routineStore.clearCache(date);
      }

      return data?.addRoutine;
    } catch (err) {
      setError(err);
      console.error('Error adding routine:', err);
      throw err;
    } finally {
      if (useSharedStore) {
        routineStore.setAddingRoutine(false);
      }
    }
  };

  /**
         * Fetch routine for a specific date
         *
         * Strategy:
         * 1. Check in-memory cache first (5 min TTL)
         * 2. Load from IndexedDB for instant display while API fetches
         * 3. Fetch from API (always, in background if we have cached data)
         * 4. Update store and persist to IndexedDB
         *
         * @param {string} date - Date in DD-MM-YYYY format
         * @param {Object} fetchOptions - Additional options
         * @param {boolean} fetchOptions.useCache - Whether to use cache (default: true)
         * @param {boolean} fetchOptions.useIndexedDB - Whether to use IndexedDB cache (default: true)
         * @param {Function} fetchOptions.onNotFound - Callback when routine not found
         * @returns {Promise<Object>} Routine data
         */
  const fetchRoutine = async (date, fetchOptions = {}) => {
    const { useCache = true, useIndexedDB = true, onNotFound } = fetchOptions;

    // 1. Check in-memory cache first (fastest)
    if (useCache && useSharedStore) {
      const cached = routineStore.getCachedRoutine(date);
      if (cached) {
        console.log(`[useRoutineQueries] Using in-memory cache for ${date}`);
        updateFromResponse({ ...cached, date }, { persistToIndexedDB: false });
        return cached;
      }
    }

    // 2. Try to load from IndexedDB for instant display
    let indexedDBData = null;
    if (useIndexedDB && useSharedStore) {
      try {
        indexedDBData = await routineStore.loadFromIndexedDB(date);
        if (indexedDBData) {
          console.log(`[useRoutineQueries] Loaded from IndexedDB for instant display for ${date}`);
          // Don't return - continue to fetch fresh data from API
        }
      } catch (err) {
        console.warn('[useRoutineQueries] IndexedDB load failed:', err);
      }
    }

    // Only show loading if we don't have any cached data
    if (!indexedDBData) {
      setLoading(true);
    }
    setError(null);

    try {
      const query = getQueryByVariant(variant);
      const { data } = await apolloClient.query({
        query,
        variables: { date },
        fetchPolicy: 'network-only',
      });

      const routineData = data?.routineDate;

      if (routineData === null) {
        // Routine doesn't exist for this date
        if (autoCreateRoutine) {
          // Auto-create and refetch
          await addRoutine(date);
          return fetchRoutine(date, { ...fetchOptions, useCache: false, useIndexedDB: false });
        }
        if (onNotFound) {
          onNotFound(date);
        }
        updateFromResponse(null);
        return null;
      }

      // Update store and persist to IndexedDB
      updateFromResponse(routineData);
      return routineData;
    } catch (err) {
      setError(err);
      console.error('Error fetching routine:', err);
      // If we have IndexedDB data, don't throw - user still sees cached data
      if (indexedDBData) {
        console.log('[useRoutineQueries] API failed but IndexedDB data is available');
        return indexedDBData;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
         * Refetch the current routine
         */
  const refetch = () => {
    const currentDate = useSharedStore ? routineStore.date : null;
    if (currentDate) {
      return fetchRoutine(currentDate, { useCache: false });
    }
    return Promise.resolve(null);
  };

  /**
         * Clear the routine cache
         */
  const clearCache = (date) => {
    if (useSharedStore) {
      routineStore.clearCache(date);
    }
  };

  /**
         * Set the current date (for shared store)
         */
  const setDate = (date) => {
    if (useSharedStore) {
      routineStore.setDate(date);
    }
  };

  return {
    // State
    tasklist,
    routineId,
    skipDay,
    isLoading,
    isAddingRoutine,
    error,

    // Methods
    fetchRoutine,
    addRoutine,
    refetch,
    clearCache,
    setDate,
    setLoading,
    setError,

    // Direct store access (for advanced usage)
    store: useSharedStore ? routineStore : null,
  };
}

// ============================================================================
// APOLLO OPTIONS FACTORY (for gradual migration)
// ============================================================================

/**
 * Generate Apollo options object for Vue component
 * Use this for gradual migration from inline Apollo to composables
 *
 * @param {Object} options - Configuration
 * @param {Function} options.getDate - Function that returns date from component
 * @param {string} options.variant - Query variant
 * @param {Function} options.onUpdate - Callback on data update
 * @param {Function} options.onError - Callback on error
 * @returns {Object} Apollo options object
 */
export function createRoutineDateApolloOptions(options = {}) {
  const {
    getDate,
    variant = ROUTINE_QUERY_VARIANTS.STANDARD,
    onUpdate,
    onError,
  } = options;

  return {
    query: getQueryByVariant(variant),
    variables() {
      return {
        date: typeof getDate === 'function' ? getDate.call(this) : this.date,
      };
    },
    update(data) {
      const routineData = data?.routineDate;

      // Update shared store
      routineStore.updateFromResponse(routineData);

      // Call custom update handler
      if (onUpdate) {
        return onUpdate.call(this, routineData, data);
      }

      return routineData?.tasklist || [];
    },
    error(err) {
      routineStore.setError(err);
      routineStore.setLoading(false);

      if (onError) {
        onError.call(this, err);
      }
    },
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default useRoutineQueries;
