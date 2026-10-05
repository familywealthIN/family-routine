/* eslint-env jest */

// D-07: the dialog offered no way to move a task off a day it was not done on.
// Completing it was a lie and deleting it lost the record, so it now offers a
// one-click defer (a save against tomorrow, which the server turns into a move)
// and a miss that is recorded on the item.

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. The markdown editor ships one
// too. Both stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));
jest.mock('@routine-notes/markdown-editor', () => ({ MarkdownEditor: {} }));

const GoalCreation = require('./GoalCreation.vue').default;

const dayItem = (overrides = {}) => ({
  id: 'g1',
  body: 'Active Recovery',
  period: 'day',
  date: '18-08-2026',
  isComplete: false,
  status: 'todo',
  ...overrides,
});

/** Call a computed/method with a stubbed `this`, no mount needed. */
function context(goalItem, extra = {}) {
  const vm = {
    newGoalItem: goalItem,
    localGoalItem: goalItem,
    emitted: [],
    $set: (target, key, value) => { target[key] = value; },
    $emit: (...args) => vm.emitted.push(args),
    saveGoalItem: jest.fn(),
    getNewTaskStatus: jest.fn(() => 'todo'),
    ...extra,
  };
  vm.isMissed = GoalCreation.computed.isMissed.call(vm);
  return vm;
}

describe('OrganismGoalCreation defer', () => {
  it('moves the item to the next day and saves, so the server relocates it', () => {
    const vm = context(dayItem());

    GoalCreation.methods.deferGoalItem.call(vm);

    expect(vm.localGoalItem.date).toBe('19-08-2026');
    expect(vm.saveGoalItem).toHaveBeenCalled();
  });

  it('rolls the month over', () => {
    const vm = context(dayItem({ date: '31-08-2026' }));

    GoalCreation.methods.deferGoalItem.call(vm);

    expect(vm.localGoalItem.date).toBe('01-09-2026');
  });

  it('does nothing without a date to defer from', () => {
    const vm = context(dayItem({ date: '' }));

    GoalCreation.methods.deferGoalItem.call(vm);

    expect(vm.localGoalItem.date).toBe('');
    expect(vm.saveGoalItem).not.toHaveBeenCalled();
  });
});

describe('OrganismGoalCreation mark missed', () => {
  it('asks for the miss and flips its own chip', () => {
    const vm = context(dayItem());

    GoalCreation.methods.toggleGoalItemMissed.call(vm);

    const [event, payload] = vm.emitted[0];
    expect(event).toBe('mark-goal-item-missed');
    expect(payload).toEqual({ id: 'g1', isMissed: true });
    expect(vm.localGoalItem.status).toBe('missed');
  });

  it('unmarks an item that was already missed', () => {
    const vm = context(dayItem({ status: 'missed' }));

    GoalCreation.methods.toggleGoalItemMissed.call(vm);

    expect(vm.emitted[0][1].isMissed).toBe(false);
    expect(vm.localGoalItem.status).toBe('todo');
  });

  it('puts the previous status back when the mutation fails', () => {
    const vm = context(dayItem({ status: 'progress' }));

    GoalCreation.methods.toggleGoalItemMissed.call(vm);
    vm.emitted[0][2].onError();

    expect(vm.localGoalItem.status).toBe('progress');
  });
});

describe('OrganismGoalCreation status chip', () => {
  it('shows the miss recorded on the item, not a stale reschedule', () => {
    const vm = context(dayItem({ status: 'missed', originalDate: '17-08-2026' }));

    expect(GoalCreation.computed.statusChip.call(vm)).toBe('missed');
  });

  it('still derives the status of an item that has not been saved yet', () => {
    const vm = context(dayItem({ id: undefined, status: undefined }));

    expect(GoalCreation.computed.statusChip.call(vm)).toBe('todo');
    expect(vm.getNewTaskStatus).toHaveBeenCalled();
  });

  // D-03: the chip resolves a stored status the tick has outlived. The dialog
  // reads the same item as /search, so it has to resolve it the same way.
  it('reads a ticked item as done however stale its stored status', () => {
    const vm = context(dayItem({ status: 'missed', isComplete: true }));

    expect(GoalCreation.computed.statusChip.call(vm)).toBe('done');
  });
});

describe('OrganismGoalCreation off-ramp visibility', () => {
  it('offers the off-ramps on a saved, unticked day item', () => {
    expect(GoalCreation.computed.canDeferOrMiss.call(context(dayItem()))).toBe(true);
  });

  it('hides them once the item is complete', () => {
    expect(GoalCreation.computed.canDeferOrMiss.call(
      context(dayItem({ isComplete: true })),
    )).toBe(false);
  });

  it('hides them for a period goal and for an unsaved item', () => {
    expect(GoalCreation.computed.canDeferOrMiss.call(
      context(dayItem({ period: 'week' })),
    )).toBe(false);
    expect(GoalCreation.computed.canDeferOrMiss.call(
      context(dayItem({ id: undefined })),
    )).toBe(false);
  });
});

describe('OrganismGoalCreation unsaved-changes indicator', () => {
  const unsaved = (contribution, lastSavedContribution) => GoalCreation.computed
    .hasUnsavedContribution.call({ localGoalItem: { contribution }, lastSavedContribution });

  it('reads a goal with no notes (null) as saved on open', () => {
    expect(unsaved(null, '')).toBe(false);
    expect(unsaved(undefined, '')).toBe(false);
  });

  it('reports an edit once the notes differ from the last save', () => {
    expect(unsaved('new notes', '')).toBe(true);
    expect(unsaved('same', 'same')).toBe(false);
  });

  it('does not treat a null contribution as unsaved after the item loads', () => {
    const vm = {
      lastSavedContribution: '',
      previousPeriod: null,
      isInitialLoad: true,
      markdownEditorKey: 0,
      $emit: jest.fn(),
      $nextTick: (fn) => fn(),
    };
    GoalCreation.watch.newGoalItem.call(vm, dayItem({ contribution: null }), {});
    expect(vm.lastSavedContribution).toBe('');
  });
});

describe('OrganismGoalCreation null item', () => {
  it('falls back to an empty item so the template can read fields', () => {
    const item = GoalCreation.computed.localGoalItem.get.call({ newGoalItem: null });
    expect(item).toEqual({});
    expect(item.period).toBeUndefined();
  });

  it('survives the item being cleared to null and back', () => {
    const vm = {
      lastSavedContribution: 'x',
      previousPeriod: 'day',
      isInitialLoad: false,
      markdownEditorKey: 0,
      $emit: jest.fn(),
      $nextTick: (fn) => fn(),
    };
    expect(() => GoalCreation.watch.newGoalItem.call(vm, null, dayItem())).not.toThrow();
    expect(vm.lastSavedContribution).toBe('');
    expect(() => GoalCreation.watch.newGoalItem.call(vm, dayItem(), null)).not.toThrow();
  });
});
