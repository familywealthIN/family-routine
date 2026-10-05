/* eslint-env jest */
/**
 * GoalItemSheetContainer — the goal-item page's writes.
 *
 * What is pinned:
 *
 *   1. **`updateGoalItem` is a full replace.** Its resolver `$set`s every argument
 *      it is handed and defaults `tags` to `[]`, so a call that sends only the
 *      changed field wipes the rest. Every write here must carry the item's
 *      current values — that is the whole reason `writeItem` exists.
 *   2. **A date pick is a move**, and a move is the one change an entity patch
 *      cannot express: the item leaves the source day's list. So it closes the
 *      sheet and reports a list-affecting change.
 *   3. **Only list-affecting ops trigger a refetch.** A title or tag edit is
 *      normalized by Apollo from the mutation result; refetching after it would
 *      be a round trip for nothing.
 *   4. **Completion is not handled here.** It crosses three domains (K-stimulus,
 *      agent end event, chat event), so it leaves as an event for the page.
 */
jest.mock(
  '@routine-notes/ui/organisms/GoalItemSheet/GoalItemSheet.vue',
  () => ({ __esModule: true, default: { name: 'GoalItemSheet', render() {} } }),
);
jest.mock(
  '../GoalDeleteConfirmContainer.vue',
  () => ({ __esModule: true, default: { name: 'GoalDeleteConfirmContainer', render() {} } }),
);

const Container = require('../GoalItemSheetContainer.vue').default;
const { guardFields, releaseEntity } = require('../../utils/cacheGuard');

jest.mock('../../utils/cacheGuard', () => ({
  guardFields: jest.fn(),
  releaseEntity: jest.fn(),
  confirmFields: jest.fn(),
}));
jest.mock('../../composables/useEntityCache', () => ({
  patchSubTaskItem: jest.fn(),
}));

const { patchSubTaskItem } = require('../../composables/useEntityCache');

const ITEM = {
  id: 'g1',
  body: 'Ship dashboard PR',
  contribution: 'Closes the last blocker.',
  reward: '',
  deadline: '',
  isMilestone: false,
  isComplete: false,
  taskRef: 'sw',
  goalRef: 'wg1',
  tags: ['project:dashboard'],
  status: 'todo',
  progress: 0,
  subTasks: [
    { id: 's1', body: 'Fix offsets', isComplete: false },
    { id: 's2', body: 'Add tests', isComplete: false },
  ],
};

const ctx = (over = {}) => ({
  item: ITEM,
  date: '12-09-2026',
  period: 'day',
  $apollo: { mutate: jest.fn(() => Promise.resolve({ data: {} })) },
  $goals: {
    addSubTaskItem: jest.fn(() => Promise.resolve({})),
    completeSubTaskItem: jest.fn(() => Promise.resolve({})),
    deleteSubTaskItem: jest.fn(() => Promise.resolve({})),
    deleteGoalItem: jest.fn(() => Promise.resolve({})),
  },
  $notify: jest.fn(),
  $emit: jest.fn(),
  $refs: { deleteConfirm: { open: jest.fn() } },
  notifyError: Container.methods.notifyError,
  writeItem: Container.methods.writeItem,
  ...over,
});

const call = (name, vm, ...args) => Container.methods[name].call(vm, ...args);
const varsOf = (vm, i = 0) => vm.$apollo.mutate.mock.calls[i][0].variables;

beforeEach(() => jest.clearAllMocks());

