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
import currentTaskStore from '../store/currentTask';
import { updateTaskStatusOnComplete } from '../utils/taskStatus';
import { pendingMutations } from '../utils/pendingMutations';
import { guardFields, releaseEntity } from '../utils/cacheGuard';
import {
  addGoalItemToCache,
  updateGoalItemCompletionInCache,
  deleteGoalItemFromCache,
  deleteSubTaskFromCache,
} from './useApolloCacheUpdates';
import { readEntity } from './useEntityCache';

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
      completedAt
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
 * Update goal item reward mutation. Used to persist an agent end-event's HTML
 * transcript onto the goal item so it survives an app close and can be
 * re-opened later; a non-empty reward also signals the end event completed.
 */
export const UPDATE_GOAL_ITEM_REWARD_MUTATION = gql`
  mutation updateGoalItemReward($id: ID!, $reward: String) {
    updateGoalItemReward(id: $id, reward: $reward) {
      id
      reward
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
      progress
      status
      completedAt
      subTasks {
        id
        body
        isComplete
      }
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
    const pendingKey = `goal:${id}`;

    // Per-item coalescing: if a mutation is already in flight for this
    // goal item, just record the latest desired state and return. The
    // in-flight mutation's resolver will dispatch a corrective mutation
    // if necessary. Prevents flicker on rapid clicks of the same item.
    if (pendingMutations.has(pendingKey)) {
      pendingMutations.setDesired(pendingKey, { ...params });
      console.log(`[completeGoalItem] coalesced — ${id} already in flight`);
      return null;
    }
    pendingMutations.add(pendingKey);

    if (useSharedStore) {
      goalStore.setCompletingGoal(true);
    } else {
      localIsCompletingGoal.value = true;
    }

    // Compute the optimistic status from task-timing context.
    let optimisticStatus = 'todo';
    let optimisticCompletedAt = null;
    if (isComplete) {
      const { currentTask } = currentTaskStore;
      const { tasklist } = currentTaskStore;
      if (currentTask && tasklist && tasklist.length && taskRef) {
        const r = updateTaskStatusOnComplete({
          taskItem: { taskRef }, currentTask, tasklist,
        });
        optimisticStatus = r.status;
        optimisticCompletedAt = r.completedAt.toISOString();
      } else {
        optimisticStatus = 'done';
        optimisticCompletedAt = new Date().toISOString();
      }
    }

    // The `update` callback runs both with the optimistic response AND
    // with the real server response — so the cache write is a single
    // source of truth that Apollo manages atomically. While the
    // optimistic mutation is in flight, no concurrent refetch can
    // overwrite this state.
    const applyToCache = (cache, result) => {
      try {
        updateGoalItemCompletionInCache(cache, {
          id,
          isComplete: result.isComplete,
          date,
          period,
          progress: result.progress,
          status: result.status,
          completedAt: result.completedAt,
          dayDate: params.dayDate,
        });
      } catch (e) {
        console.warn('[completeGoalItem] cache update failed:', e);
      }
    };

    // Week-goal streak progress is intentionally NOT updated optimistically.
    // The server's autoCheckTaskPeriod recomputes it from per-date dedup
    // rules that are hard to mirror on the client, so we wait for the
    // refetch triggered by the caller after the mutation resolves.

    // Claim these fields locally for the duration of the request. Apollo's
    // optimistic layer covers the in-flight window, but not the one after it:
    // a `cache-and-network` read issued before the tap can still land after the
    // mutation resolves and revert the checkbox. The guard makes that response
    // yield instead — which is why the checkbox no longer has to be disabled
    // while a query is loading. See utils/cacheGuard.js.
    //
    // `progress` needs an explicit claim because the mutation does not return
    // it (COMPLETE_GOAL_ITEM_MUTATION selects id/isComplete/status/completedAt
    // only, and the resolver has no progress to give — F4). The other three are
    // also confirmed automatically from the result by guardLink.
    guardFields('GoalItem', id, {
      isComplete,
      progress: isComplete ? 100 : 0,
      status: optimisticStatus,
      completedAt: optimisticCompletedAt,
    });

    try {
      const { data } = await apolloClient.mutate({
        mutation: COMPLETE_GOAL_ITEM_MUTATION,
        variables: {
          id, taskRef, date, period, isComplete, isMilestone,
        },
        optimisticResponse: {
          __typename: 'Mutation',
          completeGoalItem: {
            __typename: 'GoalItem',
            id,
            isComplete,
            status: optimisticStatus,
            completedAt: optimisticCompletedAt,
            progress: isComplete ? 100 : 0,
          },
        },
        update: (cache, { data: payload }) => {
          const result = payload && payload.completeGoalItem;
          if (result) applyToCache(cache, result);
        },
      });

      const result = data?.completeGoalItem;
      handleSuccess(result, 'completeGoalItem');

      // Coalesce: if the user clicked again while we were in flight,
      // dispatch one corrective mutation with the most recent intent.
      const desired = pendingMutations.getDesired(pendingKey);
      pendingMutations.remove(pendingKey);

      if (onSuccess) onSuccess(result);

      if (desired && desired.isComplete !== result.isComplete) {
        // Recurse with the latest desired state. This is the SOLE
        // corrective mutation regardless of how many times the user
        // tapped during the in-flight window.
        return completeGoalItem(desired, mutationOptions);
      }

      return result;
    } catch (err) {
      // Apollo automatically rolls back the optimisticResponse on error. Drop
      // the guard with it — otherwise it would keep pinning the rolled-back
      // value over incoming reads until its TTL expired.
      releaseEntity('GoalItem', id);
      pendingMutations.remove(pendingKey);
      handleError(err, 'completeGoalItem');
      if (onError) onError(err);
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
   * Persist the agent end-event HTML transcript onto a goal item's reward.
   *
   * @param {string} id - Goal item ID
   * @param {string} reward - HTML transcript (or '' to clear)
   * @param {Object} mutationOptions - Additional options
   * @returns {Promise<Object>} Updated goal item
   */
  const updateReward = async (id, reward, mutationOptions = {}) => {
    const { onSuccess, onError } = mutationOptions;

    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_GOAL_ITEM_REWARD_MUTATION,
        variables: { id, reward },
      });

      const result = data?.updateGoalItemReward;

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
  /**
   * Toggle a sub-task.
   *
   * NOTE the mutation returns the PARENT GoalItem (that is the server's type),
   * so the selection set asks for the parent's complete shape *including* its
   * subTasks list. Apollo then normalizes `GoalItem:<taskId>` and every
   * `SubTaskItem:<id>` in one write, and every query holding them re-renders —
   * no manual cache surgery, and no component has to patch anything locally.
   *
   * Previously the selection set was `{ id, isComplete }` — the PARENT's
   * completion — which callers then wrote onto the SUB-task, flipping it to
   * whatever the parent's state was.
   *
   * @param {Array} [params.subTasks] the parent's current subTasks, used to
   *   synthesise the optimistic response. Pass it and the checkbox flips
   *   instantly; omit it (or if the parent isn't cached yet) and the UI simply
   *   waits for the server.
   */
  const completeSubTaskItem = async (params, mutationOptions = {}) => {
    const {
      id, taskId, date, period, isComplete, subTasks,
    } = params;
    const { onSuccess, onError } = mutationOptions;

    // The mutation returns the PARENT GoalItem, so an optimistic response has
    // to supply every field in the selection set. The parent's own
    // completion/progress are server-derived (a subtask can auto-complete its
    // parent), so we must ECHO its current cached values rather than guess —
    // writing nulls here would visibly uncheck the parent goal item for the
    // duration of the request.
    const parent = readEntity(apolloClient, {
      typename: 'GoalItem',
      id: taskId,
      fieldNames: ['isComplete', 'progress', 'status', 'completedAt'],
    });

    const optimisticResponse = (Array.isArray(subTasks) && parent) ? {
      __typename: 'Mutation',
      completeSubTaskItem: {
        __typename: 'GoalItem',
        id: taskId,
        isComplete: parent.isComplete,
        progress: parent.progress,
        status: parent.status,
        completedAt: parent.completedAt,
        subTasks: subTasks.map((st) => ({
          __typename: 'SubTaskItem',
          id: st.id,
          body: st.body,
          isComplete: st.id === id ? isComplete : !!st.isComplete,
        })),
      },
    } : undefined;

    // Claim the toggled sub-task so an in-flight goals read can't revert it
    // after the mutation resolves (see completeGoalItem above). The parent's
    // own fields come back in the result, so guardLink confirms those for us.
    guardFields('SubTaskItem', id, { isComplete });

    try {
      const { data } = await apolloClient.mutate({
        mutation: COMPLETE_SUB_TASK_ITEM_MUTATION,
        variables: {
          id, taskId, date, period, isComplete,
        },
        ...(optimisticResponse ? { optimisticResponse } : {}),
      });

      const result = data?.completeSubTaskItem;

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      releaseEntity('SubTaskItem', id);
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
    updateReward,

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
