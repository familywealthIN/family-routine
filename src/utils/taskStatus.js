import moment from 'moment';

export const TASK_STATUS = {
  TODO: 'todo',
  PROGRESS: 'progress',
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
    description: 'Task checked after current task in past',
  },
  [TASK_STATUS.RESCHEDULED]: {
    color: 'purple',
    icon: 'event',
    label: 'Rescheduled',
    description: 'Task date was changed',
  },
};

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

    const completedAt = moment(taskItem.completedAt);
    const taskFromTasklist = tasklist.find((t) => t.id === taskItem.taskRef);

    if (taskFromTasklist) {
      const taskTime = moment(taskFromTasklist.time, 'HH:mm');

      // Find the task's time window
      const taskIndex = tasklist.findIndex((t) => t.id === taskItem.taskRef);
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

  const createdAt = moment(taskItem.createdAt);
  const taskFromTasklist = tasklist.find((t) => t.id === taskItem.taskRef);

  if (!taskFromTasklist) {
    return TASK_STATUS.TODO;
  }

  // Find current task's time window
  const currentTaskIndex = tasklist.findIndex((t) => t.id === currentTask.id);
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

  // If task time has passed and it's incomplete
  if (currentTime.isAfter(taskTime)) {
    return TASK_STATUS.MISSED;
  }

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
