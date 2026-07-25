/* eslint-env jest */
/**
 * Contract test for QuickGoalCreationContainer.addGoalItem.
 *
 * Both quick-modal buttons route through addGoalItem:
 *   - "Start Task"  → addGoalItem(item)                    (explicitAgent: false)
 *   - "Start Agent" → addGoalItem(item, {explicitAgent:true})
 *
 * Regression: "Start Task" must NOT fire the agent's start event — only the
 * explicit "Start Agent" press does. (Previously addGoalItem fired
 * fireStartEventIfPresent whenever an agent was assigned, so Start Task also
 * kicked off the agent.)
 */

// Keep the require light + deterministic: stub the presentational organism and
// the date helpers so we exercise only addGoalItem's own logic.
jest.mock(
  '@routine-notes/ui/organisms/QuickGoalCreation/QuickGoalCreation.vue',
  () => ({ __esModule: true, default: { name: 'QuickGoalCreation', render() {} } }),
);
jest.mock('../../utils/getDates', () => ({
  periodGoalDates: (period, date) => date,
  stepupMilestonePeriodDate: (period, date) => ({ period, date }),
}));

const Container = require('../QuickGoalCreationContainer.vue').default;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (over = {}) => ({
  period: 'day',
  date: '24-07-2026',
  goals: [],
  tasklist: [{ id: 't1', name: 'Task 1' }],
  agentState: 'assigned',
  currentGoalRef: '',
  buttonLoading: false,
  loadingAction: '',
  addGoalItemWithTimeout: jest.fn(() => Promise.resolve({
    id: 'g-new', goalRef: 'ref1', taskRef: 't1', body: 'do it',
  })),
  getGoal: jest.fn(() => ({ goalItems: [] })),
  $emit: jest.fn(),
  $notify: jest.fn(),
  $agent: { fireStartEventIfPresent: jest.fn(() => Promise.resolve()) },
  ...over,
});

const payload = () => ({
  body: 'do it', taskRef: 't1', tags: [], goalRef: '',
});

describe('QuickGoalCreationContainer.addGoalItem', () => {
  it('Start Task (explicitAgent:false) creates the goal item but does NOT fire the agent start event', async () => {
    const ctx = makeCtx();
    await Container.methods.addGoalItem.call(ctx, payload(), { explicitAgent: false });
    await flush();

    expect(ctx.addGoalItemWithTimeout).toHaveBeenCalledTimes(1);
    // still starts the task (dashboard ticks it with fireAgent:false)
    expect(ctx.$emit).toHaveBeenCalledWith('start-quick-goal-task', expect.objectContaining({ id: 't1' }));
    // the bug: the start event must not fire on Start Task
    expect(ctx.$agent.fireStartEventIfPresent).not.toHaveBeenCalled();
  });

  it('Start Agent (explicitAgent:true) fires the agent start event with the fresh goal id', async () => {
    const ctx = makeCtx();
    await Container.methods.addGoalItem.call(ctx, payload(), { explicitAgent: true });
    await flush();

    expect(ctx.$agent.fireStartEventIfPresent).toHaveBeenCalledTimes(1);
    expect(ctx.$agent.fireStartEventIfPresent).toHaveBeenCalledWith(expect.objectContaining({
      taskRef: 't1', goalId: 'g-new', goalPeriod: 'day', implicit: false,
    }));
  });

  it('Start Task with no agent assigned also does not fire', async () => {
    const ctx = makeCtx({ agentState: 'none' });
    await Container.methods.addGoalItem.call(ctx, payload(), { explicitAgent: false });
    await flush();
    expect(ctx.$agent.fireStartEventIfPresent).not.toHaveBeenCalled();
  });
});
