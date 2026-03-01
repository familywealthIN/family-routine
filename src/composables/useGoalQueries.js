/**
 * useGoalQueries Composable
 *
 * Provides shared goal query functionality using Vue Composition API.
 * Centralizes multiple goal queries that were duplicated across 14+ components:
 * - goalDatePeriod (4 occurrences)
 * - goalsByTag (6 occurrences)
 * - goalsByGoalRef (2 occurrences)
 * - agendaGoals (2 occurrences)
 * - monthTaskGoals (1 occurrence)
 *
 * Usage:
 *   import { useGoalDatePeriod, useGoalsByTag } from '@/composables/useGoalQueries';
 *
 *   // In setup() or component
 *   const { goals, isLoading, fetchGoals } = useGoalDatePeriod(this.$apollo);
 */
import { ref, computed } from '@vue/composition-api';
import gql from 'graphql-tag';
import goalStore from '../store/goalStore';
import {
  GOAL_ITEM_STANDARD_FIELDS_STRING,
  GOAL_ITEM_CORE_FIELDS_STRING,
  GOAL_ITEM_FULL_FIELDS_STRING,
} from './graphql/fragments';

// ============================================================================
// QUERY DEFINITIONS
// ============================================================================

/**
 * Goal date period query - standard fields
 */
export const GOAL_DATE_PERIOD_QUERY = gql`
  query goalDatePeriod($period: String!, $date: String!) {
    goalDatePeriod(period: $period, date: $date) {
      id
      date
      period
      goalItems {
        ${GOAL_ITEM_STANDARD_FIELDS_STRING}
      }
    }
  }
`;

/**
 * Goal date period query - minimal fields (for dropdowns, etc.)
 */
export const GOAL_DATE_PERIOD_MINIMAL_QUERY = gql`
  query goalDatePeriodMinimal($period: String!, $date: String!) {
    goalDatePeriod(period: $period, date: $date) {
      id
      date
      period
      goalItems {
        id
        body
      }
    }
  }
`;

/**
 * Goal date period query - full fields
 */
export const GOAL_DATE_PERIOD_FULL_QUERY = gql`
  query goalDatePeriodFull($period: String!, $date: String!) {
    goalDatePeriod(period: $period, date: $date) {
      id
      date
      period
      goalItems {
        ${GOAL_ITEM_FULL_FIELDS_STRING}
      }
    }
  }
`;

/**
 * Goals by tag query
 */
export const GOALS_BY_TAG_QUERY = gql`
  query goalsByTag($tag: String!) {
    goalsByTag(tag: $tag) {
      id
      date
      period
      goalItems {
        ${GOAL_ITEM_STANDARD_FIELDS_STRING}
      }
    }
  }
`;

/**
 * Goals by goal ref query
 */
export const GOALS_BY_GOAL_REF_QUERY = gql`
  query goalsByGoalRef($goalRef: String!) {
    goalsByGoalRef(goalRef: $goalRef) {
      id
      date
      period
      goalItems {
        ${GOAL_ITEM_STANDARD_FIELDS_STRING}
      }
    }
  }
`;

/**
 * Agenda goals query - gets goals for a specific date across all periods
 */
export const AGENDA_GOALS_QUERY = gql`
  query agendaGoals($date: String!) {
    agendaGoals(date: $date) {
      id
      date
      period
      goalItems {
        id
        body
        progress
        isComplete
        taskRef
        goalRef
      }
    }
  }
`;

/**
 * Month task goals query
 */
export const MONTH_TASK_GOALS_QUERY = gql`
  query monthTaskGoals($date: String!, $taskRef: String!) {
    monthTaskGoals(date: $date, taskRef: $taskRef) {
      id
      date
      period
      goalItems {
        id
        body
        progress
        isComplete
        taskRef
        goalRef
      }
    }
  }
`;

// ============================================================================
// QUERY VARIANTS
// ============================================================================

export const GOAL_QUERY_VARIANTS = {
  STANDARD: 'standard',
  MINIMAL: 'minimal',
  FULL: 'full',
};

const getGoalDatePeriodQuery = (variant) => {
  switch (variant) {
    case GOAL_QUERY_VARIANTS.MINIMAL:
      return GOAL_DATE_PERIOD_MINIMAL_QUERY;
    case GOAL_QUERY_VARIANTS.FULL:
      return GOAL_DATE_PERIOD_FULL_QUERY;
    default:
      return GOAL_DATE_PERIOD_QUERY;
  }
};

// ============================================================================
// COMPOSABLES
// ============================================================================

/**
 * Composable for goalDatePeriod query
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} options - Configuration options
 * @returns {Object} Composable state and methods
 */
