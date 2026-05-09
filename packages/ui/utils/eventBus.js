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
  TIME_FORMAT_CHANGED: 'time-format-changed', // Added for time format preference changes
  OPEN_AI_SEARCH: 'open-ai-search',
  DASHBOARD_CACHING_STATUS: 'dashboard-caching-status', // Emitted during dashboard cache population
  ROUTINE_TICKED: 'routine-ticked', // Emitted after a routine task is ticked to trigger weekStimuli refetch
  DASHBOARD_REFRESH: 'dashboard-refresh', // Emitted when the refresh button is clicked
};
