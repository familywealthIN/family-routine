import Vue from 'vue';

// Global event bus for application-wide communication
export default new Vue();

// Event constants
export const EVENTS = {
  REFETCH_DAILY_GOALS: 'refetch-daily-goals',
  TASK_CREATED: 'task-created',
  GOALS_SAVED: 'goals-saved',
  GOAL_UPDATED: 'goal-updated',
  GOAL_DELETED: 'goal-deleted',
  GOAL_ITEM_CREATED: 'goal-item-created',
};
