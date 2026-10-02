/**
 * D-02: the toolbar kept a parent goal picked against the previous
 * goalItemsRef list after the period above was refetched. The chip showed the
 * placeholder while the stale id was still saved as goalRef, which parented a
 * month plan to a week goal.
 */
/* eslint-env jest */
// The modal pulls the atoms barrel and the markdown editor, which reach
// third-party components shipped as raw .vue files that cannot be parsed
// here. The goalItemsRef watcher never renders them.
jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModal = require('./AiSearchModal.vue').default;

const weekGoals = [{ id: 'week-1', body: 'Ship the onboarding redesign', taskRef: 'task-1' }];
const monthGoals = [{ id: 'month-1', body: 'Routine Notes 1.0 live in both stores', taskRef: 'task-1' }];

const receive = (vm, newVal, oldVal) => {
  const state = { goalRefNotice: '', $currentTaskData: null, ...vm };
  AiSearchModal.watch.goalItemsRef.handler.call(state, newVal, oldVal);
  return state;
};

describe('AiSearchModal parent goal against the period above', () => {
  it('drops a selection the refetched list no longer holds, and says so', () => {
    const state = receive({ toolbarGoalRef: 'week-1' }, monthGoals, weekGoals);

    expect(state.toolbarGoalRef).toBeNull();
    expect(state.goalRefNotice).toContain('Ship the onboarding redesign');
  });

  it('keeps a selection the refetched list still holds', () => {
    const state = receive({ toolbarGoalRef: 'month-1' }, monthGoals, monthGoals);

    expect(state.toolbarGoalRef).toBe('month-1');
    expect(state.goalRefNotice).toBe('');
  });

  it('does not re-select for the user after dropping one', () => {
    const state = receive({ toolbarGoalRef: 'week-1' }, monthGoals, weekGoals);

    expect(state.toolbarGoalRef).not.toBe('month-1');
  });

  it('still auto-selects when nothing is selected yet', () => {
    const state = receive({ toolbarGoalRef: null }, monthGoals, []);

    expect(state.toolbarGoalRef).toBe('month-1');
    expect(state.goalRefNotice).toBe('');
  });
});