describe('GoalItemSheetContainer — writeItem sends the whole field set', () => {
  it('a title change still carries contribution, tags, refs', () => {
    const vm = ctx();
    call('onUpdateTitle', vm, { item: ITEM, body: 'Ship the dashboard PR' });
    expect(varsOf(vm)).toEqual({
      id: 'g1',
      period: 'day',
      date: '12-09-2026',
      body: 'Ship the dashboard PR',
      contribution: 'Closes the last blocker.',
      reward: '',
      deadline: '',
      isMilestone: false,
      taskRef: 'sw',
      goalRef: 'wg1',
      tags: ['project:dashboard'],
    });
  });

  it('a tag change still carries the body and the contribution', () => {
    const vm = ctx();
    call('onUpdateTags', vm, { item: ITEM, tags: ['area:work'] });
    const vars = varsOf(vm);
    expect(vars.tags).toEqual(['area:work']);
    expect(vars.body).toBe('Ship dashboard PR');
    expect(vars.contribution).toBe('Closes the last blocker.');
  });

  it('never sends tags as undefined — that is how they get wiped', () => {
    const vm = ctx({ item: { ...ITEM, tags: null } });
    call('onUpdateTitle', vm, { item: { ...ITEM, tags: null }, body: 'x' });
    expect(varsOf(vm).tags).toEqual([]);
  });

  it('guards only the fields it is changing', () => {
    const vm = ctx();
    call('onUpdateTitle', vm, { item: ITEM, body: 'x' });
    expect(guardFields).toHaveBeenCalledWith('GoalItem', 'g1', ['body']);
  });

  it('its optimistic response is a COMPLETE GoalItem with the right typenames', () => {
    const vm = ctx();
    call('onUpdateTitle', vm, { item: ITEM, body: 'x' });
    const optimistic = vm.$apollo.mutate.mock.calls[0][0].optimisticResponse.updateGoalItem;
    expect(optimistic.__typename).toBe('GoalItem');
    expect(optimistic.id).toBe('g1');
    expect(optimistic.isComplete).toBe(false);
    expect(optimistic.subTasks).toEqual([
      {
        __typename: 'SubTaskItem', id: 's1', body: 'Fix offsets', isComplete: false,
      },
      {
        __typename: 'SubTaskItem', id: 's2', body: 'Add tests', isComplete: false,
      },
    ]);
  });

  it('a failed write releases the guard and says so', async () => {
    const error = { graphQLErrors: [{ message: 'This task needs a date.' }] };
    const vm = ctx({ $apollo: { mutate: jest.fn(() => Promise.reject(error)) } });
    call('onUpdateTitle', vm, { item: ITEM, body: 'x' });
    await Promise.resolve();
    await Promise.resolve();
    expect(releaseEntity).toHaveBeenCalledWith('GoalItem', 'g1');
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
      text: 'This task needs a date.',
    }));
  });

  it('a contribution that did not change is not written at all', () => {
    const vm = ctx();
    call('onCommitContribution', vm, { item: ITEM, contribution: 'Closes the last blocker.' });
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });
});

describe('GoalItemSheetContainer — Linked to is editable', () => {
  it('a new parent goal is written, and makes the item its milestone', () => {
    const vm = ctx();
    call('onUpdateLink', vm, { item: ITEM, goalRef: 'wg2' });
    expect(varsOf(vm)).toMatchObject({
      goalRef: 'wg2', isMilestone: true, taskRef: 'sw', body: 'Ship dashboard PR',
    });
    expect(guardFields).toHaveBeenCalledWith('GoalItem', 'g1', ['goalRef', 'isMilestone']);
  });

  it('unlinking clears the parent and the milestone flag', () => {
    const vm = ctx({ item: { ...ITEM, isMilestone: true } });
    call('onUpdateLink', vm, { item: { ...ITEM, isMilestone: true }, goalRef: '' });
    expect(varsOf(vm)).toMatchObject({ goalRef: '', isMilestone: false });
  });

  it('a new routine is written without touching the parent', () => {
    const vm = ctx();
    call('onUpdateLink', vm, { item: ITEM, taskRef: 'evening' });
    expect(varsOf(vm)).toMatchObject({ taskRef: 'evening', goalRef: 'wg1', isMilestone: false });
  });

  it('loads the parent choices one period up from the item', async () => {
    const fetchGoalDatePeriod = jest.fn(() => Promise.resolve({ goalItems: [{ id: 'wg1' }] }));
    const vm = {
      parentKey: 'day|12-09-2026',
      period: 'day',
      date: '12-09-2026',
      parentSeq: 0,
      goalRefOptions: [],
      $goals: { fetchGoalDatePeriod },
    };
    await call('loadParentGoals', vm);
    expect(fetchGoalDatePeriod).toHaveBeenCalledWith('week', expect.any(String), { useCache: false });
    expect(vm.goalRefOptions).toEqual([{ id: 'wg1' }]);
  });
});

describe('GoalItemSheetContainer — a date pick is a move', () => {
  it('sends the TARGET date, closes the sheet and reports a list change', async () => {
    const vm = ctx();
    call('onPickDate', vm, {
      item: ITEM,
      option: { key: 'tomorrow', label: 'Tomorrow', date: '13-09-2026' },
    });
    expect(varsOf(vm).date).toBe('13-09-2026');
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.$emit).toHaveBeenCalledWith('close');
    expect(vm.$emit).toHaveBeenCalledWith('changed', {
      op: 'move-date', id: 'g1', date: '13-09-2026',
    });
  });

  it('ignores a pick that is already the current date', () => {
    const vm = ctx();
    call('onPickDate', vm, { item: ITEM, option: { key: 'today', date: '12-09-2026' } });
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });
});

describe('GoalItemSheetContainer — delete goes through the confirm', () => {
  it('opens the existing confirm container rather than deleting straight away', () => {
    const vm = ctx();
    call('confirmDelete', vm, ITEM);
    expect(vm.$goals.deleteGoalItem).not.toHaveBeenCalled();
    expect(vm.$refs.deleteConfirm.open).toHaveBeenCalledWith({
      id: 'g1', body: 'Ship dashboard PR', period: 'day', date: '12-09-2026',
    });
  });

  it('deletes once confirmed, and reports a list change', async () => {
    const vm = ctx();
    call('onDeleteConfirmed', vm, {
      id: 'g1', body: 'Ship dashboard PR', period: 'day', date: '12-09-2026',
    });
    expect(vm.$goals.deleteGoalItem)
      .toHaveBeenCalledWith({ id: 'g1', date: '12-09-2026', period: 'day' });
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.$emit).toHaveBeenCalledWith('changed', { op: 'delete', id: 'g1' });
  });
});

