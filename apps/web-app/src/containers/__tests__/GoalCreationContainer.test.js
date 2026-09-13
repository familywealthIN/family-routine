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

const makeCtx = () => {
  const emitted = [];
  return {
    buttonLoading: false,
    $goals: { updateGoalItem: jest.fn(() => Promise.resolve({ id: 'g1' })) },
    $notify: jest.fn(),
    $emit: (evt, payload) => emitted.push({ evt, payload }),
    emitted,
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
