/* eslint-env jest */
/**
 * D-07: the dialog's only off-ramps were completing an item or deleting it.
 * The container now forwards a recorded miss to markGoalItemMissed, and has to
 * tell the dialog when that failed so its optimistic chip can go back.
 *
 * Methods are exercised against a minimal vm-like context (no mount), matching
 * the GoalCreationContainer.test.js convention.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GoalCreationContainer.vue').default;
const { MARK_GOAL_ITEM_MISSED_MUTATION } = require('../../composables/useGoalMutations');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (mutate = jest.fn(() => Promise.resolve({ data: {} }))) => ({
  $apollo: { mutate },
  $notify: jest.fn(),
});

describe('GoalCreationContainer mark missed', () => {
  it('sends the miss for the item the dialog named', async () => {
    const ctx = makeCtx();

    Container.methods.handleMarkGoalItemMissed.call(ctx, { id: 'g1', isMissed: true });
    await flush();

    expect(ctx.$apollo.mutate).toHaveBeenCalledWith({
      mutation: MARK_GOAL_ITEM_MISSED_MUTATION,
      variables: { id: 'g1', isMissed: true },
    });
  });

  it('does not call the mutation without an item to record the miss against', async () => {
    const ctx = makeCtx();

    Container.methods.handleMarkGoalItemMissed.call(ctx, { id: '', isMissed: true });
    await flush();

    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('hands the failure back so the dialog can undo its optimistic chip', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.reject(new Error('offline'))));
    const onError = jest.fn();

    Container.methods.handleMarkGoalItemMissed.call(ctx, { id: 'g1', isMissed: true }, { onError });
    await flush();

    expect(onError).toHaveBeenCalled();
    expect(ctx.$notify).toHaveBeenCalled();
  });

  it('reads the status back so the cached entity learns the miss', () => {
    const [mutationDefinition] = MARK_GOAL_ITEM_MISSED_MUTATION.definitions;
    const [field] = mutationDefinition.selectionSet.selections;
    const fields = field.selectionSet.selections.map((selection) => selection.name.value);

    expect(fields).toEqual(expect.arrayContaining(['id', 'status']));
  });
});
