/* eslint-env jest */
/**
 * InboxSheetContainer — getting a task out of the Inbox.
 *
 * What is pinned:
 *
 *   1. **An Inbox item is one with no `taskRef`.** That absence is the only thing
 *      that puts it there, so a quick-add must send an empty taskRef and no
 *      goalRef.
 *   2. **Landing on a routine inherits that routine's `goalRef`.** Otherwise the
 *      item shows up on the checklist and rolls up into nothing — the same rule
 *      the chat follows when it creates an item.
 *   3. **`updateGoalItem` is a full replace**, so the move carries the item's
 *      current body, contribution and tags with it.
 */
jest.mock(
  '@routine-notes/ui/organisms/InboxSheet/InboxSheet.vue',
  () => ({ __esModule: true, default: { name: 'InboxSheet', render() {} } }),
);
jest.mock('../../utils/cacheGuard', () => ({
  guardFields: jest.fn(),
  releaseEntity: jest.fn(),
}));

const Container = require('../InboxSheetContainer.vue').default;
const { guardFields, releaseEntity } = require('../../utils/cacheGuard');

const ITEM = {
  id: 'i1',
  body: 'Renew passport',
  contribution: 'Expires in March.',
  reward: '',
  deadline: '',
  isMilestone: false,
  taskRef: '',
  goalRef: '',
  tags: ['area:life'],
};

const ctx = (over = {}) => ({
  date: '12-09-2026',
  period: 'day',
  currentRoutine: {
    id: 'sw', name: 'Start Work', time: '09:00', goalRef: 'wg_sw',
  },
  routines: [
    {
      id: 'mp', name: 'Morning Pages', time: '06:30', goalRef: 'wg_mp',
    },
    {
      id: 'sw', name: 'Start Work', time: '09:00', goalRef: 'wg_sw',
    },
  ],
  $apollo: { mutate: jest.fn(() => Promise.resolve({ data: {} })) },
  $goals: {
    addGoalItem: jest.fn(() => Promise.resolve({ id: 'new' })),
    deleteGoalItem: jest.fn(() => Promise.resolve({})),
  },
  $notify: jest.fn(),
  $emit: jest.fn(),
  notifyError: Container.methods.notifyError,
  assign: Container.methods.assign,
  ...over,
});

const call = (name, vm, ...args) => Container.methods[name].call(vm, ...args);
const varsOf = (vm) => vm.$apollo.mutate.mock.calls[0][0].variables;

beforeEach(() => jest.clearAllMocks());

describe('InboxSheetContainer — quick add', () => {
  it('creates a day item with no routine and no parent goal', () => {
    const vm = ctx();
    call('onAdd', vm, 'Buy a gift');
    expect(vm.$goals.addGoalItem).toHaveBeenCalledWith({
      body: 'Buy a gift',
      period: 'day',
      date: '12-09-2026',
      dayDate: '12-09-2026',
      isComplete: false,
      isMilestone: false,
      taskRef: '',
      tags: [],
    });
  });
});

describe('InboxSheetContainer — Do now', () => {
  it('attaches the item to the current routine and inherits its goalRef', () => {
    const vm = ctx();
    call('onDoNow', vm, ITEM);
    const vars = varsOf(vm);
    expect(vars.taskRef).toBe('sw');
    expect(vars.goalRef).toBe('wg_sw');
    expect(vars.id).toBe('i1');
    expect(vars.date).toBe('12-09-2026');
    expect(vars.period).toBe('day');
  });

  it('carries the item’s own fields through the replace', () => {
    const vm = ctx();
    call('onDoNow', vm, ITEM);
    const vars = varsOf(vm);
    expect(vars.body).toBe('Renew passport');
    expect(vars.contribution).toBe('Expires in March.');
    expect(vars.tags).toEqual(['area:life']);
  });

  it('keeps a goalRef the item already had rather than overwriting it', () => {
    const vm = ctx();
    call('onDoNow', vm, { ...ITEM, goalRef: 'wg_other' });
    expect(varsOf(vm).goalRef).toBe('wg_other');
  });

  it('does nothing when the clock has no current routine', () => {
    const vm = ctx({ currentRoutine: null });
    call('onDoNow', vm, ITEM);
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('guards the two fields it changes, and reports the move', async () => {
    const vm = ctx();
    call('onDoNow', vm, ITEM);
    expect(guardFields).toHaveBeenCalledWith('GoalItem', 'i1', ['taskRef', 'goalRef']);
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.$emit).toHaveBeenCalledWith('changed', {
      op: 'assign', id: 'i1', taskRef: 'sw',
    });
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Moved to Start Work',
    }));
  });
});

describe('InboxSheetContainer — Move to routine', () => {
  it('uses the picked routine, not the current one', () => {
    const vm = ctx();
    call('onMove', vm, { item: ITEM, routine: vm.routines[0] });
    const vars = varsOf(vm);
    expect(vars.taskRef).toBe('mp');
    expect(vars.goalRef).toBe('wg_mp');
  });

  it('a failed move releases the guard and surfaces the server message', async () => {
    const error = { graphQLErrors: [{ message: 'Goal item not found' }] };
    const vm = ctx({ $apollo: { mutate: jest.fn(() => Promise.reject(error)) } });
    call('onMove', vm, { item: ITEM, routine: vm.routines[0] });
    await Promise.resolve();
    await Promise.resolve();
    expect(releaseEntity).toHaveBeenCalledWith('GoalItem', 'i1');
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Goal item not found',
    }));
  });

  it('ignores a routine with no id', () => {
    const vm = ctx();
    call('onMove', vm, { item: ITEM, routine: { name: 'Nowhere' } });
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });
});

describe('InboxSheetContainer — delete', () => {
  it('deletes the goal item and reports it', async () => {
    const vm = ctx();
    call('onRemove', vm, ITEM);
    expect(vm.$goals.deleteGoalItem)
      .toHaveBeenCalledWith({ id: 'i1', date: '12-09-2026', period: 'day' });
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.$emit).toHaveBeenCalledWith('changed', { op: 'delete', id: 'i1' });
  });

  it('ignores an item with no id', () => {
    const vm = ctx();
    call('onRemove', vm, {});
    expect(vm.$goals.deleteGoalItem).not.toHaveBeenCalled();
  });
});
