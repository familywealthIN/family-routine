import { determineTaskStatus, TASK_STATUS } from '@/utils/taskStatus';

/**
 * Mixin that provides tasksInTimeCount and tasksOutOfTimeCount computed properties.
 *
 * The consuming component must provide:
 *   - this.dayGoalItemsForTiming: Array of completed day goal items with taskRef & completedAt
 *     (filtered from the agendaGoals or dailyGoals Apollo query)
 *
 * The mixin reads the routine tasklist from:
 *   - this.$currentTaskList (global plugin) — available in all components
 *   - this.$currentTaskData (global plugin) — current active task
 */
export const taskTimingMixin = {
  computed: {
    /**
     * Count of goal items completed within their linked routine task's time window
     */
    tasksInTimeCount() {
      return this.taskTimingCounts.inTime;
    },
    /**
     * Count of goal items completed outside their linked routine task's time window
     */
    tasksOutOfTimeCount() {
      return this.taskTimingCounts.outOfTime;
    },
    /**
     * Internal computed that calculates both counts in one pass
     */
    taskTimingCounts() {
      const goalItems = this.dayGoalItemsForTiming || [];
      const tasklist = this.$currentTaskList || [];
      const currentTask = this.$currentTaskData || null;

      let inTime = 0;
      let outOfTime = 0;

      goalItems.forEach((goalItem) => {
        // Only count completed items that have a taskRef and completedAt
        if (!goalItem.isComplete || !goalItem.taskRef || !goalItem.completedAt) {
          return;
        }

        // Check if the linked routine task exists in today's tasklist
        const taskExists = tasklist.find(
          (t) => t.id === goalItem.taskRef || t.taskId === goalItem.taskRef,
        );
        if (!taskExists) {
          return;
        }

        const status = determineTaskStatus({
          taskItem: goalItem,
          currentTask,
          tasklist,
          isComplete: true,
          originalDate: goalItem.originalDate || null,
        });

        if (status === TASK_STATUS.DONE) {
          inTime += 1;
        } else if (status === TASK_STATUS.MISSED) {
          outOfTime += 1;
        }
        // RESCHEDULED tasks are excluded from the count
      });

      return { inTime, outOfTime };
    },
  },
};

export default taskTimingMixin;
