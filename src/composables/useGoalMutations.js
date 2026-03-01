/**
 * useGoalMutations Composable
 *
 * Provides shared goal mutation functionality using Vue Composition API.
 * Centralizes mutations that were duplicated across multiple components:
 * - addGoalItem (5 occurrences)
 * - completeGoalItem (3 occurrences)
 * - deleteGoalItem (3 occurrences)
 * - completeSubTaskItem (2 occurrences)
 *
 * Relies on Apollo's cache-and-network fetch policy for automatic cache updates.
 *
 * Usage:
 *   import { useGoalMutations } from '@/composables/useGoalMutations';
 *
 *   // In setup() or component
 *   const { addGoalItem, isAddingGoal } = useGoalMutations(this.$apollo);
 */
import { ref, computed } from '@vue/composition-api';
import gql from 'graphql-tag';
import goalStore from '../store/goalStore';
import {
  addGoalItemToCache,
  updateGoalItemCompletionInCache,
  updateSubTaskCompletionInCache,
  deleteGoalItemFromCache,
  deleteSubTaskFromCache,
  findGoalRefFromCache,
  updateWeekGoalProgressInCache,
} from './useApolloCacheUpdates';

// ============================================================================
// MUTATION DEFINITIONS
// ============================================================================

/**
 * Add goal item mutation - full version with all fields
 */
export const ADD_GOAL_ITEM_MUTATION = gql`
  mutation addGoalItem(
    $body: String!
    $period: String!
    $date: String!
    $isComplete: Boolean
    $isMilestone: Boolean
    $deadline: String
    $contribution: String
    $reward: String
    $taskRef: String
    $goalRef: String
    $tags: [String]
    $originalDate: String
  ) {
    addGoalItem(
      body: $body
      period: $period
      date: $date
      isComplete: $isComplete
      isMilestone: $isMilestone
      deadline: $deadline
      contribution: $contribution
      reward: $reward
      taskRef: $taskRef
      goalRef: $goalRef
      tags: $tags
      originalDate: $originalDate
    ) {
      id
      body
      progress
      isComplete
      isMilestone
      contribution
      reward
      taskRef
      goalRef
      tags
      status
      completedAt
      createdAt
      originalDate
      subTasks {
        id
        body
        isComplete
      }
    }
  }
`;

/**
 * Complete goal item mutation
 */
export const COMPLETE_GOAL_ITEM_MUTATION = gql`
  mutation completeGoalItem(
    $id: ID!
    $taskRef: String!
    $date: String!
    $period: String!
    $isComplete: Boolean!
    $isMilestone: Boolean!
  ) {
    completeGoalItem(
      id: $id
      taskRef: $taskRef
      date: $date
      period: $period
      isComplete: $isComplete
      isMilestone: $isMilestone
    ) {
      id
      isComplete
      status
    }
  }
`;

/**
 * Delete goal item mutation
 */
export const DELETE_GOAL_ITEM_MUTATION = gql`
  mutation deleteGoalItem($id: ID!, $date: String!, $period: String!) {
    deleteGoalItem(id: $id, date: $date, period: $period) {
      id
    }
  }
`;

/**
 * Update goal item mutation
 */
export const UPDATE_GOAL_ITEM_MUTATION = gql`
  mutation updateGoalItem(
    $id: ID!
    $body: String!
    $period: String!
    $date: String!
    $isMilestone: Boolean!
    $deadline: String!
    $contribution: String!
    $reward: String!
    $taskRef: String!
    $goalRef: String!
    $tags: [String]
  ) {
    updateGoalItem(
      id: $id
      body: $body
      period: $period
      date: $date
      isMilestone: $isMilestone
      deadline: $deadline
      contribution: $contribution
      reward: $reward
      taskRef: $taskRef
      goalRef: $goalRef
      tags: $tags
    ) {
      id
      body
      contribution
      deadline
      reward
      tags
      isComplete
      isMilestone
      status
    }
  }
`;

/**
 * Update goal item contribution mutation (for auto-save)
 */
