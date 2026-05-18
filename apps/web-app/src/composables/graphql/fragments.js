/**
 * Shared GraphQL Fragments
 *
 * This file contains reusable GraphQL fragments for consistent field selection
 * across queries and mutations throughout the application.
 */
import gql from 'graphql-tag';

// ============================================================================
// TASKLIST FRAGMENTS
// ============================================================================

/**
 * Core tasklist fields - minimal fields needed for most list displays
 */
export const TASKLIST_CORE_FIELDS = gql`
  fragment TasklistCoreFields on Task {
    id
    name
    time
    points
    ticked
    passed
    wait
  }
`;

/**
 * Full tasklist fields - all fields including description, events, and stimuli
 */
export const TASKLIST_FULL_FIELDS = gql`
  fragment TasklistFullFields on Task {
    id
    name
    description
    time
    points
    ticked
    passed
    wait
    tags
    steps
    stimuli
    startEvent
    endEvent
  }
`;

/**
 * Standard tasklist fields - commonly used subset with description and tags
 */
export const TASKLIST_STANDARD_FIELDS = gql`
  fragment TasklistStandardFields on Task {
    id
    name
    description
    time
    points
    ticked
    passed
    wait
    tags
  }
`;

// ============================================================================
// GOAL ITEM FRAGMENTS
// ============================================================================

/**
 * Core goal item fields - minimal fields for list displays
 */
export const GOAL_ITEM_CORE_FIELDS = gql`
  fragment GoalItemCoreFields on GoalItem {
    id
    body
    isComplete
  }
`;

/**
 * Standard goal item fields - commonly used in most goal displays
 */
export const GOAL_ITEM_STANDARD_FIELDS = gql`
  fragment GoalItemStandardFields on GoalItem {
    id
    body
    progress
    isComplete
    taskRef
    goalRef
    tags
    isMilestone
  }
`;

/**
 * Full goal item fields - all available fields
 */
export const GOAL_ITEM_FULL_FIELDS = gql`
  fragment GoalItemFullFields on GoalItem {
    id
    body
    progress
    isComplete
    taskRef
    goalRef
    tags
    isMilestone
    deadline
    contribution
    reward
    status
    originalDate
    createdAt
  }
`;

// ============================================================================
// ROUTINE FRAGMENTS
// ============================================================================

/**
 * Core routine fields - minimal routine data
 */
export const ROUTINE_CORE_FIELDS = gql`
  fragment RoutineCoreFields on Routine {
    id
    date
  }
`;

/**
 * Standard routine fields - commonly used routine data
 */
export const ROUTINE_STANDARD_FIELDS = gql`
  fragment RoutineStandardFields on Routine {
    id
    date
    skip
  }
`;

// ============================================================================
// GOAL DATE PERIOD FRAGMENTS
// ============================================================================

/**
 * Goal date period core fields
 */
export const GOAL_DATE_PERIOD_CORE_FIELDS = gql`
  fragment GoalDatePeriodCoreFields on Goal {
    id
    date
    period
  }
`;

// ============================================================================
// INLINE FRAGMENT STRINGS (for dynamic query construction)
// ============================================================================

export const TASKLIST_CORE_FIELDS_STRING = `
  id
  name
  time
  points
  ticked
  passed
  wait
`;

export const TASKLIST_STANDARD_FIELDS_STRING = `
  id
  name
  description
  time
  points
  ticked
  passed
  wait
  tags
`;

export const TASKLIST_FULL_FIELDS_STRING = `
  id
  name
  description
  time
  points
  ticked
  passed
  wait
  tags
  steps
  stimuli
  startEvent
  endEvent
`;

export const GOAL_ITEM_CORE_FIELDS_STRING = `
  id
  body
  isComplete
`;

export const GOAL_ITEM_STANDARD_FIELDS_STRING = `
  id
  body
  progress
  isComplete
  taskRef
  goalRef
  tags
  isMilestone
  status
  createdAt
  completedAt
`;

export const GOAL_ITEM_FULL_FIELDS_STRING = `
  id
  body
  progress
  isComplete
  taskRef
  goalRef
  tags
  isMilestone
  deadline
  contribution
  reward
  status
  originalDate
  createdAt
`;
