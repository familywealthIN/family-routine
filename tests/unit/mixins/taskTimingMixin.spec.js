import { taskTimingMixin } from '@/mixins/taskTimingMixin';
import { TASK_STATUS } from '@/utils/taskStatus';
import * as taskStatusModule from '@/utils/taskStatus';

describe('taskTimingMixin', () => {
  let vm;

  /**
   * Helper to create a fake component instance with the mixin's computed properties.
   * Uses `receiver` (the proxy itself) so chained computed calls (e.g.
   * tasksInTimeCount → taskTimingCounts) are intercepted correctly.
   */
  function createVm(overrides = {}) {
    const base = {
      dayGoalItemsForTiming: [],
      $currentTaskList: [],
      $currentTaskData: null,
      ...overrides,
    };

    return new Proxy(base, {
      get(target, prop, receiver) {
        if (taskTimingMixin.computed[prop]) {
          return taskTimingMixin.computed[prop].call(receiver);
        }
        return target[prop];
      },
    });
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exports tasksInTimeCount and tasksOutOfTimeCount computed properties', () => {
    expect(taskTimingMixin.computed.tasksInTimeCount).toBeDefined();
    expect(taskTimingMixin.computed.tasksOutOfTimeCount).toBeDefined();
    expect(taskTimingMixin.computed.taskTimingCounts).toBeDefined();
  });

  it('returns 0/0 when dayGoalItemsForTiming is empty', () => {
    vm = createVm();
    expect(vm.tasksInTimeCount).toBe(0);
    expect(vm.tasksOutOfTimeCount).toBe(0);
  });

  it('returns 0/0 when dayGoalItemsForTiming is null/undefined', () => {
    vm = createVm({ dayGoalItemsForTiming: null });
    expect(vm.tasksInTimeCount).toBe(0);
    expect(vm.tasksOutOfTimeCount).toBe(0);

    vm = createVm({ dayGoalItemsForTiming: undefined });
    expect(vm.tasksInTimeCount).toBe(0);
    expect(vm.tasksOutOfTimeCount).toBe(0);
  });

  it('returns 0/0 when $currentTaskList is null/undefined', () => {
    vm = createVm({
      $currentTaskList: null,
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: new Date().toISOString() },
      ],
    });
    expect(vm.tasksInTimeCount).toBe(0);
    expect(vm.tasksOutOfTimeCount).toBe(0);
  });

  it('skips items that are not complete', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus');
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: false, taskRef: 'task1', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
    });
    vm.taskTimingCounts; // trigger computed
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips items that have no taskRef', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus');
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: null, completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
    });
    vm.taskTimingCounts;
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips items that have no completedAt', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus');
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: null },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
    });
    vm.taskTimingCounts;
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips items whose taskRef does not exist in tasklist', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus');
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'nonexistent', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
    });
    vm.taskTimingCounts;
    expect(spy).not.toHaveBeenCalled();
  });

  it('counts DONE status as inTime', () => {
    jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.DONE);
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
      $currentTaskData: { id: 'task1', time: '08:00' },
    });
    expect(vm.tasksInTimeCount).toBe(1);
    expect(vm.tasksOutOfTimeCount).toBe(0);
  });

  it('counts MISSED status as outOfTime', () => {
    jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.MISSED);
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
      $currentTaskData: { id: 'task1', time: '08:00' },
    });
    expect(vm.tasksInTimeCount).toBe(0);
    expect(vm.tasksOutOfTimeCount).toBe(1);
  });

  it('excludes RESCHEDULED status from both counts', () => {
    jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.RESCHEDULED);
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
      $currentTaskData: { id: 'task1', time: '08:00' },
    });
    expect(vm.tasksInTimeCount).toBe(0);
    expect(vm.tasksOutOfTimeCount).toBe(0);
  });

  it('handles multiple items with mixed statuses', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus');
    spy
      .mockReturnValueOnce(TASK_STATUS.DONE)
      .mockReturnValueOnce(TASK_STATUS.MISSED)
      .mockReturnValueOnce(TASK_STATUS.DONE)
      .mockReturnValueOnce(TASK_STATUS.RESCHEDULED);

    const tasklist = [
      { id: 'task1', time: '08:00' },
      { id: 'task2', time: '10:00' },
      { id: 'task3', time: '12:00' },
      { id: 'task4', time: '14:00' },
    ];

    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: '2025-12-22T08:30:00Z' },
        { isComplete: true, taskRef: 'task2', completedAt: '2025-12-22T12:30:00Z' },
        { isComplete: true, taskRef: 'task3', completedAt: '2025-12-22T12:15:00Z' },
        { isComplete: true, taskRef: 'task4', completedAt: '2025-12-22T14:30:00Z' },
      ],
      $currentTaskList: tasklist,
      $currentTaskData: tasklist[0],
    });

    // Access taskTimingCounts directly to avoid double-computation through Proxy
    const counts = vm.taskTimingCounts;
    expect(counts.inTime).toBe(2);
    expect(counts.outOfTime).toBe(1);
  });

  it('matches taskRef via taskId field on tasklist items', () => {
    jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.DONE);
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'ref-abc', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'different-id', taskId: 'ref-abc', time: '09:00' }],
      $currentTaskData: { id: 'different-id', time: '09:00' },
    });
    expect(vm.tasksInTimeCount).toBe(1);
  });

  it('passes correct arguments to determineTaskStatus', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.DONE);
    const completedAt = '2025-12-22T10:00:00Z';
    const tasklist = [{ id: 'task1', time: '08:00' }];
    const currentTask = { id: 'task1', time: '08:00' };
    const goalItem = {
      isComplete: true,
      taskRef: 'task1',
      completedAt,
      originalDate: '2025-12-21',
    };

    vm = createVm({
      dayGoalItemsForTiming: [goalItem],
      $currentTaskList: tasklist,
      $currentTaskData: currentTask,
    });
    vm.taskTimingCounts;

    expect(spy).toHaveBeenCalledWith({
      taskItem: goalItem,
      currentTask,
      tasklist,
      isComplete: true,
      originalDate: '2025-12-21',
    });
  });

  it('uses null for originalDate when not present on goalItem', () => {
    const spy = jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.DONE);
    const goalItem = {
      isComplete: true,
      taskRef: 'task1',
      completedAt: new Date().toISOString(),
    };

    vm = createVm({
      dayGoalItemsForTiming: [goalItem],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
      $currentTaskData: null,
    });
    vm.taskTimingCounts;

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ originalDate: null }),
    );
  });

  it('handles $currentTaskData being null', () => {
    jest.spyOn(taskStatusModule, 'determineTaskStatus').mockReturnValue(TASK_STATUS.DONE);
    vm = createVm({
      dayGoalItemsForTiming: [
        { isComplete: true, taskRef: 'task1', completedAt: new Date().toISOString() },
      ],
      $currentTaskList: [{ id: 'task1', time: '08:00' }],
      $currentTaskData: null,
    });
    expect(vm.tasksInTimeCount).toBe(1);
    expect(vm.tasksOutOfTimeCount).toBe(0);
  });
});