export const UPDATE_GOAL_ITEM_CONTRIBUTION_MUTATION = gql`
  mutation updateGoalItemContribution($id: ID!, $contribution: String!) {
    updateGoalItemContribution(id: $id, contribution: $contribution) {
      id
      contribution
    }
  }
`;

/**
 * Complete sub-task item mutation
 */
export const COMPLETE_SUB_TASK_ITEM_MUTATION = gql`
  mutation completeSubTaskItem(
    $id: ID!
    $taskId: ID!
    $date: String!
    $period: String!
    $isComplete: Boolean!
  ) {
    completeSubTaskItem(
      id: $id
      taskId: $taskId
      date: $date
      period: $period
      isComplete: $isComplete
    ) {
      id
      isComplete
    }
  }
`;

/**
 * Add sub-task item mutation
 */
export const ADD_SUB_TASK_ITEM_MUTATION = gql`
  mutation addSubTaskItem(
    $taskId: ID!
    $body: String!
    $period: String!
    $date: String!
    $isComplete: Boolean
  ) {
    addSubTaskItem(
      taskId: $taskId
      body: $body
      period: $period
      date: $date
      isComplete: $isComplete
    ) {
      id
      body
      isComplete
    }
  }
`;

/**
 * Delete sub-task item mutation
 */
export const DELETE_SUB_TASK_ITEM_MUTATION = gql`
  mutation deleteSubTaskItem(
    $id: ID!
    $taskId: ID!
    $date: String!
    $period: String!
  ) {
    deleteSubTaskItem(
      id: $id
      taskId: $taskId
      date: $date
      period: $period
    ) {
      id
    }
  }
`;

// ============================================================================
// COMPOSABLE
// ============================================================================

/**
 * Main composable for goal mutations
 *
 * @param {Object} apolloClient - Apollo client instance (from this.$apollo)
 * @param {Object} options - Configuration options
 * @param {boolean} options.useSharedStore - Whether to sync with shared store (default: true)
 * @param {Function} options.onError - Global error handler
 * @param {Function} options.onSuccess - Global success handler
 * @returns {Object} Composable state and methods
 */
