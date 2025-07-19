import { TASK_STATUS } from '@/utils/taskStatus';

export default {};

export const defaultGoalItem = {
  body: '',
  deadline: '',
  contribution: '',
  reward: '',
  isComplete: false,
  isMilestone: false,
  taskRef: '',
  goalRef: '',
  tags: [],
  status: TASK_STATUS.TODO, // Default status
  createdAt: null, // Track when the task was created
  completedAt: null, // Track when the task was completed
  originalDate: null, // Track original date for rescheduled tasks
};

export const taskStatusTypes = {
  TODO: 'todo',
  PROGRESS: 'progress',
  DONE: 'done',
  MISSED: 'missed',
  RESCHEDULED: 'rescheduled',
};

export const taskStatusConfig = {
  todo: {
    color: 'blue',
    icon: 'schedule',
    label: 'To Do',
    description: 'Task created before current task',
  },
  progress: {
    color: 'orange',
    icon: 'play_arrow',
    label: 'In Progress',
    description: 'Task created during current task',
  },
  done: {
    color: 'green',
    icon: 'check_circle',
    label: 'Done',
    description: 'Task completed during current task',
  },
  missed: {
    color: 'red',
    icon: 'error',
    label: 'Missed',
    description: 'Task completed after its time slot',
  },
  rescheduled: {
    color: 'purple',
    icon: 'event',
    label: 'Rescheduled',
    description: 'Task date was changed',
  },
};

export const periodsArray = [
  {
    name: 'day',
    active: false,
  },
  {
    name: 'week',
    active: false,
  },
  {
    name: 'month',
    active: false,
  },
  {
    name: 'year',
    active: false,
  },
  {
    name: 'lifetime',
    active: false,
  },
];