export function useGoalDatePeriod(apolloClient, options = {}) {
  const {
    variant = GOAL_QUERY_VARIANTS.STANDARD,
    useSharedStore = true,
  } = options;

  // Local state for non-shared mode
  const localGoals = ref([]);
  const localIsLoading = ref(false);
  const localError = ref(null);

  // Computed properties
  const goals = computed(() => (useSharedStore ? goalStore.goals : localGoals.value));

  const isLoading = computed(() => (useSharedStore
    ? goalStore.isLoadingGoals
    : localIsLoading.value));

  const error = computed(() => (useSharedStore ? goalStore.error : localError.value));

  /**
     * Fetch goals for a specific period and date
     */
  const fetchGoals = async (period, date, fetchOptions = {}) => {
    const { useCache = true } = fetchOptions;

    // Check cache
    if (useCache && useSharedStore) {
      const cached = goalStore.getCacheEntry('goalDatePeriod', { period, date });
      if (cached) {
        goalStore.setGoals(cached);
        return cached;
      }
    }

    if (useSharedStore) {
      goalStore.setLoadingGoals(true);
      goalStore.setCurrentPeriod(period);
      goalStore.setCurrentDate(date);
    } else {
      localIsLoading.value = true;
    }

    try {
      const query = getGoalDatePeriodQuery(variant);
      const { data } = await apolloClient.query({
        query,
        variables: { period, date },
        fetchPolicy: 'network-only',
      });

      const goalsData = data?.goalDatePeriod || [];

      if (useSharedStore) {
        goalStore.setGoals(goalsData);
        goalStore.setCacheEntry('goalDatePeriod', { period, date }, goalsData);
      } else {
        localGoals.value = goalsData;
      }

      return goalsData;
    } catch (err) {
      if (useSharedStore) {
        goalStore.setError(err);
      } else {
        localError.value = err;
      }
      console.error('Error fetching goals:', err);
      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setLoadingGoals(false);
      } else {
        localIsLoading.value = false;
      }
    }
  };

  /**
     * Refetch current goals
     */
  const refetch = () => {
    if (useSharedStore) {
      return fetchGoals(goalStore.currentPeriod, goalStore.currentDate, { useCache: false });
    }
    return Promise.resolve([]);
  };

  return {
    goals,
    isLoading,
    error,
    fetchGoals,
    refetch,
    store: useSharedStore ? goalStore : null,
  };
}

/**
 * Composable for goalsByTag query
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} options - Configuration options
 * @returns {Object} Composable state and methods
 */
export function useGoalsByTag(apolloClient, options = {}) {
  const { useSharedStore = true } = options;

  // Local state
  const localGoalsByTag = ref({});
  const localIsLoading = ref(false);
  const localError = ref(null);

  // Computed properties
  const goalsByTag = computed(() => (useSharedStore
    ? goalStore.goalsByTag
    : localGoalsByTag.value));

  const isLoading = computed(() => (useSharedStore
    ? goalStore.isLoadingGoalsByTag
    : localIsLoading.value));

  const error = computed(() => (useSharedStore ? goalStore.error : localError.value));

  /**
     * Get goals for a specific tag
     */
  const getGoalsForTag = (tag) => (useSharedStore
    ? goalStore.getGoalsForTag(tag)
    : (localGoalsByTag.value[tag] || []));

  /**
     * Fetch goals by tag
     */
  const fetchGoalsByTag = async (tag, fetchOptions = {}) => {
    const { useCache = true } = fetchOptions;

    // Check cache
    if (useCache && useSharedStore) {
      const cached = goalStore.getCacheEntry('goalsByTag', { tag });
      if (cached) {
        goalStore.setGoalsByTag(tag, cached);
        return cached;
      }
    }

    if (useSharedStore) {
      goalStore.setLoadingGoalsByTag(true);
      goalStore.setCurrentTag(tag);
    } else {
      localIsLoading.value = true;
    }

    try {
      const { data } = await apolloClient.query({
        query: GOALS_BY_TAG_QUERY,
        variables: { tag },
        fetchPolicy: 'network-only',
      });

      const goalsData = data?.goalsByTag || [];

      if (useSharedStore) {
        goalStore.setGoalsByTag(tag, goalsData);
        goalStore.setCacheEntry('goalsByTag', { tag }, goalsData);
      } else {
        localGoalsByTag.value = { ...localGoalsByTag.value, [tag]: goalsData };
      }

      return goalsData;
    } catch (err) {
      if (useSharedStore) {
        goalStore.setError(err);
      } else {
        localError.value = err;
      }
      console.error('Error fetching goals by tag:', err);
      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setLoadingGoalsByTag(false);
      } else {
        localIsLoading.value = false;
      }
    }
  };

  /**
     * Fetch multiple tags at once
     */
  const fetchMultipleTags = async (tags) => {
    const results = await Promise.all(tags.map((tag) => fetchGoalsByTag(tag)));
    return tags.reduce((acc, tag, idx) => {
      acc[tag] = results[idx];
      return acc;
    }, {});
  };

  return {
    goalsByTag,
    isLoading,
    error,
    getGoalsForTag,
    fetchGoalsByTag,
    fetchMultipleTags,
    store: useSharedStore ? goalStore : null,
  };
}