describe('GoalItemSheetContainer — subtasks', () => {
  it('add goes through the shared mutation with the parent id', () => {
    const vm = ctx();
    call('onAddSubtask', vm, { item: ITEM, body: 'Write release notes' });
    expect(vm.$goals.addSubTaskItem).toHaveBeenCalledWith({
      taskId: 'g1',
      body: 'Write release notes',
      period: 'day',
      date: '12-09-2026',
      isComplete: false,
    });
  });

  it('toggle flips the subtask and hands over the list for the optimistic write', () => {
    const vm = ctx();
    call('onToggleSubtask', vm, { item: ITEM, subtask: ITEM.subTasks[1] });
    expect(vm.$goals.completeSubTaskItem).toHaveBeenCalledWith({
      id: 's2',
      taskId: 'g1',
      period: 'day',
      date: '12-09-2026',
      isComplete: true,
      subTasks: ITEM.subTasks,
      dayDate: '12-09-2026',
    });
  });

  it('rename patches SubTaskItem by id — the parent list is untouched', async () => {
    const vm = ctx({
      $apollo: {
        mutate: jest.fn((options) => {
          options.update(
            { writeFragment: jest.fn() },
            { data: { updateSubTaskItem: { id: 's2', body: 'Add tests', isComplete: false } } },
          );
          return Promise.resolve({ data: {} });
        }),
      },
    });
    call('onRenameSubtask', vm, { item: ITEM, subtask: ITEM.subTasks[1], body: 'Add tests' });
    expect(varsOf(vm)).toEqual({
      id: 's2', taskId: 'g1', period: 'day', date: '12-09-2026', body: 'Add tests',
    });
    expect(guardFields).toHaveBeenCalledWith('SubTaskItem', 's2', ['body']);
    expect(patchSubTaskItem)
      .toHaveBeenCalledWith(expect.anything(), 's2', { body: 'Add tests' });
    await Promise.resolve();
  });

  it('a failed rename releases the SubTaskItem guard', async () => {
    const vm = ctx({ $apollo: { mutate: jest.fn(() => Promise.reject(new Error('nope'))) } });
    call('onRenameSubtask', vm, { item: ITEM, subtask: ITEM.subTasks[0], body: 'x' });
    await Promise.resolve();
    await Promise.resolve();
    expect(releaseEntity).toHaveBeenCalledWith('SubTaskItem', 's1');
  });

  it('move up swaps the two ids and sends the whole order', () => {
    const vm = ctx();
    call('onMoveSubtaskUp', vm, { item: ITEM, subtask: ITEM.subTasks[1] });
    expect(varsOf(vm)).toEqual({
      taskId: 'g1', period: 'day', date: '12-09-2026', ids: ['s2', 's1'],
    });
    expect(guardFields).toHaveBeenCalledWith('GoalItem', 'g1', ['subTasks']);
  });

  it('move up on the first row never reaches the server', () => {
    const vm = ctx();
    call('onMoveSubtaskUp', vm, { item: ITEM, subtask: ITEM.subTasks[0] });
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('remove goes through the shared mutation', () => {
    const vm = ctx();
    call('onRemoveSubtask', vm, { item: ITEM, subtask: ITEM.subTasks[0] });
    expect(vm.$goals.deleteSubTaskItem).toHaveBeenCalledWith({
      id: 's1', taskId: 'g1', period: 'day', date: '12-09-2026',
    });
  });
});

describe('GoalItemSheetContainer — an optimistic subtask is not written against', () => {
  const TEMP = { id: 'temp-subtask-1', body: 'new', isComplete: false };
  const withTemp = { ...ITEM, subTasks: [...ITEM.subTasks, TEMP] };

  it('ignores toggle, rename and remove on a row the server has not confirmed', () => {
    const vm = ctx();
    call('onToggleSubtask', vm, { item: withTemp, subtask: TEMP });
    call('onRenameSubtask', vm, { item: withTemp, subtask: TEMP, body: 'renamed' });
    call('onRemoveSubtask', vm, { item: withTemp, subtask: TEMP });
    expect(vm.$goals.completeSubTaskItem).not.toHaveBeenCalled();
    expect(vm.$goals.deleteSubTaskItem).not.toHaveBeenCalled();
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('holds a reorder while any row is still optimistic', () => {
    const vm = ctx();
    call('onMoveSubtaskUp', vm, { item: withTemp, subtask: ITEM.subTasks[1] });
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
  });
});
