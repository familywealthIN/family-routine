/* eslint-env jest */
/**
 * Contract tests for GoalItemListContainer — the reference isolated container.
 *
 * Verifies it owns the goal-item write CRUD (delegating to $goals with the
 * container's dayDate) and re-emits presentation-only events unchanged, so the
 * organism stays pure and no page re-implements the mutations.
 *
 * Methods are exercised against a minimal vm-like context (no mount), matching
 * the AgendaTaskList.test.js convention.
 */
// The organism pulls the atoms barrel, which transitively imports third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the container's contract.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GoalItemListContainer.vue').default;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (goalsImpl = {}) => {
  const emitted = [];
  const notified = [];
  const goals = {
    completeGoalItem: jest.fn(() => Promise.resolve({})),
    deleteGoalItem: jest.fn(() => Promise.resolve({})),
    completeSubTaskItem: jest.fn(() => Promise.resolve({ ok: true })),
    ...goalsImpl,
  };
  return {
    date: '11-07-2026',
    $goals: goals,
    $notify: (n) => notified.push(n),
    $emit: (evt, payload) => emitted.push({ evt, payload }),
    // container's own methods must be callable via `this`
    notifyError: Container.methods.notifyError,
    emitted,
    notified,
    goals,
  };
};

describe('GoalItemListContainer', () => {
  describe('contract', () => {
    it('wraps exactly one organism (GoalItemList)', () => {
      expect(Object.keys(Container.components)).toEqual(['GoalItemList']);
    });
    it('exposes the owned write handlers', () => {
      ['onCompleteGoalItem', 'onDeleteTaskGoal', 'onCompleteSubTask'].forEach((m) => {
        expect(typeof Container.methods[m]).toBe('function');
      });
    });
  });

  describe('onCompleteGoalItem', () => {
    it('delegates to $goals.completeGoalItem with the container dayDate', async () => {
      const ctx = makeCtx();
      const onSuccess = jest.fn();
      Container.methods.onCompleteGoalItem.call(ctx, {
        id: 'g1', period: 'day', date: '11-07-2026', taskRef: 't1', isComplete: true, isMilestone: false, onSuccess,
      });
      await flush();

      expect(ctx.goals.completeGoalItem).toHaveBeenCalledWith({
        id: 'g1', period: 'day', date: '11-07-2026', taskRef: 't1', isComplete: true, isMilestone: false, dayDate: '11-07-2026',
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(ctx.emitted).toContainEqual({ evt: 'changed', payload: { op: 'complete', id: 'g1' } });
    });

    it('notifies on failure and does not throw', async () => {
      const ctx = makeCtx({ completeGoalItem: jest.fn(() => Promise.reject(new Error('x'))) });
      Container.methods.onCompleteGoalItem.call(ctx, { id: 'g1', isComplete: true });
      await flush();
      expect(ctx.notified.length).toBe(1);
      expect(ctx.notified[0].type).toBe('error');
    });
  });

  describe('onDeleteTaskGoal', () => {
    it('delegates to $goals.deleteGoalItem with dayDate and emits changed', async () => {
      const ctx = makeCtx();
      Container.methods.onDeleteTaskGoal.call(ctx, { id: 'g2', period: 'week', date: '15-07-2026' });
      await flush();
      expect(ctx.goals.deleteGoalItem).toHaveBeenCalledWith({
        id: 'g2', period: 'week', date: '15-07-2026', dayDate: '11-07-2026',
      });
      expect(ctx.emitted).toContainEqual({ evt: 'changed', payload: { op: 'delete', id: 'g2' } });
    });
  });

  describe('onCompleteSubTask', () => {
    it('delegates to $goals.completeSubTaskItem and passes the result to onSuccess', async () => {
      const ctx = makeCtx();
      const onSuccess = jest.fn();
      Container.methods.onCompleteSubTask.call(ctx, {
        id: 's1', taskId: 'g1', period: 'day', date: '11-07-2026', isComplete: true, onSuccess,
      });
      await flush();
      expect(ctx.goals.completeSubTaskItem).toHaveBeenCalledWith({
        id: 's1', taskId: 'g1', period: 'day', date: '11-07-2026', isComplete: true, dayDate: '11-07-2026',
      });
      expect(onSuccess).toHaveBeenCalledWith({ ok: true });
    });

    it('calls onError and notifies on failure', async () => {
      const ctx = makeCtx({ completeSubTaskItem: jest.fn(() => Promise.reject(new Error('x'))) });
      const onError = jest.fn();
      Container.methods.onCompleteSubTask.call(ctx, { id: 's1', taskId: 'g1', onError });
      await flush();
      expect(onError).toHaveBeenCalled();
      expect(ctx.notified[0].type).toBe('error');
    });
  });

  describe('presentation events bubble unchanged', () => {
    it('re-emits update-new-goal-item, toggle-goal-display-dialog, refresh-task-goal, subtask-updated', () => {
      const ctx = makeCtx();
      Container.methods.onUpdateNewGoalItem.call(ctx, { body: 'x' }, 'day', '11-07-2026');
      Container.methods.onToggleGoalDisplayDialog.call(ctx, { id: 'g1' }, true);
      Container.methods.onRefreshTaskGoal.call(ctx, 'ref1');
      Container.methods.onSubtaskUpdated.call(ctx, { subTaskId: 's1' });

      const names = ctx.emitted.map((e) => e.evt);
      expect(names).toEqual([
        'update-new-goal-item', 'toggle-goal-display-dialog', 'refresh-task-goal', 'subtask-updated',
      ]);
    });
  });
});
