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