/**
 * Composable for goalsByGoalRef query
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} options - Configuration options
 * @returns {Object} Composable state and methods
 */
export function useGoalsByGoalRef(apolloClient, options = {}) {
  const { useSharedStore = true } = options;

  // Local state
  const localGoals = ref([]);
  const localIsLoading = ref(false);
  const localError = ref(null);

  // Computed properties
  const goals = computed(() => (useSharedStore
    ? goalStore.goalsByGoalRef
    : localGoals.value));

  const isLoading = computed(() => (useSharedStore
    ? goalStore.isLoadingGoalsByGoalRef
    : localIsLoading.value));

  const error = computed(() => (useSharedStore ? goalStore.error : localError.value));

  /**
     * Fetch goals by goal reference
     */
  const fetchGoalsByGoalRef = async (goalRef, fetchOptions = {}) => {
    const { useCache = true } = fetchOptions;

    // Check cache
    if (useCache && useSharedStore) {
      const cached = goalStore.getCacheEntry('goalsByGoalRef', { goalRef });
      if (cached) {
        goalStore.setGoalsByGoalRef(cached);
        return cached;
      }
    }

    if (useSharedStore) {
      goalStore.setLoadingGoalsByGoalRef(true);
      goalStore.setCurrentGoalRef(goalRef);
    } else {
      localIsLoading.value = true;
    }

    try {
      const { data } = await apolloClient.query({
        query: GOALS_BY_GOAL_REF_QUERY,
        variables: { goalRef },
        fetchPolicy: 'network-only',
      });

      const goalsData = data?.goalsByGoalRef || [];

      if (useSharedStore) {
        goalStore.setGoalsByGoalRef(goalsData);
        goalStore.setCacheEntry('goalsByGoalRef', { goalRef }, goalsData);
      } else {
        localGoals.value = goalsData;
      }

      return goalsData;
    } catch (err) {
      if (useSharedStore) {
        goalStore.setError(err);
      } else {
        localError.value = err;
      }
      console.error('Error fetching goals by goal ref:', err);
      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setLoadingGoalsByGoalRef(false);
      } else {
        localIsLoading.value = false;
      }
    }
  };

  return {
    goals,
    isLoading,
    error,
    fetchGoalsByGoalRef,
    store: useSharedStore ? goalStore : null,
  };
}

/**
 * Composable for agendaGoals query
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} options - Configuration options
 * @returns {Object} Composable state and methods
 */
export function useAgendaGoals(apolloClient, options = {}) {
  const { useSharedStore = true } = options;

  // Local state
  const localGoals = ref([]);
  const localIsLoading = ref(false);
  const localError = ref(null);

  // Computed properties
  const goals = computed(() => (useSharedStore
    ? goalStore.agendaGoals
    : localGoals.value));

  const isLoading = computed(() => (useSharedStore
    ? goalStore.isLoadingAgendaGoals
    : localIsLoading.value));

  const error = computed(() => (useSharedStore ? goalStore.error : localError.value));

  /**
     * Fetch agenda goals for a specific date
     */
  const fetchAgendaGoals = async (date, fetchOptions = {}) => {
    const { useCache = true } = fetchOptions;

    // Check cache
    if (useCache && useSharedStore) {
      const cached = goalStore.getCacheEntry('agendaGoals', { date });
      if (cached) {
        goalStore.setAgendaGoals(cached);
        return cached;
      }
    }

    if (useSharedStore) {
      goalStore.setLoadingAgendaGoals(true);
    } else {
      localIsLoading.value = true;
    }

    try {
      const { data } = await apolloClient.query({
        query: AGENDA_GOALS_QUERY,
        variables: { date },
        fetchPolicy: 'network-only',
      });

      const goalsData = data?.agendaGoals || [];

      if (useSharedStore) {
        goalStore.setAgendaGoals(goalsData);
        goalStore.setCacheEntry('agendaGoals', { date }, goalsData);
      } else {
        localGoals.value = goalsData;
      }

      return goalsData;
    } catch (err) {
      if (useSharedStore) {
        goalStore.setError(err);
      } else {
        localError.value = err;
      }
      console.error('Error fetching agenda goals:', err);
      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setLoadingAgendaGoals(false);
      } else {
        localIsLoading.value = false;
      }
    }
  };

  return {
    goals,
    isLoading,
    error,
    fetchAgendaGoals,
    store: useSharedStore ? goalStore : null,
  };
}

