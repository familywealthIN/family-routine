import {
  TASK_STATUS,
  TASK_STATUS_CONFIG,
  determineTaskStatus,
  getInitialTaskStatus,
  updateTaskStatusOnComplete,
} from '@/utils/taskStatus';
import taskStatusMixin from '@/composables/useTaskStatus';
import moment from 'moment';

// Fix system time so moment(time, 'HH:mm') creates dates on a known day
const MOCK_DATE = new Date('2025-12-22T10:30:00');

describe('useTaskStatus (taskStatusMixin)', () => {
  let vm;

  function createVm(overrides = {}) {
    return {
      $currentTaskData: null,
      $currentTaskList: [],
      ...overrides,
      // Bind mixin data
      ...taskStatusMixin.data(),
      // Bind mixin methods so they have correct `this`
    };
  }

  function bindMethods(context) {
    const bound = {};
    Object.keys(taskStatusMixin.methods).forEach((name) => {
      bound[name] = taskStatusMixin.methods[name].bind(context);
    });
    return bound;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);
    vm = createVm();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('data', () => {
    it('exposes TASK_STATUS constants', () => {
      expect(vm.TASK_STATUS).toBe(TASK_STATUS);
    });

    it('exposes TASK_STATUS_CONFIG', () => {
      expect(vm.TASK_STATUS_CONFIG).toBe(TASK_STATUS_CONFIG);
    });
  });

  describe('TASK_STATUS constants', () => {
    it('has all expected status values', () => {
      expect(TASK_STATUS.TODO).toBe('todo');
      expect(TASK_STATUS.PROGRESS).toBe('progress');
      expect(TASK_STATUS.DONE).toBe('done');
      expect(TASK_STATUS.MISSED).toBe('missed');
      expect(TASK_STATUS.RESCHEDULED).toBe('rescheduled');
    });
  });

  describe('TASK_STATUS_CONFIG', () => {
    it('has config for every status', () => {
      Object.values(TASK_STATUS).forEach((status) => {
        const config = TASK_STATUS_CONFIG[status];
        expect(config).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.description).toBeDefined();
      });
    });
  });

  describe('calculateTaskStatus', () => {
    it('calls determineTaskStatus with correct args', () => {
      const taskItem = { id: '1', taskRef: 'task1' };
      const currentTask = { id: 'task1', time: '08:00' };
      const tasklist = [{ id: 'task1', time: '08:00' }];

      vm = createVm({ $currentTaskData: currentTask, $currentTaskList: tasklist });
      const methods = bindMethods(vm);

      const result = methods.calculateTaskStatus(taskItem, false, null);
      expect(typeof result).toBe('string');
      expect(Object.values(TASK_STATUS)).toContain(result);
    });

    it('defaults isComplete to false and originalDate to null', () => {
      const taskItem = { id: '1' };
      vm = createVm();
      const methods = bindMethods(vm);
      const result = methods.calculateTaskStatus(taskItem);
      expect(result).toBe(TASK_STATUS.TODO);
    });

    it('returns RESCHEDULED when originalDate differs from task date', () => {
      const taskItem = { id: '1', date: '2025-12-22' };
      vm = createVm();
      const methods = bindMethods(vm);
      const result = methods.calculateTaskStatus(taskItem, false, '2025-12-21');
      expect(result).toBe(TASK_STATUS.RESCHEDULED);
    });

    it('falls back to empty array when $currentTaskList is null', () => {
      const taskItem = { id: '1' };
      vm = createVm({ $currentTaskList: null });
      const methods = bindMethods(vm);
      const result = methods.calculateTaskStatus(taskItem);
      expect(result).toBe(TASK_STATUS.TODO);
    });
  });

  describe('getNewTaskStatus', () => {
    it('returns TODO when no current task', () => {
      vm = createVm({ $currentTaskData: null });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus('task1')).toBe(TASK_STATUS.TODO);
    });

    it('returns PROGRESS when taskRef matches current task id', () => {
      vm = createVm({ $currentTaskData: { id: 'task1' } });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus('task1')).toBe(TASK_STATUS.PROGRESS);
    });

    it('returns RESCHEDULED when originalDate is provided', () => {
      vm = createVm({ $currentTaskData: { id: 'task1' } });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus('task1', '2025-12-21')).toBe(TASK_STATUS.RESCHEDULED);
    });

    it('returns TODO when no taskRef', () => {
      vm = createVm({ $currentTaskData: { id: 'task1' } });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus(null)).toBe(TASK_STATUS.TODO);
    });

    it('uses provided task parameter instead of $currentTaskData', () => {
      vm = createVm({ $currentTaskData: { id: 'task1' } });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus('custom-task', null, { id: 'custom-task' })).toBe(TASK_STATUS.PROGRESS);
    });

    it('returns current task status when taskRef does not match and status exists', () => {
      vm = createVm({ $currentTaskData: { id: 'task1', status: 'done' } });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus('task2')).toBe('done');
    });

    it('returns TODO when taskRef does not match and no status on currentTask', () => {
      vm = createVm({ $currentTaskData: { id: 'task1' } });
      const methods = bindMethods(vm);
      expect(methods.getNewTaskStatus('task2')).toBe(TASK_STATUS.TODO);
    });
  });

  describe('updateStatusOnComplete', () => {
    it('returns status and completedAt', () => {
      const taskItem = { id: '1', taskRef: 'task1' };
      vm = createVm({
        $currentTaskData: { id: 'task1', time: '08:00' },
        $currentTaskList: [{ id: 'task1', time: '08:00' }],
      });
      const methods = bindMethods(vm);
      const result = methods.updateStatusOnComplete(taskItem);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('completedAt');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('falls back to empty array when $currentTaskList is null', () => {
      const taskItem = { id: '1', taskRef: 'task1' };
      vm = createVm({ $currentTaskList: null });
      const methods = bindMethods(vm);
      const result = methods.updateStatusOnComplete(taskItem);

      expect(result).toHaveProperty('status');
      expect(result.status).toBe(TASK_STATUS.DONE);
    });
  });

  describe('getStatusConfig', () => {
    it('returns config for valid status', () => {
      vm = createVm();
      const methods = bindMethods(vm);

      Object.values(TASK_STATUS).forEach((status) => {
        const config = methods.getStatusConfig(status);
        expect(config).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.icon).toBeDefined();
      });
    });

    it('returns TODO config for unknown status', () => {
      vm = createVm();
      const methods = bindMethods(vm);
      const config = methods.getStatusConfig('unknown-status');
      expect(config).toBe(TASK_STATUS_CONFIG[TASK_STATUS.TODO]);
    });
  });

  describe('shouldShowStatus', () => {
    it('returns true for day period', () => {
      vm = createVm();
      const methods = bindMethods(vm);
      expect(methods.shouldShowStatus('day')).toBe(true);
    });

    it('returns false for non-day periods', () => {
      vm = createVm();
      const methods = bindMethods(vm);
      expect(methods.shouldShowStatus('week')).toBe(false);
      expect(methods.shouldShowStatus('month')).toBe(false);
      expect(methods.shouldShowStatus('year')).toBe(false);
      expect(methods.shouldShowStatus('lifetime')).toBe(false);
    });
  });
});

