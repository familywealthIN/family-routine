/**
 * D-01: "— No Goal Task —" stores toolbarGoalRef = null, which the
 * goalItemsRef watcher read as "nothing picked yet". Generating a plan
 * refetches the period above, so the first goal of that list was preselected
 * over the parent the user had just declined — and saved as the plan's
 * goalRef.
 */
/* eslint-env jest */
// The modal pulls the atoms barrel and the markdown editor, which reach
// third-party components shipped as raw .vue files that cannot be parsed
// here. Neither the watcher nor initializeToolbar renders them.
jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModal = require('./AiSearchModal.vue').default;

const monthGoals = [
  { id: 'month-1', body: 'Intention Setting and Manifestation', taskRef: 'wake-up' },
  { id: 'month-2', body: 'Sleep earlier', taskRef: 'wind-down' },
];

const pick = (vm, goalRef) => {
  const state = { toolbarGoalRef: null, toolbarGoalRefNone: false, ...vm };
  AiSearchModal.methods.selectToolbarGoalRef.call(state, goalRef);
  return state;
};

const receive = (vm, newVal, oldVal) => {
  const state = { goalRefNotice: '', $currentTaskData: null, ...vm };
  AiSearchModal.watch.goalItemsRef.handler.call(state, newVal, oldVal);
  return state;
};

describe('AiSearchModal explicit "No Goal Task" parent', () => {
  it('records the choice when the toolbar sends null', () => {
    const state = pick({}, null);

    expect(state.toolbarGoalRef).toBeNull();
    expect(state.toolbarGoalRefNone).toBe(true);
  });

  it('keeps the parent empty when the period above is refetched', () => {
    const chosen = pick({}, null);
    const state = receive(chosen, monthGoals, monthGoals);

    expect(state.toolbarGoalRef).toBeNull();
  });

  it('keeps the parent empty even when a goal matches the current routine', () => {
    const chosen = pick({ $currentTaskData: { id: 'wake-up' } }, null);
    const state = receive(chosen, monthGoals, []);

    expect(state.toolbarGoalRef).toBeNull();
  });

  it('forgets the choice once a real parent is picked', () => {
    const state = pick({ toolbarGoalRefNone: true }, 'month-2');

    expect(state.toolbarGoalRef).toBe('month-2');
    expect(state.toolbarGoalRefNone).toBe(false);
  });

  it('still auto-selects when nothing has been picked yet', () => {
    const state = receive({ toolbarGoalRef: null, toolbarGoalRefNone: false }, monthGoals, []);

    expect(state.toolbarGoalRef).toBe('month-1');
  });

  it('clears the choice when the sheet is reopened', () => {
    const state = {
      todayFormatted: '30-10-2026',
      goalItemsRef: [],
      toolbarTaskRef: null,
      toolbarGoalRefNone: true,
      $currentTaskData: { id: 'wake-up' },
      preselectTaskRef: '',
      populateRoutineTags: jest.fn(),
      loadSettings: jest.fn(),
      fetchGoalsForPeriod: jest.fn(),
    };
    AiSearchModal.methods.initializeToolbar.call(state);

    expect(state.toolbarGoalRefNone).toBe(false);
  });
});
