/**
 * Shared GraphQL Queries
 *
 * This file contains reusable GraphQL query definitions for consistent usage
 * across components. Import these queries instead of defining them inline.
 *
 * Usage:
 *   import { ROUTINE_DATE_QUERY, AGENDA_GOALS_QUERY } from '@/composables/graphql/queries';
 *
 *   apollo: {
 *     tasklist: {
 *       query: ROUTINE_DATE_QUERY,
 *       ...
 *     }
 *   }
 */
import gql from 'graphql-tag';

// ============================================================================
// ROUTINE QUERIES
// ============================================================================

/**
 * Get routine for a specific date - full version with all task fields
 * Used in: DashBoard.vue, AgendaTime.vue
 */
export const ROUTINE_DATE_QUERY = gql`
  query getRoutineDate($date: String!) {
    routineDate(date: $date) {
      id
      date
      skip
      tasklist {
        id
        name
        description
        time
        points
        ticked
        passed
        wait
        startEvent
        endEvent
        tags
        steps {
          name
        }
        stimuli {
          name
          splitRate
          earned
        }
      }
    }
  }
`;

/**
 * Get aggregated D/K/G stimulus totals for each day of the week
 * Used in: WeekdaySelectorContainer.vue
 */
export const WEEK_STIMULI_QUERY = gql`
  query weekStimuli($date: String!) {
    weekStimuli(date: $date) {
      date
      D
      K
      G
    }
  }
`;

// ============================================================================
// GOAL QUERIES
// ============================================================================

/**
 * Get agenda goals for a specific date - all periods (day, week, month, year, lifetime)
 * Used in: DashBoard.vue, AgendaTime.vue
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
        isMilestone
        taskRef
        goalRef
        status
        completedAt
        subTasks {
          id
          body
          isComplete
        }
      }
    }
  }
`;

/**
 * Get daily goals with full details (optimized: scoped fetch + parallel queries)
 * Used in: DashBoard.vue
 */
export const DAILY_GOALS_QUERY = gql`
  query optimizedDailyGoals($date: String!) {
    optimizedDailyGoals(date: $date) {
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
        isMilestone
        contribution
        reward
        tags
        status
        completedAt
        subTasks {
          id
          body
          isComplete
        }
      }
    }
  }
`;

/**
 * Get goals for a specific period and date - minimal version for dropdowns
 * Used in: GoalCreationContainer.vue, AiSearchModalContainer.vue
 */
export const GOAL_DATE_PERIOD_MINIMAL_QUERY = gql`
  query goalDatePeriod($period: String!, $date: String!) {
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
 * Get goals for a specific period and date - with task ref and completion
 * Used in: AiSearchModalContainer.vue
 */
export const GOAL_DATE_PERIOD_QUERY = gql`
  query goalDatePeriod($period: String!, $date: String!) {
    goalDatePeriod(period: $period, date: $date) {
      id
      date
      period
      goalItems {
        id
        body
        contribution
        taskRef
        tags
        isComplete
      }
    }
  }
`;

/**
 * Get goals by goal reference - for milestone relationships
 * Used in: AiSearchModalContainer.vue
 */
export const GOALS_BY_GOAL_REF_QUERY = gql`
  query goalsByGoalRef($goalRef: String!) {
    goalsByGoalRef(goalRef: $goalRef) {
      id
      date
      period
      goalItems {
        id
        body
        isComplete
        goalRef
        taskRef
        tags
        isMilestone
      }
    }
  }
`;

/**
 * Get optimized goals for calendar view
 * Used in: GoalsTime.vue
 */
export const GOALS_OPTIMIZED_QUERY = gql`
  query goalsOptimized($currentMonth: String) {
    goalsOptimized(currentMonth: $currentMonth) {
      id
      date
      period
      goalItems {
        id
        body
        progress
        isComplete
        isMilestone
        tags
        status
        completedAt
        taskRef
        goalRef
        subTasks {
          id
          body
          isComplete
        }
      }
    }
  }
`;

// ============================================================================
// USER/GROUP QUERIES
// ============================================================================

/**
 * Get users by group ID
 * Used in: FamilyRoutine.vue
 */
export const GET_USERS_BY_GROUP_ID_QUERY = gql`
  query getUsersByGroupId($groupId: String!) {
    getUsersByGroupId(groupId: $groupId) {
      email
      name
      picture
    }
  }
`;

/**
 * Get routines by group email
 * Used in: FamilyRoutine.vue
 */
export const ROUTINES_BY_GROUP_EMAIL_QUERY = gql`
  query routinesByGroupEmail($groupId: String!, $email: String!) {
    routinesByGroupEmail(groupId: $groupId, email: $email) {
      id
      date
      tasklist {
        id
        name
        time
        points
        ticked
        passed
        stimuli {
          name
          splitRate
          earned
        }
      }
    }
  }
`;

// ============================================================================
// PROGRESS QUERIES
// ============================================================================

/**
 * Get progress data
 * Used in: ProgressTime.vue
 */
export const GET_PROGRESS_QUERY = gql`
  query getProgress($period: String!, $startDate: String!, $endDate: String!) {
    getProgress(period: $period, startDate: $startDate, endDate: $endDate) {
      date
      period
      totalPoints
      earnedPoints
      completedTasks
      totalTasks
    }
  }
`;

// ============================================================================
// YEAR GOALS QUERIES
// ============================================================================

/**
 * Get current year goal by ID
 * Used in: YearGoalsTime.vue
 */
export const CURRENT_YEAR_GOAL_QUERY = gql`
  query currentYearGoal($id: ID!) {
    currentYearGoal(id: $id) {
      id
      body
      date
      period
      isComplete
      isMilestone
      goalRef
      taskRef
      tags
      status
      contribution
      milestones {
        id
        body
        date
        period
        isComplete
        status
      }
    }
  }
`;
