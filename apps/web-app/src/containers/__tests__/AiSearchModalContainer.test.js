/* eslint-env jest */
/**
 * AiSearchModalContainer — the add-task path from the global AI modal.
 *
 * Methods run against a stub context; the organism and the form containers are
 * not under test.
 */
jest.mock(
  '@routine-notes/ui/organisms/AiSearchModal/AiSearchModal.vue',
  () => ({ __esModule: true, default: { name: 'AiSearchModal', render() {} } }),
);
jest.mock('../AiTaskCreationFormContainer.vue', () => ({ __esModule: true, default: { render() {} } }));
jest.mock('../AiGoalPlanFormContainer.vue', () => ({ __esModule: true, default: { render() {} } }));

const Container = require('../AiSearchModalContainer.vue').default;

const ROUTINES = [
  { id: 'now', name: 'Wind-down', tags: ['area:mind'] },
  { id: 'rp', name: 'Review payment', tags: [] },
];

const makeCtx = (addGoalItem) => {
  const ctx = {
    routines: ROUTINES,
    $currentTaskData: { id: 'now' },
    $emit: jest.fn(),
    $notify: jest.fn(),
    $goals: { addGoalItem },
  };
  Object.keys(Container.methods).forEach((name) => {
    ctx[name] = Container.methods[name].bind(ctx);
  });
  return ctx;
};

const ITEM = {
  date: '03-10-2026', period: 'day', body: 'E2E-add item', taskRef: 'rp', tags: [],
};

describe('AiSearchModalContainer.handleDirectTaskCreate', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('confirms only after the save succeeds', async () => {
    let resolve;
    const ctx = makeCtx(jest.fn(() => new Promise((r) => { resolve = r; })));
    const done = ctx.handleDirectTaskCreate(ITEM);
    expect(ctx.$emit).toHaveBeenCalledWith('input', false);
    expect(ctx.$notify).not.toHaveBeenCalled();

    resolve({ id: 'g1', ...ITEM });
    await done;
    expect(ctx.$notify).toHaveBeenCalledTimes(1);
    expect(ctx.$notify.mock.calls[0][0]).toMatchObject({ title: 'Task Added', type: 'success' });
  });

  it('tells the user when the save fails instead of only logging it', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.reject(new Error('Failed to fetch'))));
    await ctx.handleDirectTaskCreate(ITEM);
    expect(ctx.$notify).toHaveBeenCalledTimes(1);
    expect(ctx.$notify.mock.calls[0][0]).toMatchObject({ title: 'Task not saved', type: 'error' });
  });
});