/**
 * Composable for monthTaskGoals query
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} options - Configuration options
 * @returns {Object} Composable state and methods
 */
export function useMonthTaskGoals(apolloClient, options = {}) {
  const { useSharedStore = true } = options;

  // Local state
  const localGoals = ref([]);
  const localIsLoading = ref(false);
  const localError = ref(null);

  // Computed properties
  const goals = computed(() => (useSharedStore
    ? goalStore.monthTaskGoals
    : localGoals.value));

  const isLoading = computed(() => (useSharedStore
    ? goalStore.isLoadingMonthTaskGoals
    : localIsLoading.value));

  const error = computed(() => (useSharedStore ? goalStore.error : localError.value));

  /**
     * Fetch month task goals
     */
  const fetchMonthTaskGoals = async (date, taskRef, fetchOptions = {}) => {
    const { useCache = true } = fetchOptions;

    // Check cache
    if (useCache && useSharedStore) {
      const cached = goalStore.getCacheEntry('monthTaskGoals', { date, taskRef });
      if (cached) {
        goalStore.setMonthTaskGoals(cached);
        return cached;
      }
    }

    if (useSharedStore) {
      goalStore.setLoadingMonthTaskGoals(true);
    } else {
      localIsLoading.value = true;
    }

    try {
      const { data } = await apolloClient.query({
        query: MONTH_TASK_GOALS_QUERY,
        variables: { date, taskRef },
        fetchPolicy: 'network-only',
      });

      const goalsData = data?.monthTaskGoals || [];

      if (useSharedStore) {
        goalStore.setMonthTaskGoals(goalsData);
        goalStore.setCacheEntry('monthTaskGoals', { date, taskRef }, goalsData);
      } else {
        localGoals.value = goalsData;
      }

      return goalsData;
    } catch (err) {
      if (useSharedStore) {
        goalStore.setError(err);
      } else {
        localError.value = err;
      }
      console.error('Error fetching month task goals:', err);
      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setLoadingMonthTaskGoals(false);
      } else {
        localIsLoading.value = false;
      }
    }
  };

  return {
    goals,
    isLoading,
    error,
    fetchMonthTaskGoals,
    store: useSharedStore ? goalStore : null,
  };
}

// ============================================================================
// APOLLO OPTIONS FACTORIES (for gradual migration)
// ============================================================================

/**
 * Create Apollo options for goalDatePeriod query
 */
export function createGoalDatePeriodApolloOptions(options = {}) {
  const {
    getPeriod,
    getDate,
    variant = GOAL_QUERY_VARIANTS.STANDARD,
    onUpdate,
    onError,
  } = options;

  return {
    query: getGoalDatePeriodQuery(variant),
    variables() {
      return {
        period: typeof getPeriod === 'function' ? getPeriod.call(this) : this.period,
        date: typeof getDate === 'function' ? getDate.call(this) : this.date,
      };
    },
    update(data) {
      const goalsData = data?.goalDatePeriod || [];
      goalStore.setGoals(goalsData);

      if (onUpdate) {
        return onUpdate.call(this, goalsData, data);
      }
      return goalsData;
    },
    error(err) {
      goalStore.setError(err);
      goalStore.setLoadingGoals(false);

      if (onError) {
        onError.call(this, err);
      }
    },
  };
}

/**
 * Create Apollo options for goalsByTag query
 */
export function createGoalsByTagApolloOptions(options = {}) {
  const {
    getTag,
    onUpdate,
    onError,
  } = options;

  return {
    query: GOALS_BY_TAG_QUERY,
    variables() {
      return {
        tag: typeof getTag === 'function' ? getTag.call(this) : this.tag,
      };
    },
    update(data) {
      const goalsData = data?.goalsByTag || [];
      const tag = typeof getTag === 'function' ? getTag.call(this) : this.tag;
      goalStore.setGoalsByTag(tag, goalsData);

      if (onUpdate) {
        return onUpdate.call(this, goalsData, data);
      }
      return goalsData;
    },
    error(err) {
      goalStore.setError(err);
      goalStore.setLoadingGoalsByTag(false);

      if (onError) {
        onError.call(this, err);
      }
    },
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  useGoalDatePeriod,
  useGoalsByTag,
  useGoalsByGoalRef,
  useAgendaGoals,
  useMonthTaskGoals,
};
