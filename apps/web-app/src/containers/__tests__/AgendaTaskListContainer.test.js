/* eslint-env jest */
/**
 * Contract tests for AgendaTaskListContainer.
 *
 * In "agenda" mode it OWNS the goal-item writes (plain $goals mutations for a
 * past day — no cross-domain fan-out) and emits `changed` for the page to
 * refetch its agendaGoals query. In "today" mode the writes are cross-domain,
 * so they bubble to the page unchanged. Also derives its grouped read.
 */
// Stub third-party .vue components the organism pulls in via the atoms barrel.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../AgendaTaskListContainer.vue').default;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeGoals = () => {
  const calls = [];
  return {
    calls,
    completeGoalItem: jest.fn((a) => { calls.push(['complete', a]); return Promise.resolve({}); }),
    deleteGoalItem: jest.fn((a) => { calls.push(['delete', a]); return Promise.resolve({}); }),
  };
};

describe('AgendaTaskListContainer', () => {
  describe('contract', () => {
    it('wraps AgendaTaskList and owns the write handlers', () => {
      expect(Object.keys(Container.components)).toEqual(['AgendaTaskList']);
      expect(typeof Container.methods.onComplete).toBe('function');
      expect(typeof Container.methods.onDelete).toBe('function');
    });
  });

  describe('agenda mode — owns the write', () => {
    const makeCtx = (goals) => {
      const emitted = [];
      const notified = [];
      return {
        mode: 'agenda',
        rd: { date: '12-07-2026' },
        $goals: goals,
        $emit: (evt) => emitted.push(evt),
        notifyError: (t) => notified.push(t),
        emitted,
        notified,
      };
    };

    it('completes via $goals with the container dayDate and emits changed', async () => {
      const goals = makeGoals();
      const ctx = makeCtx(goals);
      Container.methods.onComplete.call(ctx, {
        id: 'g1', period: 'day', date: '12-07-2026', taskRef: 't1', isComplete: true, isMilestone: false,
      });
      await flush();
      expect(goals.completeGoalItem).toHaveBeenCalledWith({
        id: 'g1', period: 'day', date: '12-07-2026', taskRef: 't1', isComplete: true, isMilestone: false, dayDate: '12-07-2026',
      });
      expect(ctx.emitted).toEqual(['changed']);
      // must NOT bubble the cross-domain event in agenda mode
      expect(ctx.emitted).not.toContain('complete-goal-item');
    });

    it('deletes via $goals and emits changed', async () => {
      const goals = makeGoals();
      const ctx = makeCtx(goals);
      Container.methods.onDelete.call(ctx, { id: 'g2', period: 'week', date: '15-07-2026' });
      await flush();
      expect(goals.deleteGoalItem).toHaveBeenCalledWith({
        id: 'g2', period: 'week', date: '15-07-2026', dayDate: '12-07-2026',
      });
      expect(ctx.emitted).toEqual(['changed']);
    });

    it('notifies on failure', async () => {
      const goals = { completeGoalItem: jest.fn(() => Promise.reject(new Error('x'))) };
      const ctx = makeCtx(goals);
      Container.methods.onComplete.call(ctx, { id: 'g1', isComplete: true });
      await flush();
      expect(ctx.notified.length).toBe(1);
    });
  });

  describe('today mode — forwards to the page (cross-domain)', () => {
    const makeCtx = () => {
      const emitted = [];
      return {
        mode: 'today',
        $goals: { completeGoalItem: jest.fn(), deleteGoalItem: jest.fn() },
        $emit: (evt, payload) => emitted.push({ evt, payload }),
        emitted,
      };
    };

    it('re-emits complete-goal-item and never touches $goals', () => {
      const ctx = makeCtx();
      Container.methods.onComplete.call(ctx, { id: 'x' });
      expect(ctx.$goals.completeGoalItem).not.toHaveBeenCalled();
      expect(ctx.emitted).toEqual([{ evt: 'complete-goal-item', payload: { id: 'x' } }]);
    });

    it('re-emits delete-goal-item', () => {
      const ctx = makeCtx();
      Container.methods.onDelete.call(ctx, { id: 'y' });
      expect(ctx.$goals.deleteGoalItem).not.toHaveBeenCalled();
      expect(ctx.emitted).toEqual([{ evt: 'delete-goal-item', payload: { id: 'y' } }]);
    });
  });

  describe('groups (read)', () => {
    it('groups goal items by task from the mode source', () => {
      const rd = {
        goals: [{ period: 'day', goalItems: [{ id: 'a', taskRef: 't1' }] }],
        agendaGoals: [{ period: 'day', goalItems: [{ id: 'b', taskRef: 't2' }] }],
        tasklist: [{ id: 't1', name: 'Task 1' }, { id: 't2', name: 'Task 2' }],
        filterTaskGoalsPeriod: (id, goals, p) => goals
          .filter((g) => g.period === p)
          .map((g) => ({ ...g, goalItems: g.goalItems.filter((gi) => gi.taskRef === id) }))
          .filter((g) => g.goalItems.length),
      };
      // agenda mode uses agendaGoals -> t2
      const agendaGroups = Container.computed.groups.call({ mode: 'agenda', rd, sourceGoals: rd.agendaGoals });
      expect(agendaGroups.map((g) => g.taskId)).toEqual(['t2']);
      // today mode uses goals -> t1
      const todayGroups = Container.computed.groups.call({ mode: 'today', rd, sourceGoals: rd.goals });
      expect(todayGroups.map((g) => g.taskId)).toEqual(['t1']);
    });
  });
});