describe('determineTaskStatus (direct)', () => {
  const baseTasklist = [
    { id: 'task1', time: '08:00' },
    { id: 'task2', time: '10:00' },
    { id: 'task3', time: '12:00' },
  ];

  it('returns DONE when isComplete and no completedAt', () => {
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1' },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.DONE);
  });

  it('returns DONE when isComplete and no currentTask', () => {
    const completedAt = moment('09:00', 'HH:mm').toISOString();
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1', completedAt },
      currentTask: null,
      tasklist: baseTasklist,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.DONE);
  });

  it('returns DONE when completed during task window', () => {
    // 09:00 is between task1 (08:00) and task2 (10:00)
    const completedAt = moment('09:00', 'HH:mm').toISOString();
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1', completedAt },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.DONE);
  });

  it('returns MISSED when completed after task window', () => {
    // Use moment to construct a time today at 11:00, which is after task1's window (08:00-10:00)
    const completedAfterWindow = moment('11:00', 'HH:mm').toISOString();
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1', completedAt: completedAfterWindow },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.MISSED);
  });

  it('returns DONE when task is last in list and completed before 23:59', () => {
    const completedAt = moment('22:00', 'HH:mm').toISOString();
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task3', completedAt },
      currentTask: baseTasklist[2],
      tasklist: baseTasklist,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.DONE);
  });

  it('returns RESCHEDULED when originalDate differs from task date', () => {
    const result = determineTaskStatus({
      taskItem: { date: '2025-12-22', taskRef: 'task1' },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: false,
      originalDate: '2025-12-21',
    });
    expect(result).toBe(TASK_STATUS.RESCHEDULED);
  });

  it('returns TODO when not complete and no currentTask', () => {
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1' },
      currentTask: null,
      tasklist: baseTasklist,
      isComplete: false,
    });
    expect(result).toBe(TASK_STATUS.TODO);
  });

  it('returns TODO when not complete and no createdAt', () => {
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1' },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: false,
    });
    expect(result).toBe(TASK_STATUS.TODO);
  });

  it('returns TODO when taskRef not found in tasklist for incomplete task', () => {
    const result = determineTaskStatus({
      taskItem: { taskRef: 'nonexistent', createdAt: '2025-12-22T08:30:00Z' },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: false,
    });
    expect(result).toBe(TASK_STATUS.TODO);
  });

  it('returns TODO when currentTask not found in tasklist', () => {
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1', createdAt: '2025-12-22T08:30:00Z' },
      currentTask: { id: 'nonexistent', time: '08:00' },
      tasklist: baseTasklist,
      isComplete: false,
    });
    expect(result).toBe(TASK_STATUS.TODO);
  });

  it('returns DONE for completed task whose taskRef is not in tasklist', () => {
    const completedAt = moment('09:00', 'HH:mm').toISOString();
    const result = determineTaskStatus({
      taskItem: { taskRef: 'nonexistent', completedAt },
      currentTask: baseTasklist[0],
      tasklist: baseTasklist,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.DONE);
  });

  it('matches via taskId field on tasklist items', () => {
    const completedAt = moment('09:00', 'HH:mm').toISOString();
    const tasklistWithTaskId = [
      { id: 'x', taskId: 'task1', time: '08:00' },
      { id: 'y', taskId: 'task2', time: '10:00' },
    ];
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1', completedAt },
      currentTask: tasklistWithTaskId[0],
      tasklist: tasklistWithTaskId,
      isComplete: true,
    });
    expect(result).toBe(TASK_STATUS.DONE);
  });

  it('defaults tasklist to empty array', () => {
    const result = determineTaskStatus({
      taskItem: { taskRef: 'task1' },
      currentTask: null,
      isComplete: false,
    });
    expect(result).toBe(TASK_STATUS.TODO);
  });
});

