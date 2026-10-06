/* eslint-env jest */
/**
 * "A routine cannot start without adding a goal item."
 *
 * Start Task runs through handleAddGoalItem, which returned early on an empty
 * input — no emit, no tick, no feedback. On the classic dashboard that is
 * survivable (the task rows carry their own checkboxes), but the Routine Focus
 * home drives every start through this one sheet, so a routine with no
 * checklist yet could not be started at all.
 *
 * `allowStartWithoutTask` is the opt-in: hosts that have no other start path
 * get a plain "start it as it stands", everyone else keeps the old behaviour.
 */
// The organism reaches the atoms barrel through GoalRefSelector, which pulls
// third-party components shipped as raw .vue files (jest won't transform them).
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const QuickGoalCreation = require('./QuickGoalCreation.vue').default;

const { handleAddGoalItem } = QuickGoalCreation.methods;

// A vm-like context, matching the computed/methods test convention.
const ctx = (overrides = {}) => {
  const emitted = [];
  return {
    emitted,
    vm: {
      newGoalItem: { body: '', goalRef: '', taskRef: 'wake-up', tags: [] },
      allowStartWithoutTask: false,
      setLocalUserTag: jest.fn(),
      $emit: (event, payload) => emitted.push([event, payload]),
      ...overrides,
    },
  };
};

const press = (overrides) => {
  const c = ctx(overrides);
  handleAddGoalItem.call(c.vm);
  return c.emitted;
};

const names = (emitted) => emitted.map(([event]) => event);

describe('QuickGoalCreation Start Task', () => {
  it('creates the typed task', () => {
    const emitted = press({
      newGoalItem: {
        body: 'Plan for Citi payment', goalRef: 'week-1', taskRef: 'wake-up', tags: ['area:cfo'],
      },
    });

    expect(names(emitted)).toEqual(['add-goal-item']);
    expect(emitted[0][1]).toMatchObject({
      body: 'Plan for Citi payment',
      goalRef: 'week-1',
      taskRef: 'wake-up',
    });
  });

  // The reported break.
  it('starts the routine with nothing typed when the host allows it', () => {
    expect(names(press({ allowStartWithoutTask: true })))
      .toEqual(['start-quick-goal-task']);
  });

  it('treats whitespace as nothing typed', () => {
    const emitted = press({
      allowStartWithoutTask: true,
      newGoalItem: { body: '   ', goalRef: '', taskRef: 'wake-up', tags: [] },
    });

    expect(names(emitted)).toEqual(['start-quick-goal-task']);
  });

  // The classic dashboard, where the task rows carry their own checkboxes.
  it('still does nothing on an empty input when the host has another way in', () => {
    expect(press({ allowStartWithoutTask: false })).toEqual([]);
  });

  it('does not try to create an item when there is nothing to create', () => {
    const c = ctx({ allowStartWithoutTask: true });
    handleAddGoalItem.call(c.vm);

    expect(c.vm.setLocalUserTag).not.toHaveBeenCalled();
    expect(names(c.emitted)).not.toContain('add-goal-item');
  });

  it('defaults to refusing an empty start', () => {
    expect(QuickGoalCreation.props.allowStartWithoutTask.default).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The hint line
// ---------------------------------------------------------------------------
// The sheet's one line of narration: on the Routine Focus home it is the only
// place that says what Start Task is about to DO with what has been typed. The
// blocked case is the same sentence in warning orange rather than a separate
// disabled state, because the button works again the moment something is typed.
describe('QuickGoalCreation hint', () => {
  const { computed } = QuickGoalCreation;
  const hintFor = (over = {}) => {
    const vm = {
      newGoalItem: { body: '', goalRef: '' },
      goalItemsRef: [{ id: 'wg1', body: 'Ship the dashboard' }],
      openItemCount: -1,
      ...over,
    };
    vm.typedBody = computed.typedBody.call(vm);
    vm.selectedGoalBody = computed.selectedGoalBody.call(vm);
    return {
      hint: computed.hint.call(vm),
      warn: computed.hintWarn.call(vm),
    };
  };

  it('says where a typed item will land, naming the parent goal', () => {
    const { hint, warn } = hintFor({
      newGoalItem: { body: '  Write release notes  ', goalRef: 'wg1' },
      openItemCount: 2,
    });
    expect(hint).toBe('Start adds “Write release notes” to the checklist '
      + 'under Ship the dashboard, then starts the routine.');
    expect(warn).toBe(false);
  });

  it('drops the "under …" clause when nothing is selected', () => {
    const { hint } = hintFor({ newGoalItem: { body: 'Write release notes', goalRef: '' } });
    expect(hint).toBe('Start adds “Write release notes” to the checklist, then starts the routine.');
  });

  it('counts what is already open when nothing is typed', () => {
    expect(hintFor({ openItemCount: 3 }).hint)
      .toBe('3 open items on the checklist · type to add another, or just start.');
    expect(hintFor({ openItemCount: 1 }).hint)
      .toBe('1 open item on the checklist · type to add another, or just start.');
  });

  it('warns — and only warns — when there is nothing to start with', () => {
    const empty = hintFor({ openItemCount: 0 });
    expect(empty.hint).toBe('Type a goal item to start — a routine can’t start without one.');
    expect(empty.warn).toBe(true);
    // Typing clears the warning immediately; the button is never disabled.
    expect(hintFor({ newGoalItem: { body: 'x', goalRef: '' }, openItemCount: 0 }).warn)
      .toBe(false);
  });

  // The classic dashboard does not pass a count, and guessing one would print a
  // sentence about a checklist the host never described.
  it('says nothing when the host does not know the count', () => {
    expect(hintFor().hint).toBe('');
    expect(hintFor().warn).toBe(false);
  });
});
