/**
 * Apollo Cache Update Utilities
 *
 * This module provides optimistic Apollo cache update functions for immediate UI updates
 * without waiting for GraphQL query refetches. All functions follow the same pattern:
 * 1. Read current cache state
 * 2. Modify data optimistically
 * 3. Write updated data back to cache
 * 4. Let background query refetch validate the changes
 *
 * Usage:
 *   import { updateGoalItemInCache, deleteGoalItemFromCache } from '@/composables/useApolloCacheUpdates';
 *
 *   // After mutation
 *   updateGoalItemInCache(apolloClient, { goalItemId, updates, date, period });
 *
 * Benefits:
 * - Instant UI updates
 * - Better UX (no loading states)
 * - Automatic rollback if mutation fails
 * - Consistent with Apollo best practices
 */

import moment from 'moment';
import {
  DAILY_GOALS_QUERY,
  AGENDA_GOALS_QUERY,
  ROUTINE_DATE_QUERY,
  WEEK_STIMULI_QUERY,
} from './graphql/queries';

/**
 * Deep clone cache data to avoid mutating Apollo's internal references.
 * Apollo Client 2.x readQuery returns direct references to normalized cache objects.
 * Mutating in-place then calling writeQuery with the same reference causes Apollo
 * to skip broadcastQueries (it sees identical data), so Vue Apollo smart queries
 * never get notified. Deep cloning ensures writeQuery receives new object references
 * that trigger proper query re-renders.
 */