export function useGoalMutations(apolloClient, options = {}) {
  const {
    useSharedStore = true,
    onError: globalOnError,
    onSuccess: globalOnSuccess,
  } = options;

  // Local state
  const localIsAddingGoal = ref(false);
  const localIsCompletingGoal = ref(false);
  const localIsDeletingGoal = ref(false);
  const localIsUpdatingGoal = ref(false);
  const localError = ref(null);

  // Computed properties
  const isAddingGoal = computed(() => (useSharedStore
    ? goalStore.isAddingGoal
    : localIsAddingGoal.value));

  const isCompletingGoal = computed(() => (useSharedStore
    ? goalStore.isCompletingGoal
    : localIsCompletingGoal.value));

  const isDeletingGoal = computed(() => (useSharedStore
    ? goalStore.isDeletingGoal
    : localIsDeletingGoal.value));

  const isUpdatingGoal = computed(() => localIsUpdatingGoal.value);

  const error = computed(() => (useSharedStore
    ? goalStore.mutationError
    : localError.value));

  const isMutating = computed(() => isAddingGoal.value
    || isCompletingGoal.value
    || isDeletingGoal.value
    || isUpdatingGoal.value);

  /**
   * Handle error
   */
  const handleError = (err, context) => {
    if (useSharedStore) {
      goalStore.setMutationError(err);
    } else {
      localError.value = err;
    }

    if (globalOnError) {
      globalOnError(err, context);
    }

    console.error(`Goal mutation error (${context}):`, err);
  };

  /**
   * Handle success
   */
  const handleSuccess = (result, context) => {
    if (useSharedStore) {
      goalStore.setMutationError(null);
    } else {
      localError.value = null;
    }

    if (globalOnSuccess) {
      globalOnSuccess(result, context);
    }
  };

  /**
   * Add a goal item
   *
   * @param {Object} goalItemData - Goal item data
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Created goal item
   */
  const addGoalItem = async (goalItemData, mutationOptions = {}) => {
    const {
      onSuccess,
      onError,
      refetchQueries = [],
    } = mutationOptions;

    if (useSharedStore) {
      goalStore.setAddingGoal(true);
    } else {
      localIsAddingGoal.value = true;
    }

    // Build optimistic response for instant UI update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticGoalItem = {
      __typename: 'GoalItem',
      id: tempId,
      body: goalItemData.body || '',
      progress: 0,
      isComplete: goalItemData.isComplete || false,
      isMilestone: goalItemData.isMilestone || false,
      contribution: goalItemData.contribution || '',
      reward: goalItemData.reward || '',
      taskRef: goalItemData.taskRef || null,
      goalRef: goalItemData.goalRef || null,
      tags: goalItemData.tags || [],
      status: 'todo',
      completedAt: null,
      createdAt: new Date().toISOString(),
      originalDate: goalItemData.originalDate || null,
      subTasks: [],
    };

    try {
      const { data } = await apolloClient.mutate({
        mutation: ADD_GOAL_ITEM_MUTATION,
        variables: goalItemData,
        refetchQueries,
        optimisticResponse: {
          __typename: 'Mutation',
          addGoalItem: optimisticGoalItem,
        },
        update: (cache, { data: mutationData }) => {
          if (mutationData && mutationData.addGoalItem) {
            addGoalItemToCache(cache, {
              goalItem: {
                ...goalItemData,
                ...mutationData.addGoalItem,
              },
              date: goalItemData.date,
              period: goalItemData.period,
              dayDate: goalItemData.dayDate,
            });
          }
        },
      });

      const result = data?.addGoalItem;
      handleSuccess(result, 'addGoalItem');

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleError(err, 'addGoalItem');

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setAddingGoal(false);
      } else {
        localIsAddingGoal.value = false;
      }
    }
  };

  /**
   * Complete/uncomplete a goal item
   *
   * @param {Object} params - Goal completion parameters
   * @param {string} params.id - Goal item ID
   * @param {string} params.taskRef - Task reference ID
   * @param {string} params.date - Date string
   * @param {string} params.period - Period (day, week, month, year)
   * @param {boolean} params.isComplete - Completion status
   * @param {boolean} params.isMilestone - Whether goal is a milestone
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Updated goal item
   */
  const completeGoalItem = async (params, mutationOptions = {}) => {
    console.log('[completeGoalItem] Called with params:', params);
    const {
      id, taskRef, date, period, isComplete, isMilestone,
    } = params;
    const { onSuccess, onError } = mutationOptions;

    if (useSharedStore) {
      goalStore.setCompletingGoal(true);
    } else {
      localIsCompletingGoal.value = true;
    }

    // --- Optimistic pre-mutation cache update (instant UI) ---
    const optimisticStatus = isComplete ? 'done' : 'todo';
    const optimisticCompletedAt = isComplete ? new Date().toISOString() : null;

    // 1. Immediately update the day goal item in cache
    updateGoalItemCompletionInCache(apolloClient, {
      id,
      isComplete,
      date,
      period,
      status: optimisticStatus,
      completedAt: optimisticCompletedAt,
      dayDate: params.dayDate,
    });

    // 2. Optimistically update linked week goal streak progress
    let goalRef = null;
    if (period === 'day') {
      goalRef = findGoalRefFromCache(apolloClient, id, params.dayDate || date);
      if (goalRef) {
        updateWeekGoalProgressInCache(apolloClient, {
          weekGoalItemId: goalRef,
          delta: isComplete ? 1 : -1,
          dayDate: params.dayDate,
        });
      }
    }

    try {
      const { data } = await apolloClient.mutate({
        mutation: COMPLETE_GOAL_ITEM_MUTATION,
        variables: {
          id, taskRef, date, period, isComplete, isMilestone,
        },
      });

      const result = data?.completeGoalItem;
      handleSuccess(result, 'completeGoalItem');

      // Server response validates optimistic update — reconcile if needed
      if (result && result.status !== optimisticStatus) {
        updateGoalItemCompletionInCache(apolloClient, {
          id,
          isComplete,
          date,
          period,
          progress: result.progress,
          status: result.status,
          completedAt: result.completedAt,
          dayDate: params.dayDate,
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      // --- Rollback optimistic updates on error ---
      updateGoalItemCompletionInCache(apolloClient, {
        id,
        isComplete: !isComplete,
        date,
        period,
        status: isComplete ? 'todo' : 'done',
        completedAt: isComplete ? null : new Date().toISOString(),
        dayDate: params.dayDate,
      });

      if (goalRef) {
        updateWeekGoalProgressInCache(apolloClient, {
          weekGoalItemId: goalRef,
          delta: isComplete ? -1 : 1,
          dayDate: params.dayDate,
        });
      }

      handleError(err, 'completeGoalItem');

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setCompletingGoal(false);
      } else {
        localIsCompletingGoal.value = false;
      }
    }
  };

  /**
   * Delete a goal item
   *
   * @param {Object} params - Delete parameters
   * @param {string} params.id - Goal item ID
   * @param {string} params.date - Date of the goal (DD-MM-YYYY format)
   * @param {string} params.period - Period of the goal (day, week, month, year)
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Deleted goal item reference
   */
  const deleteGoalItem = async ({
    id, date, period, dayDate,
  }, mutationOptions = {}) => {
    const { onSuccess, onError } = mutationOptions;

    // Validate required parameters
    if (!id || !date || !period) {
      const validationError = new Error(`Missing required parameters for deleteGoalItem: id=${id}, date=${date}, period=${period}`);
      console.error('[useGoalMutations] deleteGoalItem validation failed:', { id, date, period });
      handleError(validationError, 'deleteGoalItem');
      if (onError) {
        onError(validationError);
      }
      throw validationError;
    }

    if (useSharedStore) {
      goalStore.setDeletingGoal(true);
    } else {
      localIsDeletingGoal.value = true;
    }

    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_GOAL_ITEM_MUTATION,
        variables: { id, date, period },
        optimisticResponse: {
          __typename: 'Mutation',
          deleteGoalItem: {
            __typename: 'GoalItem',
            id,
          },
        },
        update: (cache) => {
          deleteGoalItemFromCache(cache, {
            id, date, period, dayDate,
          });
        },
      });

      const result = data?.deleteGoalItem;
      handleSuccess(result, 'deleteGoalItem');

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleError(err, 'deleteGoalItem');

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      if (useSharedStore) {
        goalStore.setDeletingGoal(false);
      } else {
        localIsDeletingGoal.value = false;
      }
    }
  };

  /**
   * Update a goal item
   *
   * @param {string|Object} idOrData - Goal item ID or object containing all fields including id
   * @param {Object} updates - Fields to update (optional if idOrData is an object)
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Updated goal item
   */
  const updateGoalItem = async (idOrData, updates, mutationOptions = {}) => {
    // Support both calling patterns:
    // 1. updateGoalItem(id, { field: value }, options)
    // 2. updateGoalItem({ id, field: value }, options)
    let id;
    let actualUpdates;
    let actualOptions = mutationOptions;

    if (typeof idOrData === 'object' && idOrData !== null) {
      // Called with single object: { id, ...fields }
      const { id: extractedId, ...restFields } = idOrData;
      id = extractedId;
      actualUpdates = restFields;
      actualOptions = updates || {}; // updates is actually options in this case
    } else {
      // Called with separate args: (id, updates, options)
      id = idOrData;
      actualUpdates = updates;
    }

    const { onSuccess, onError } = actualOptions;

    localIsUpdatingGoal.value = true;

    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_GOAL_ITEM_MUTATION,
        variables: { id, ...actualUpdates },
      });

      const result = data?.updateGoalItem;
      handleSuccess(result, 'updateGoalItem');

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleError(err, 'updateGoalItem');

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      localIsUpdatingGoal.value = false;
    }
  };

  /**
   * Update goal item contribution (auto-save friendly)
   *
   * @param {string} id - Goal item ID
   * @param {string} contribution - Contribution text
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Updated goal item
   */
  const updateContribution = async (id, contribution, mutationOptions = {}) => {
    const { onSuccess, onError } = mutationOptions;

    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_GOAL_ITEM_CONTRIBUTION_MUTATION,
        variables: { id, contribution },
      });

      const result = data?.updateGoalItemContribution;

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      if (onError) {
        onError(err);
      }

      throw err;
    }
  };

  /**
   * Complete/uncomplete a sub-task item
   *
   * @param {Object} params - Sub-task parameters
   * @param {string} params.id - Sub-task item ID
   * @param {string} params.taskId - Parent goal item ID
   * @param {string} params.date - Date string
   * @param {string} params.period - Period (day, week, month, year)
   * @param {boolean} params.isComplete - Completion status
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Updated sub-task item
   */
  const completeSubTaskItem = async (params, mutationOptions = {}) => {
    const {
      id, taskId, date, period, isComplete,
    } = params;
    const { onSuccess, onError } = mutationOptions;

    try {
      const { data } = await apolloClient.mutate({
        mutation: COMPLETE_SUB_TASK_ITEM_MUTATION,
        variables: {
          id, taskId, date, period, isComplete,
        },
      });

      const result = data?.completeSubTaskItem;

      // Update Apollo cache optimistically
      if (result) {
        updateSubTaskCompletionInCache(apolloClient, {
          goalItemId: taskId,
          subTaskId: id,
          isComplete,
          date,
          period,
          dayDate: params.dayDate,
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleError(err, 'completeSubTaskItem');

      if (onError) {
        onError(err);
      }

      throw err;
    }
  };

  /**
   * Add a sub-task item
   *
   * @param {Object} params - Sub-task parameters
   * @param {string} params.taskId - Parent goal item ID
   * @param {string} params.body - Sub-task body text
   * @param {string} params.period - Period (day, week, month, year)
   * @param {string} params.date - Date in DD-MM-YYYY format
   * @param {boolean} params.isComplete - Whether sub-task is complete
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Created sub-task item
   */
  const addSubTaskItem = async ({
    taskId, body, period, date, isComplete = false,
  }, mutationOptions = {}) => {
    const { onSuccess, onError } = mutationOptions;

    try {
      const { data } = await apolloClient.mutate({
        mutation: ADD_SUB_TASK_ITEM_MUTATION,
        variables: {
          taskId, body, period, date, isComplete,
        },
      });

      const result = data?.addSubTaskItem;

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleError(err, 'addSubTaskItem');

      if (onError) {
        onError(err);
      }

      throw err;
    }
  };

  /**
   * Delete a sub-task item
   *
   * @param {Object} params - Delete parameters
   * @param {string} params.id - Sub-task item ID
   * @param {string} params.taskId - Parent goal item ID
   * @param {string} params.date - Date in DD-MM-YYYY format
   * @param {string} params.period - Period (day, week, month, year)
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Deleted sub-task item reference
   */
  const deleteSubTaskItem = async ({
    id, taskId, date, period, dayDate,
  }, mutationOptions = {}) => {
    const { onSuccess, onError } = mutationOptions;

    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_SUB_TASK_ITEM_MUTATION,
        variables: {
          id, taskId, date, period,
        },
        optimisticResponse: {
          __typename: 'Mutation',
          deleteSubTaskItem: {
            __typename: 'SubTaskItem',
            id,
          },
        },
        update: (cache) => {
          deleteSubTaskFromCache(cache, {
            subTaskId: id, goalItemId: taskId, date, period, dayDate,
          });
        },
      });

      const result = data?.deleteSubTaskItem;

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleError(err, 'deleteSubTaskItem');

      if (onError) {
        onError(err);
      }

      throw err;
    }
  };

  /**
   * Clear mutation error
   */
  const clearError = () => {
    if (useSharedStore) {
      goalStore.setMutationError(null);
    } else {
      localError.value = null;
    }
  };

  return {
    // State
    isAddingGoal,
    isCompletingGoal,
    isDeletingGoal,
    isUpdatingGoal,
    isMutating,
    error,

    // Goal mutations
    addGoalItem,
    completeGoalItem,
    deleteGoalItem,
    updateGoalItem,
    updateContribution,

    // Sub-task mutations
    completeSubTaskItem,
    addSubTaskItem,
    deleteSubTaskItem,

    // Utilities
    clearError,

    // Direct store access
    store: useSharedStore ? goalStore : null,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default useGoalMutations;
