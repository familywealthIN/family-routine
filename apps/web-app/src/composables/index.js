/**
 * Composables Index
 *
 * Central export point for all Vue composables.
 * Import from '@/composables' for cleaner imports.
 *
 * Usage:
 *   import {
 *     useRoutineQueries,
 *     useGoalDatePeriod,
 *     useGoalMutations
 *   } from '@/composables';
 */

// Routine Queries
export {
  default as useRoutineQueries,
  useRoutineQueries as useRoutineDate,
  ROUTINE_DATE_QUERY,
  ROUTINE_DATE_FULL_QUERY,
  ROUTINE_DATE_CORE_QUERY,
  ADD_ROUTINE_MUTATION,
  ROUTINE_QUERY_VARIANTS,
  createRoutineDateApolloOptions,
} from './useRoutineQueries';

// Goal Queries
export {
  default as useGoalQueries,
  useGoalDatePeriod,
  useGoalsByTag,
  useGoalsByGoalRef,
  useAgendaGoals,
  useMonthTaskGoals,
  GOAL_DATE_PERIOD_QUERY,
  GOAL_DATE_PERIOD_MINIMAL_QUERY,
  GOAL_DATE_PERIOD_FULL_QUERY,
  GOALS_BY_TAG_QUERY,
  GOALS_BY_GOAL_REF_QUERY,
  AGENDA_GOALS_QUERY,
  MONTH_TASK_GOALS_QUERY,
  GOAL_QUERY_VARIANTS,
  createGoalDatePeriodApolloOptions,
  createGoalsByTagApolloOptions,
} from './useGoalQueries';

// Goal Mutations
export {
  default as useGoalMutations,
  ADD_GOAL_ITEM_MUTATION,
  COMPLETE_GOAL_ITEM_MUTATION,
  DELETE_GOAL_ITEM_MUTATION,
  UPDATE_GOAL_ITEM_MUTATION,
  UPDATE_GOAL_ITEM_CONTRIBUTION_MUTATION,
  COMPLETE_SUB_TASK_ITEM_MUTATION,
  ADD_SUB_TASK_ITEM_MUTATION,
  DELETE_SUB_TASK_ITEM_MUTATION,
} from './useGoalMutations';

// Task Status (existing composable)
export { default as useTaskStatus } from './useTaskStatus';

// GraphQL Fragments
export {
  TASKLIST_CORE_FIELDS,
  TASKLIST_FULL_FIELDS,
  TASKLIST_STANDARD_FIELDS,
  GOAL_ITEM_CORE_FIELDS,
  GOAL_ITEM_STANDARD_FIELDS,
  GOAL_ITEM_FULL_FIELDS,
  ROUTINE_CORE_FIELDS,
  ROUTINE_STANDARD_FIELDS,
  GOAL_DATE_PERIOD_CORE_FIELDS,
  TASKLIST_CORE_FIELDS_STRING,
  TASKLIST_STANDARD_FIELDS_STRING,
  TASKLIST_FULL_FIELDS_STRING,
  GOAL_ITEM_CORE_FIELDS_STRING,
  GOAL_ITEM_STANDARD_FIELDS_STRING,
  GOAL_ITEM_FULL_FIELDS_STRING,
} from './graphql/fragments';