describe('getInitialTaskStatus', () => {
  it('returns RESCHEDULED when originalDate provided', () => {
    expect(getInitialTaskStatus({ currentTask: { id: 't1' }, taskRef: 't1', originalDate: '2025-12-21' }))
      .toBe(TASK_STATUS.RESCHEDULED);
  });

  it('returns TODO when no currentTask', () => {
    expect(getInitialTaskStatus({ currentTask: null, taskRef: 't1' }))
      .toBe(TASK_STATUS.TODO);
  });

  it('returns TODO when no taskRef', () => {
    expect(getInitialTaskStatus({ currentTask: { id: 't1' }, taskRef: null }))
      .toBe(TASK_STATUS.TODO);
  });

  it('returns PROGRESS when taskRef matches currentTask id', () => {
    expect(getInitialTaskStatus({ currentTask: { id: 't1' }, taskRef: 't1' }))
      .toBe(TASK_STATUS.PROGRESS);
  });

  it('returns currentTask.status when it exists and taskRef does not match', () => {
    expect(getInitialTaskStatus({ currentTask: { id: 't1', status: 'done' }, taskRef: 't2' }))
      .toBe('done');
  });

  it('returns TODO when taskRef does not match and no status', () => {
    expect(getInitialTaskStatus({ currentTask: { id: 't1' }, taskRef: 't2' }))
      .toBe(TASK_STATUS.TODO);
  });
});

describe('updateTaskStatusOnComplete', () => {
  it('returns an object with status and completedAt', () => {
    const result = updateTaskStatusOnComplete({
      taskItem: { taskRef: 'task1' },
      currentTask: { id: 'task1', time: '08:00' },
      tasklist: [{ id: 'task1', time: '08:00' }],
    });
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('completedAt');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(Object.values(TASK_STATUS)).toContain(result.status);
  });

  it('defaults tasklist to empty array', () => {
    const result = updateTaskStatusOnComplete({
      taskItem: { taskRef: 'task1' },
      currentTask: null,
    });
    expect(result.status).toBe(TASK_STATUS.DONE);
  });
});
