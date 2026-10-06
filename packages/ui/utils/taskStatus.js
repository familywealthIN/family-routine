import moment from 'moment';

/**
 * Parse a timestamp that may be an epoch-millisecond string, number, or ISO date.
 * @param {string|number} value - The raw timestamp value
 * @returns {moment.Moment} A valid moment instance
 */
function parseTimestamp(value) {
  if (!value) return moment.invalid();
  // If it's a numeric string (epoch ms), convert to number first
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return moment(parseInt(value, 10));
  }
  // If it's already a number, use directly
  if (typeof value === 'number') {
    return moment(value);
  }
  // Otherwise parse as date string
  return moment(value);
}

// Mirrors the status enum in apps/server/src/schema/GoalSchema.js — every value
// the server accepts has to be labellable here, or the badge falls through to a
// meaningless "Unknown". `ready` is written by markGoalItemReady when an item's
// agent start event fires.
export const TASK_STATUS = {
  TODO: 'todo',
  PROGRESS: 'progress',
  READY: 'ready',
  DONE: 'done',
  MISSED: 'missed',
  RESCHEDULED: 'rescheduled',
};

export const TASK_STATUS_CONFIG = {
  [TASK_STATUS.TODO]: {
    color: 'blue',
    icon: 'schedule',
    label: 'To Do',
    description: 'Task created before current task',
  },
  [TASK_STATUS.PROGRESS]: {
    color: 'orange',
    icon: 'play_arrow',
    label: 'In Progress',
    description: 'Task created during current task',
  },
  [TASK_STATUS.READY]: {
    color: 'teal',
    icon: 'hourglass_empty',
    label: 'Ready',
    description: 'Task is set up and waiting to be done',
  },
  [TASK_STATUS.DONE]: {
    color: 'green',
    icon: 'check_circle',
    label: 'Done',
    description: 'Task completed during current task',
  },
  [TASK_STATUS.MISSED]: {
    color: 'red',
    icon: 'cancel',
    label: 'Missed',
    // Both a late completion (graded server-side) and a miss the user recorded
    // on an item they never ticked land here.
    description: 'Task was not done within its scheduled time window',
  },
  [TASK_STATUS.RESCHEDULED]: {
    color: 'purple',
    icon: 'event',
    label: 'Rescheduled',
    description: 'Task date was changed',
  },
};

// Anything that has a label. Derived from the config so a new status only ever
// has to be added in one place.
const LABELLED_STATUSES = Object.keys(TASK_STATUS_CONFIG);

// The only stored statuses that a tick does not contradict: DONE is the
// completion itself, and RESCHEDULED describes the date rather than the work
// (which is also how determineTaskStatus ranks the two).
const COMPLETION_SAFE_STATUSES = [TASK_STATUS.DONE, TASK_STATUS.RESCHEDULED];

/**
 * Resolve the status a badge should show for a goal item.
 *
 * A stored status can outlive the truth — an item marked `missed` and ticked
 * afterwards keeps `missed` — and it can be one this build has no label for.
 * `isComplete` is the authoritative fact, so in both cases the badge is derived
 * from the flag rather than asserting the opposite of it. An item that is
 * genuinely still open keeps its stored status, so a real miss still reads as
 * missed.
 * @param {Object} options - Configuration object
 * @param {string} options.status - Stored status of the goal item
 * @param {boolean} options.isComplete - Whether the item is ticked
 * @returns {string} A status that always has a TASK_STATUS_CONFIG entry
 */
export function resolveDisplayStatus({ status, isComplete = false }) {
  if (isComplete) {
    return COMPLETION_SAFE_STATUSES.includes(status) ? status : TASK_STATUS.DONE;
  }

  return LABELLED_STATUSES.includes(status) ? status : TASK_STATUS.TODO;
}

/**
 * Determine the status of a task based on when it was created, completed, and current task context
 * @param {Object} options - Configuration object
 * @param {Object} options.taskItem - The task/goal item
 * @param {Object} options.currentTask - Current active task
 * @param {Array} options.tasklist - List of all tasks for the day
 * @param {boolean} options.isComplete - Whether the task is marked complete
 * @param {string} options.originalDate - Original date if task was rescheduled
 * @returns {string} Status string
 */
