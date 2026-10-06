/* eslint-env jest */
/**
 * D-08: a goal item could not be rescheduled or moved to another routine slot.
 * The edit dialog now hands the container the edited date / period / taskRef,
 * so the container has to forward them to the mutation unchanged — and the
 * mutation has to read the routine slot back, or the entity cache keeps
 * showing the item under its old task.
 *
 * Methods are exercised against a minimal vm-like context (no mount), matching
 * the GoalItemListContainer.test.js convention.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GoalCreationContainer.vue').default;
const { UPDATE_GOAL_ITEM_MUTATION } = require('../../composables/useGoalMutations');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (overrides = {}) => {
  const emitted = [];
  return {
    buttonLoading: false,
    savedPeriod: 'day',
    $goals: { updateGoalItem: jest.fn(() => Promise.resolve({ id: 'g1' })) },
    $notify: jest.fn(),
    $emit: (evt, payload) => emitted.push({ evt, payload }),
    emitted,
    ...overrides,
  };
};

describe('GoalCreationContainer rescheduling', () => {
  it('forwards the edited date, period and routine slot to the mutation', async () => {
    const ctx = makeCtx();
    const onSuccess = jest.fn();

    Container.methods.handleUpdateGoalItem.call(ctx, {
      id: 'g1',
      body: 'Active Recovery',
      period: 'day',
      date: '12-09-2026',
      taskRef: 'task-9',
    }, { onSuccess });
    await flush();

    expect(ctx.$goals.updateGoalItem).toHaveBeenCalledWith(expect.objectContaining({
      id: 'g1', period: 'day', date: '12-09-2026', taskRef: 'task-9',
    }));
    expect(onSuccess).toHaveBeenCalled();
    expect(ctx.emitted[0].evt).toBe('add-update-goal-entry');
    expect(ctx.emitted[0].payload).toMatchObject({ date: '12-09-2026', taskRef: 'task-9' });
  });

  it('refuses to save an item whose date was cleared by a period switch', async () => {
    const ctx = makeCtx();

    Container.methods.handleUpdateGoalItem.call(ctx, {
      id: 'g1', body: 'Active Recovery', period: 'week', date: '',
    });
    await flush();

    expect(ctx.$goals.updateGoalItem).not.toHaveBeenCalled();
    expect(ctx.$notify).toHaveBeenCalled();
  });

  it('reads the routine slot back so the moved item is not cached under its old task', () => {
    const [mutationDefinition] = UPDATE_GOAL_ITEM_MUTATION.definitions;
    const [field] = mutationDefinition.selectionSet.selections;
    const fields = field.selectionSet.selections.map((selection) => selection.name.value);

    expect(fields).toEqual(expect.arrayContaining(['id', 'taskRef', 'goalRef', 'originalDate']));
  });
});

// Switching the period tab to Lifetime does not clear the date, it stamps the
// '01-01-1970' stand-in for "no date" — which slipped past the !date guard and
// filed the item under no day, taking its milestone link out of the week.
describe('GoalCreationContainer period switches', () => {
  it('remembers the period an existing item was loaded under', () => {
    const ctx = {};
    Container.watch.newGoalItem.handler.call(ctx, { id: 'g1', period: 'day', date: '18-09-2026' });
    expect(ctx.savedPeriod).toBe('day');

    Container.watch.newGoalItem.handler.call(ctx, { period: 'day', date: '' });
    expect(ctx.savedPeriod).toBe(null);
  });

  it('refuses to save a dated item switched to Lifetime', async () => {
    const ctx = makeCtx();

    Container.methods.handleUpdateGoalItem.call(ctx, {
      id: 'g1', body: 'Active Recovery', period: 'lifetime', date: '01-01-1970', goalRef: 'week-goal-1',
    });
    await flush();

    expect(ctx.$goals.updateGoalItem).not.toHaveBeenCalled();
    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Lifetime goals have no date',
    }));
  });

  it('still saves an item that is already a lifetime one', async () => {
    const ctx = makeCtx({ savedPeriod: 'lifetime' });

    Container.methods.handleUpdateGoalItem.call(ctx, {
      id: 'g1', body: 'Know your life mission', period: 'lifetime', date: '01-01-1970',
    });
    await flush();

    expect(ctx.$goals.updateGoalItem).toHaveBeenCalled();
    expect(ctx.$notify).not.toHaveBeenCalled();
  });

  it('refuses a period switch that would unroot a milestone', async () => {
    const ctx = makeCtx();

    Container.methods.handleUpdateGoalItem.call(ctx, {
      id: 'g1', body: 'Active Recovery', period: 'week', date: '18-09-2026', goalRef: 'week-goal-1',
    });
    await flush();

    expect(ctx.$goals.updateGoalItem).not.toHaveBeenCalled();
    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Clear the goal task first',
    }));
  });

  it('keeps moving a milestone to another date in the same period', async () => {
    const ctx = makeCtx();

    Container.methods.handleUpdateGoalItem.call(ctx, {
      id: 'g1', body: 'Active Recovery', period: 'day', date: '19-09-2026', taskRef: 'task-9', goalRef: 'week-goal-1',
    });
    await flush();

    expect(ctx.$goals.updateGoalItem).toHaveBeenCalledWith(expect.objectContaining({
      date: '19-09-2026', taskRef: 'task-9', goalRef: 'week-goal-1',
    }));
    expect(ctx.$notify).not.toHaveBeenCalled();
  });
});