function cloneDeep(data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Get today's date in DD-MM-YYYY format.
 *
 * The Dashboard queries DAILY_GOALS_QUERY and AGENDA_GOALS_QUERY with `this.date`
 * (defaults to today). The server resolvers internally convert this day date to
 * period-specific dates (week → Friday, month → last day, etc.) but Apollo caches
 * the result under the original day date.
 *
 * When we need to update the cache for non-day period goals, we must use the day
 * date (NOT the period-specific date) to match the cache key the Dashboard used.
 *
 * @returns {string} Today's date in DD-MM-YYYY format
 */
function getCurrentDayDate() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Get all cache targets that need updating for a given period.
 *
 * IMPORTANT: The `dailyGoals` and `agendaGoals` server resolvers return ALL periods
 * (day, week, month, year), not just day goals. Both are queried by the Dashboard
 * with a day date (e.g., today's date) — the server internally converts this to
 * period-specific dates. Apollo caches results under the day date used in the query.
 *
 * When updating non-day periods, we must:
 * 1. Update BOTH the AGENDA_GOALS_QUERY and DAILY_GOALS_QUERY caches
 * 2. Use the day date (NOT the period-specific date) for cache lookups, because
 *    that's the key under which the Dashboard stored the data
 *
 * The `useDayDate` flag indicates that the cache target should be looked up with
 * a day date rather than the period-specific date passed to the cache function.
 *
 * @param {string} period - Goal period (day, week, month, year, lifetime)
 * @returns {Array<{query: Object, goalsKey: string, useDayDate: boolean}>} Cache targets to update
 */
function getCacheTargets(period) {
  if (period === 'day') {
    return [{ query: DAILY_GOALS_QUERY, goalsKey: 'optimizedDailyGoals', useDayDate: false }];
  }
  // Non-day periods (week, month, year) should only update AGENDA_GOALS_QUERY
  // because DAILY_GOALS_QUERY already fetches them from the database via autoCheckTaskPeriod
  // Adding them to both caches causes duplicates
  return [
    { query: AGENDA_GOALS_QUERY, goalsKey: 'agendaGoals', useDayDate: true },
  ];
}

/**
 * Create a normalized goal item object for cache storage
 */
function createGoalItemObject(goalItem) {
  return {
    __typename: 'GoalItem',
    id: goalItem.id,
    body: goalItem.body,
    progress: goalItem.progress != null ? goalItem.progress : 0,
    isComplete: goalItem.isComplete != null ? goalItem.isComplete : false,
    taskRef: goalItem.taskRef || null,
    goalRef: goalItem.goalRef || null,
    isMilestone: goalItem.isMilestone != null ? goalItem.isMilestone : false,
    contribution: goalItem.contribution || '',
    reward: goalItem.reward || '',
    tags: goalItem.tags || [],
    status: goalItem.status || 'todo',
    completedAt: goalItem.completedAt || null,
    subTasks: (goalItem.subTasks || []).map((subTask) => ({
      __typename: 'SubTaskItem',
      id: subTask.id,
      body: subTask.body,
      isComplete: subTask.isComplete != null ? subTask.isComplete : false,
    })),
  };
}

/**
 * ============================================================================
 * GOAL CREATION - Add new goal/task to cache
 * ============================================================================
 */

/**
 * Add a new goal item to the Apollo cache optimistically
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {Object} params.goalItem - New goal item to add
 * @param {string} params.date - Date in DD-MM-YYYY format (period-specific date)
 * @param {string} params.period - Period (day, week, month, year, lifetime)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function addGoalItemToCache(apolloClient, {
  goalItem, date, period, dayDate,
}) {
  try {
    const cacheTargets = getCacheTargets(period);
    let updated = false;

    cacheTargets.forEach(({ query, goalsKey, useDayDate }) => {
      const queryDate = useDayDate ? (dayDate || getCurrentDayDate()) : date;
      try {
        // Read current cache (deep clone to avoid mutating Apollo's internal references)
        const cacheData = cloneDeep(apolloClient.readQuery({
          query,
          variables: { date: queryDate },
        }));

        if (!cacheData || !cacheData[goalsKey]) return;

        // Find or create the goal entry for this period
        const periodGoal = cacheData[goalsKey].find((g) => g.period === period && g.date === date);

        if (periodGoal) {
          periodGoal.goalItems.push(createGoalItemObject(goalItem));
        } else {
          cacheData[goalsKey].push({
            __typename: 'Goal',
            id: `temp-${Date.now()}-${period}`,
            period,
            date,
            goalItems: [createGoalItemObject(goalItem)],
          });
        }

        apolloClient.writeQuery({
          query,
          variables: { date: queryDate },
          data: cacheData,
        });
        updated = true;
      } catch (e) {
        // Cache may not exist for this query yet, skip
      }
    });

    console.log(`[addGoalItemToCache] Successfully added goal item to ${period} cache`);
    return updated;
  } catch (error) {
    console.error('[addGoalItemToCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Add multiple goal items to cache (for bulk creates like AI-generated timelines)
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {Array} params.goalItems - Array of goal items to add
 * @param {string} params.date - Date in DD-MM-YYYY format (period-specific date)
 * @param {string} params.period - Period (day, week, month, year, lifetime)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function addMultipleGoalItemsToCache(apolloClient, {
  goalItems, date, period, dayDate,
}) {
  try {
    const cacheTargets = getCacheTargets(period);
    let updated = false;
    const newGoalItems = goalItems.map(createGoalItemObject);

    cacheTargets.forEach(({ query, goalsKey, useDayDate }) => {
      const queryDate = useDayDate ? (dayDate || getCurrentDayDate()) : date;
      try {
        const cacheData = cloneDeep(apolloClient.readQuery({
          query,
          variables: { date: queryDate },
        }));

        if (!cacheData || !cacheData[goalsKey]) return;

        const periodGoal = cacheData[goalsKey].find((g) => g.period === period && g.date === date);

        if (periodGoal) {
          periodGoal.goalItems.push(...cloneDeep(newGoalItems));
        } else {
          cacheData[goalsKey].push({
            __typename: 'Goal',
            id: `temp-${Date.now()}-${period}`,
            period,
            date,
            goalItems: cloneDeep(newGoalItems),
          });
        }

        apolloClient.writeQuery({
          query,
          variables: { date: queryDate },
          data: cacheData,
        });
        updated = true;
      } catch (e) {
        // Cache may not exist for this query yet, skip
      }
    });

    console.log(`[addMultipleGoalItemsToCache] Successfully added ${goalItems.length} goal items to ${period} cache`);
    return updated;
  } catch (error) {
    console.error('[addMultipleGoalItemsToCache] Error updating cache:', error);
    return false;
  }
}

/**
 * ============================================================================
 * GOAL COMPLETION - Mark goal/task as complete
 * ============================================================================
 */

/**
 * Update goal item completion status in Apollo cache
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.id - Goal item ID
 * @param {boolean} params.isComplete - New completion status
 * @param {string} params.date - Date in DD-MM-YYYY format (period-specific date)
 * @param {string} params.period - Period (day, week, month, year, lifetime)
 * @param {number} params.progress - Progress value (optional)
 * @param {string} params.status - Status (todo, progress, done, missed, rescheduled)
 * @param {string} params.completedAt - Completion timestamp (optional)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function updateGoalItemCompletionInCache(apolloClient, {
  id, isComplete, date, period, progress, status, completedAt, dayDate,
}) {
  try {
    const cacheTargets = getCacheTargets(period);
    let updated = false;

    cacheTargets.forEach(({ query, goalsKey, useDayDate }) => {
      const queryDate = useDayDate ? (dayDate || getCurrentDayDate()) : date;
      try {
        const cacheData = cloneDeep(apolloClient.readQuery({
          query,
          variables: { date: queryDate },
        }));

        if (!cacheData || !cacheData[goalsKey]) return;

        const periodGoal = cacheData[goalsKey].find((g) => g.period === period);
        if (!periodGoal) return;

        const goalItem = periodGoal.goalItems.find((item) => item.id === id);
        if (!goalItem) return;

        goalItem.isComplete = isComplete;
        if (progress !== undefined) goalItem.progress = progress;
        if (status) goalItem.status = status;
        if (completedAt !== undefined) goalItem.completedAt = completedAt;

        apolloClient.writeQuery({
          query,
          variables: { date: queryDate },
          data: cacheData,
        });
        updated = true;
      } catch (e) {
        // Cache may not exist for this query yet, skip
      }
    });

    console.log(`[updateGoalItemCompletionInCache] Successfully updated goal item ${id} completion to ${isComplete}`);
    return updated;
  } catch (error) {
    console.error('[updateGoalItemCompletionInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Find the goalRef (week goal item ID) for a given day goal item from the cache.
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {string} goalItemId - The day goal item ID
 * @param {string} date - Date in DD-MM-YYYY format
 * @returns {string|null} The goalRef (week goal item ID) or null
 */
export function findGoalRefFromCache(apolloClient, goalItemId, date) {
  try {
    const cacheData = apolloClient.readQuery({
      query: DAILY_GOALS_QUERY,
      variables: { date },
    });

    if (!cacheData || !cacheData.optimizedDailyGoals) return null;

    for (const goal of cacheData.optimizedDailyGoals) {
      if (!goal.goalItems) continue;
      const item = goal.goalItems.find((gi) => gi.id === goalItemId);
      if (item && item.goalRef) {
        return item.goalRef;
      }
    }
    return null;
  } catch (error) {
    console.warn('[findGoalRefFromCache] Cache read failed:', error);
    return null;
  }
}

/**
 * Optimistically update a week goal item's progress in the Apollo cache.
 * Used before the completeGoalItem mutation fires so the streak UI updates instantly.
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.weekGoalItemId - The week goal item ID (goalRef from the day goal)
 * @param {number} params.delta - Progress change (+1 or -1)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function updateWeekGoalProgressInCache(apolloClient, {
  weekGoalItemId, delta, dayDate,
}) {
  try {
    const queryDate = dayDate || getCurrentDayDate();
    let updated = false;

    // Week goals are stored in AGENDA_GOALS_QUERY cache
    try {
      const cacheData = cloneDeep(apolloClient.readQuery({
        query: AGENDA_GOALS_QUERY,
        variables: { date: queryDate },
      }));

      if (cacheData && cacheData.agendaGoals) {
        const weekGoal = cacheData.agendaGoals.find((g) => g.period === 'week');
        if (weekGoal) {
          const goalItem = weekGoal.goalItems.find((item) => item.id === weekGoalItemId);
          if (goalItem) {
            const newProgress = Math.max(0, Math.min(5, (goalItem.progress || 0) + delta));
            goalItem.progress = newProgress;

            apolloClient.writeQuery({
              query: AGENDA_GOALS_QUERY,
              variables: { date: queryDate },
              data: cacheData,
            });
            updated = true;
          }
        }
      }
    } catch (e) {
      // Cache may not exist yet, skip
    }

    // Also update DAILY_GOALS_QUERY cache (it also contains week goals)
    try {
      const dailyCacheData = cloneDeep(apolloClient.readQuery({
        query: DAILY_GOALS_QUERY,
        variables: { date: queryDate },
      }));

      if (dailyCacheData && dailyCacheData.optimizedDailyGoals) {
        const weekGoal = dailyCacheData.optimizedDailyGoals.find((g) => g.period === 'week');
        if (weekGoal) {
          const goalItem = weekGoal.goalItems.find((item) => item.id === weekGoalItemId);
          if (goalItem) {
            const newProgress = Math.max(0, Math.min(5, (goalItem.progress || 0) + delta));
            goalItem.progress = newProgress;

            apolloClient.writeQuery({
              query: DAILY_GOALS_QUERY,
              variables: { date: queryDate },
              data: dailyCacheData,
            });
            updated = true;
          }
        }
      }
    } catch (e) {
      // Cache may not exist yet, skip
    }

    if (updated) {
      console.log(`[updateWeekGoalProgressInCache] Updated week goal ${weekGoalItemId} progress by ${delta}`);
    }
    return updated;
  } catch (error) {
    console.error('[updateWeekGoalProgressInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Update subtask completion status in Apollo cache
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.goalItemId - Parent goal item ID
 * @param {string} params.subTaskId - Subtask ID
 * @param {boolean} params.isComplete - New completion status
 * @param {string} params.date - Date in DD-MM-YYYY format (period-specific date)
 * @param {string} params.period - Period (day, week, month, year, lifetime)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function updateSubTaskCompletionInCache(apolloClient, {
  goalItemId, subTaskId, isComplete, date, period, dayDate,
}) {
  try {
    const cacheTargets = getCacheTargets(period);
    let updated = false;

    cacheTargets.forEach(({ query, goalsKey, useDayDate }) => {
      const queryDate = useDayDate ? (dayDate || getCurrentDayDate()) : date;
      try {
        const cacheData = cloneDeep(apolloClient.readQuery({
          query,
          variables: { date: queryDate },
        }));

        if (!cacheData || !cacheData[goalsKey]) return;

        const periodGoal = cacheData[goalsKey].find((g) => g.period === period);
        if (!periodGoal) return;

        const goalItem = periodGoal.goalItems.find((item) => item.id === goalItemId);
        if (!goalItem || !goalItem.subTasks) return;

        const subTask = goalItem.subTasks.find((st) => st.id === subTaskId);
        if (!subTask) return;

        subTask.isComplete = isComplete;

        // Recalculate parent goal progress based on completed subtasks
        const completedSubTasks = goalItem.subTasks.filter((st) => st.isComplete).length;
        const totalSubTasks = goalItem.subTasks.length;
        goalItem.progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;

        // Update parent completion status if all subtasks are complete
        if (completedSubTasks === totalSubTasks) {
          goalItem.isComplete = true;
          goalItem.status = 'done';
        } else if (completedSubTasks > 0) {
          goalItem.status = 'progress';
        }

        apolloClient.writeQuery({
          query,
          variables: { date: queryDate },
          data: cacheData,
        });
        updated = true;
      } catch (e) {
        // Cache may not exist for this query yet, skip
      }
    });

    console.log(`[updateSubTaskCompletionInCache] Successfully updated subtask ${subTaskId} completion`);
    return updated;
  } catch (error) {
    console.error('[updateSubTaskCompletionInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * ============================================================================
 * GOAL DELETION - Remove goal/task from cache
 * ============================================================================
 */

/**
 * Delete a goal item from Apollo cache
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.id - Goal item ID to delete
 * @param {string} params.date - Date in DD-MM-YYYY format (period-specific date)
 * @param {string} params.period - Period (day, week, month, year, lifetime)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function deleteGoalItemFromCache(apolloClient, {
  id, date, period, dayDate,
}) {
  try {
    const cacheTargets = getCacheTargets(period);
    let updated = false;

    cacheTargets.forEach(({ query, goalsKey, useDayDate }) => {
      const queryDate = useDayDate ? (dayDate || getCurrentDayDate()) : date;
      try {
        const cacheData = cloneDeep(apolloClient.readQuery({
          query,
          variables: { date: queryDate },
        }));

        if (!cacheData || !cacheData[goalsKey]) return;

        const periodGoal = cacheData[goalsKey].find((g) => g.period === period);
        if (!periodGoal) return;

        periodGoal.goalItems = periodGoal.goalItems.filter((item) => item.id !== id);

        apolloClient.writeQuery({
          query,
          variables: { date: queryDate },
          data: cacheData,
        });
        updated = true;
      } catch (e) {
        // Cache may not exist for this query yet, skip
      }
    });

    console.log(`[deleteGoalItemFromCache] Successfully deleted goal item ${id} from ${period} cache`);
    return updated;
  } catch (error) {
    console.error('[deleteGoalItemFromCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Delete a sub-task item from Apollo cache
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.subTaskId - Sub-task item ID to delete
 * @param {string} params.goalItemId - Parent goal item ID
 * @param {string} params.date - Date in DD-MM-YYYY format (period-specific date)
 * @param {string} params.period - Period (day, week, month, year, lifetime)
 * @param {string} [params.dayDate] - Day date for cache lookups (defaults to today)
 * @returns {boolean} Success status
 */
export function deleteSubTaskFromCache(apolloClient, {
  subTaskId, goalItemId, date, period, dayDate,
}) {
  try {
    const cacheTargets = getCacheTargets(period);
    let updated = false;

    cacheTargets.forEach(({ query, goalsKey, useDayDate }) => {
      const queryDate = useDayDate ? (dayDate || getCurrentDayDate()) : date;
      try {
        const cacheData = cloneDeep(apolloClient.readQuery({
          query,
          variables: { date: queryDate },
        }));

        if (!cacheData || !cacheData[goalsKey]) return;

        const periodGoal = cacheData[goalsKey].find((g) => g.period === period);
        if (!periodGoal) return;

        const goalItem = periodGoal.goalItems.find((item) => item.id === goalItemId);
        if (!goalItem || !goalItem.subTasks) return;

        goalItem.subTasks = goalItem.subTasks.filter((st) => st.id !== subTaskId);

        // Recalculate parent goal progress based on remaining subtasks
        const totalSubTasks = goalItem.subTasks.length;
        if (totalSubTasks > 0) {
          const completedSubTasks = goalItem.subTasks.filter((st) => st.isComplete).length;
          goalItem.progress = (completedSubTasks / totalSubTasks) * 100;
        } else {
          goalItem.progress = 0;
        }

        apolloClient.writeQuery({
          query,
          variables: { date: queryDate },
          data: cacheData,
        });
        updated = true;
      } catch (e) {
        // Cache may not exist for this query yet, skip
      }
    });

    console.log(`[deleteSubTaskFromCache] Successfully deleted sub-task ${subTaskId} from goal ${goalItemId}`);
    return updated;
  } catch (error) {
    console.error('[deleteSubTaskFromCache] Error updating cache:', error);
    return false;
  }
}

/**
 * ============================================================================
 * ROUTINE TASK UPDATES - Task ticking, metrics, streaks
 * ============================================================================
 */

/**
 * Update routine task status in Apollo cache (ticking, pass, wait states)
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.taskId - Routine task ID
 * @param {string} params.date - Date in DD-MM-YYYY format
 * @param {boolean} params.ticked - Ticked status (optional)
 * @param {boolean} params.passed - Passed status (optional)
 * @param {boolean} params.wait - Wait status (optional)
 * @returns {boolean} Success status
 */
export function updateRoutineTaskInCache(apolloClient, {
  taskId, date, ticked, passed, wait,
}) {
  try {
    // Read current cache (deep clone to avoid mutating Apollo's internal references)
    const cacheData = cloneDeep(apolloClient.readQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
    }));

    if (!cacheData || !cacheData.routineDate || !cacheData.routineDate.tasklist) {
      console.warn(`[updateRoutineTaskInCache] No cache data found for routine on ${date}`);
      return false;
    }

    // Find the task
    const task = cacheData.routineDate.tasklist.find((t) => t.id === taskId);

    if (!task) {
      console.warn(`[updateRoutineTaskInCache] Task ${taskId} not found`);
      return false;
    }

    // Update task properties
    if (ticked !== undefined) task.ticked = ticked;
    if (passed !== undefined) task.passed = passed;
    if (wait !== undefined) task.wait = wait;

    // Optimistically update D stimulus earned when ticking — mirrors server updateStimulusEarnedPoint('D')
    if (ticked === true && task.stimuli && Array.isArray(task.stimuli) && task.points) {
      const dStim = task.stimuli.find((s) => s.name === 'D');
      if (dStim && dStim.earned < task.points) {
        dStim.earned = task.points;
      }
    }

    // Write updated cache
    apolloClient.writeQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
      data: cacheData,
    });

    console.log(`[updateRoutineTaskInCache] Successfully updated task ${taskId}`);
    return true;
  } catch (error) {
    console.error('[updateRoutineTaskInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Optimistically update K stimulus earned when a goal item linked to a routine task is completed/uncompleted.
 * Mirrors server-side updateStimulusEarnedPoint('K', task).
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.taskId - Routine task ID (taskRef)
 * @param {string} params.date - Date in DD-MM-YYYY format
 * @param {boolean} params.isComplete - Whether the goal item is being completed (true) or uncompleted (false)
 * @returns {boolean} Success status
 */
export function updateRoutineTaskKEarnedInCache(apolloClient, { taskId, date, isComplete }) {
  try {
    const cacheData = cloneDeep(apolloClient.readQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
    }));

    if (!cacheData || !cacheData.routineDate || !cacheData.routineDate.tasklist) {
      return false;
    }

    const task = cacheData.routineDate.tasklist.find((t) => t.id === taskId);
    if (!task || !task.stimuli || !task.points) return false;

    const dStim = task.stimuli.find((s) => s.name === 'D');
    const kStim = task.stimuli.find((s) => s.name === 'K');
    if (!dStim || !kStim) return false;

    const count = Number((dStim.splitRate / kStim.splitRate).toFixed(0)) || 1;
    const kIncrement = task.points / count;

    if (isComplete) {
      kStim.earned = Math.min(task.points, kStim.earned + kIncrement);
    } else {
      kStim.earned = Math.max(0, kStim.earned - kIncrement);
    }

    apolloClient.writeQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
      data: cacheData,
    });

    return true;
  } catch (error) {
    console.error('[updateRoutineTaskKEarnedInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Optimistically bump (or debit) the day's K value in the cached
 * WEEK_STIMULI_QUERY result. Mirrors `updateRoutineTaskKEarnedInCache`
 * but at the weekly aggregate level, so the WeekdaySelector reflects a
 * just-ticked goal item before the server refetch returns.
 *
 * The K delta is recomputed from the same formula the server uses
 * (task.points / (D.splitRate / K.splitRate)).
 *
 * @param {Object} apolloClient Apollo client instance
 * @param {Object} params
 * @param {string} params.taskId  Routine task id the goal item is tied to
 * @param {string} params.date    Day date in DD-MM-YYYY (the item's date)
 * @param {boolean} params.isComplete Tick direction: true = earned, false = refunded
 * @returns {boolean} true when the cache was updated, false when it was
 *                    unavailable / stale and the caller should rely on refetch.
 */
export function updateWeekStimuliKInCache(apolloClient, { taskId, date, isComplete }) {
  try {
    // 1. Look up the routine task so we can compute the exact K delta
    //    the server will apply. We read from the routineDate cache for
    //    the same day — this is what the on-screen donut already uses.
    let routineCache;
    try {
      routineCache = apolloClient.readQuery({
        query: ROUTINE_DATE_QUERY,
        variables: { date },
      });
    } catch (_) {
      return false;
    }
    if (!routineCache || !routineCache.routineDate || !routineCache.routineDate.tasklist) {
      return false;
    }
    const task = routineCache.routineDate.tasklist.find((t) => t.id === taskId);
    if (!task || !task.stimuli || !task.points) return false;
    const dStim = task.stimuli.find((s) => s.name === 'D');
    const kStim = task.stimuli.find((s) => s.name === 'K');
    if (!dStim || !kStim) return false;
    const count = Number((dStim.splitRate / kStim.splitRate).toFixed(0)) || 1;
    const kIncrement = task.points / count;
    const delta = isComplete ? kIncrement : -kIncrement;

    // 2. The WEEK_STIMULI_QUERY is keyed by the week start. Same math the
    //    WeekdaySelectorContainer uses, so the cache lookup matches.
    const weekStart = moment(date, 'DD-MM-YYYY').startOf('week').format('DD-MM-YYYY');

    let weekCache;
    try {
      weekCache = cloneDeep(apolloClient.readQuery({
        query: WEEK_STIMULI_QUERY,
        variables: { date: weekStart },
      }));
    } catch (_) {
      // Not in cache yet (e.g. first paint); refetch will populate it.
      return false;
    }
    if (!weekCache || !Array.isArray(weekCache.weekStimuli)) return false;

    const dayEntry = weekCache.weekStimuli.find((d) => d.date === date);
    if (!dayEntry) return false;

    const nextK = Math.max(0, (Number(dayEntry.K) || 0) + delta);
    dayEntry.K = nextK;

    apolloClient.writeQuery({
      query: WEEK_STIMULI_QUERY,
      variables: { date: weekStart },
      data: weekCache,
    });

    return true;
  } catch (error) {
    console.error('[updateWeekStimuliKInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Update routine task metrics (stimuli earned points) in Apollo cache
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.taskId - Routine task ID
 * @param {string} params.date - Date in DD-MM-YYYY format
 * @param {Array} params.stimuli - Updated stimuli array with earned values
 * @returns {boolean} Success status
 */
export function updateRoutineTaskMetricsInCache(apolloClient, { taskId, date, stimuli }) {
  try {
    // Read current cache (deep clone to avoid mutating Apollo's internal references)
    const cacheData = cloneDeep(apolloClient.readQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
    }));

    if (!cacheData || !cacheData.routineDate || !cacheData.routineDate.tasklist) {
      console.warn(`[updateRoutineTaskMetricsInCache] No cache data found for routine on ${date}`);
      return false;
    }

    // Find the task
    const task = cacheData.routineDate.tasklist.find((t) => t.id === taskId);

    if (!task) {
      console.warn(`[updateRoutineTaskMetricsInCache] Task ${taskId} not found`);
      return false;
    }

    // Update stimuli with proper typename
    if (stimuli && Array.isArray(stimuli)) {
      task.stimuli = stimuli.map((stimulus) => ({
        __typename: 'Stimulus',
        name: stimulus.name,
        splitRate: stimulus.splitRate,
        earned: stimulus.earned,
      }));
    }

    // Write updated cache
    apolloClient.writeQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
      data: cacheData,
    });

    console.log(`[updateRoutineTaskMetricsInCache] Successfully updated metrics for task ${taskId}`);
    return true;
  } catch (error) {
    console.error('[updateRoutineTaskMetricsInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * Update all routine tasklist in cache (for bulk operations like skip day)
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} params - Update parameters
 * @param {string} params.date - Date in DD-MM-YYYY format
 * @param {Array} params.tasklist - Updated full tasklist array
 * @returns {boolean} Success status
 */
export function updateRoutineTasklistInCache(apolloClient, { date, tasklist }) {
  try {
    // Read current cache (deep clone to avoid mutating Apollo's internal references)
    const cacheData = cloneDeep(apolloClient.readQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
    }));

    if (!cacheData || !cacheData.routineDate) {
      console.warn(`[updateRoutineTasklistInCache] No cache data found for routine on ${date}`);
      return false;
    }

    // Update tasklist
    cacheData.routineDate.tasklist = tasklist;

    // Write updated cache
    apolloClient.writeQuery({
      query: ROUTINE_DATE_QUERY,
      variables: { date },
      data: cacheData,
    });

    console.log('[updateRoutineTasklistInCache] Successfully updated complete tasklist');
    return true;
  } catch (error) {
    console.error('[updateRoutineTasklistInCache] Error updating cache:', error);
    return false;
  }
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Check if cache data exists for a specific query
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} query - GraphQL query
 * @param {Object} variables - Query variables
 * @returns {boolean} True if cache exists
 */
export function cacheExists(apolloClient, query, variables) {
  try {
    const data = apolloClient.readQuery({ query, variables });
    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Safely read cache with fallback
 *
 * @param {Object} apolloClient - Apollo client instance
 * @param {Object} query - GraphQL query
 * @param {Object} variables - Query variables
 * @param {*} fallback - Fallback value if cache doesn't exist
 * @returns {*} Cache data or fallback
 */
export function readCacheSafely(apolloClient, query, variables, fallback = null) {
  try {
    return apolloClient.readQuery({ query, variables }) || fallback;
  } catch (error) {
    console.warn('[readCacheSafely] Cache read failed:', error);
    return fallback;
  }
}

/**
 * Export all cache update functions
 */
export default {
  // Goal creation
  addGoalItemToCache,
  addMultipleGoalItemsToCache,

  // Goal completion
  updateGoalItemCompletionInCache,
  updateSubTaskCompletionInCache,

  // Optimistic streak updates
  findGoalRefFromCache,
  updateWeekGoalProgressInCache,

  // Goal deletion
  deleteGoalItemFromCache,
  deleteSubTaskFromCache,

  // Routine tasks
  updateRoutineTaskInCache,
  updateRoutineTaskKEarnedInCache,
  updateWeekStimuliKInCache,
  updateRoutineTaskMetricsInCache,
  updateRoutineTasklistInCache,

  // Helpers
  cacheExists,
  readCacheSafely,
};