export function determineTaskStatus({
  taskItem,
  currentTask,
  tasklist = [],
  isComplete = false,
  originalDate = null,
}) {
  // If task was rescheduled (originalDate differs from current date)
  if (originalDate && originalDate !== taskItem.date) {
    return TASK_STATUS.RESCHEDULED;
  }

  // If task is completed
  if (isComplete) {
    if (!taskItem.completedAt || !currentTask) {
      return TASK_STATUS.DONE;
    }

    const completedAt = parseTimestamp(taskItem.completedAt);
    const taskFromTasklist = tasklist.find((t) => t.id === taskItem.taskRef || t.taskId === taskItem.taskRef);

    if (taskFromTasklist) {
      const taskTime = moment(taskFromTasklist.time, 'HH:mm');

      // Find the task's time window
      const taskIndex = tasklist.findIndex((t) => t.id === taskItem.taskRef || t.taskId === taskItem.taskRef);
      const nextTask = tasklist[taskIndex + 1];
      const nextTime = nextTask ? moment(nextTask.time, 'HH:mm') : moment('23:59', 'HH:mm');

      // Check if completed during the task's time window
      const completedDuringTask = completedAt.isBetween(taskTime, nextTime, null, '[]');

      if (completedDuringTask) {
        return TASK_STATUS.DONE;
      }
      if (completedAt.isAfter(nextTime)) {
        return TASK_STATUS.MISSED;
      }
    }

    return TASK_STATUS.DONE;
  }

  // For incomplete tasks, determine status based on creation time vs current task
  if (!currentTask || !taskItem.createdAt) {
    return TASK_STATUS.TODO;
  }

  const createdAt = parseTimestamp(taskItem.createdAt);
  const taskFromTasklist = tasklist.find((t) => t.id === taskItem.taskRef || t.taskId === taskItem.taskRef);

  if (!taskFromTasklist) {
    return TASK_STATUS.TODO;
  }

  // Find current task's time window
  const currentTaskIndex = tasklist.findIndex((t) => t.id === currentTask.id || t.taskId === currentTask.id);
  if (currentTaskIndex === -1) {
    return TASK_STATUS.TODO;
  }

  const currentTaskTime = moment(currentTask.time, 'HH:mm');
  const nextTask = tasklist[currentTaskIndex + 1];
  const nextTime = nextTask ? moment(nextTask.time, 'HH:mm') : moment('23:59', 'HH:mm');

  // Check if task was created during current task window
  const createdDuringCurrentTask = createdAt.isBetween(currentTaskTime, nextTime, null, '[]');

  if (createdDuringCurrentTask) {
    return TASK_STATUS.PROGRESS;
  }

  // Find the task's own time window
  const taskTime = moment(taskFromTasklist.time, 'HH:mm');
  const currentTime = moment();

  // If we're currently in this task's time window
  if (currentTime.isBetween(taskTime, nextTime, null, '[]')) {
    return TASK_STATUS.PROGRESS;
  }

  // An incomplete task whose window has passed is NOT "missed" — MISSED is
  // reserved for tasks that were actually completed but outside their
  // window. Incomplete+overdue items stay as TODO so the UI can style them
  // as pending work without conflating them with late-completions.
  return TASK_STATUS.TODO;
}

/**
 * Get initial status for a newly created task
 * @param {Object} options - Configuration object
 * @param {Object} options.currentTask - Current active task
 * @param {string} options.taskRef - Reference to the task this goal belongs to
 * @param {string} options.originalDate - Original date if rescheduled
 * @returns {string} Initial status
 */
export function getInitialTaskStatus({
  currentTask,
  taskRef,
  originalDate = null,
}) {
  // If task was rescheduled
  if (originalDate) {
    return TASK_STATUS.RESCHEDULED;
  }

  // If no current task context, default to todo
  if (!currentTask || !taskRef) {
    return TASK_STATUS.TODO;
  }

  // If the task being created is for the current task, mark as progress
  if (currentTask.id === taskRef) {
    return TASK_STATUS.PROGRESS;
  }

  if (currentTask.status) {
    // If current task has a status, use that to determine initial status
    return currentTask.status;
  }

  // Otherwise, it's a future task being planned, so todo
  return TASK_STATUS.TODO;
}

/**
 * Update task status when it's completed
 * @param {Object} options - Configuration object
 * @param {Object} options.taskItem - The task/goal item
 * @param {Object} options.currentTask - Current active task
 * @param {Array} options.tasklist - List of all tasks for the day
 * @returns {Object} Updated status and completedAt timestamp
 */
export function updateTaskStatusOnComplete({
  taskItem,
  currentTask,
  tasklist = [],
}) {
  const completedAt = new Date();

  const status = determineTaskStatus({
    taskItem: { ...taskItem, completedAt },
    currentTask,
    tasklist,
    isComplete: true,
  });

  return {
    status,
    completedAt,
  };
}
