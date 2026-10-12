/**
 * D-07: after a generated goal plan was cancelled, the parent-goal list was
 * still the period above the plan (month), and the next DAY task was saved
 * with a month goal as its parent. D-08: a quick add left its text in the
 * sheet while it closed, and the next task was typed onto it.
 */
/* eslint-env jest */
jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModalModule = require('./AiSearchModal.vue');

const AiSearchModal = AiSearchModalModule.default;
const { isWrongParentPeriod } = AiSearchModalModule;

const weekGoals = [{
  id: 'week-1', body: 'Ship the onboarding redesign', taskRef: 'task-1', period: 'week',
}];
const monthGoals = [{
  id: 'month-1', body: 'Intention Setting and Manifestation', taskRef: 'task-1', period: 'month',
}];

const receive = (vm, newVal, oldVal) => {
  const state = { goalRefNotice: '', $currentTaskData: null, ...vm };
  AiSearchModal.watch.goalItemsRef.handler.call(state, newVal, oldVal);
  return state;
};

const withMethods = (state) => {
  const vm = {
    goalRefNotice: '',
    $emit: jest.fn(),
    $nextTick: (fn) => fn(),
    focusPromptInput: jest.fn(),
    ...state,
  };
  Object.keys(AiSearchModal.methods).forEach((name) => {
    if (!vm[name]) vm[name] = AiSearchModal.methods[name].bind(vm);
  });
  return vm;
};

describe('isWrongParentPeriod', () => {
  it('accepts a week goal for a day item and a month goal for a week item', () => {
    expect(isWrongParentPeriod(weekGoals[0], 'day')).toBe(false);
    expect(isWrongParentPeriod(monthGoals[0], 'week')).toBe(false);
  });

  it('rejects a month goal for a day item', () => {
    expect(isWrongParentPeriod(monthGoals[0], 'day')).toBe(true);
  });

  it('does not judge a goal without a period', () => {
    expect(isWrongParentPeriod({ id: 'x' }, 'day')).toBe(false);
  });
});

describe('AiSearchModal parent list for another period (D-07)', () => {
  it('takes nothing from a month list while a day task is being added', () => {
    const state = receive({ toolbarGoalRef: null, toolbarPeriod: 'day' }, monthGoals, []);

    expect(state.toolbarGoalRef).toBeNull();
  });

  it('quietly drops a pick made against that month list', () => {
    const state = receive({ toolbarGoalRef: 'month-1', toolbarPeriod: 'day' }, monthGoals, monthGoals);

    expect(state.toolbarGoalRef).toBeNull();
    expect(state.goalRefNotice).toBe('');
  });

  it('auto-selects from the week list once it arrives', () => {
    const state = receive({ toolbarGoalRef: null, toolbarPeriod: 'day' }, weekGoals, monthGoals);

    expect(state.toolbarGoalRef).toBe('week-1');
  });

  it('refetches the parent list when the period returns to day', () => {
    const vm = { isTaskMode: true, fetchGoalsForPeriod: jest.fn() };
    AiSearchModal.watch.toolbarPeriod.call(vm, 'day');

    expect(vm.fetchGoalsForPeriod).toHaveBeenCalledWith('day');
  });

  it('on open, asks for week goals and keeps no parent from a leftover month list', () => {
    const state = {
      todayFormatted: '11-10-2026',
      goalItemsRef: monthGoals,
      toolbarGoalRef: 'month-1',
      $currentTaskData: { id: 'task-1' },
      preselectTaskRef: '',
      populateRoutineTags: jest.fn(),
      loadSettings: jest.fn(),
      fetchGoalsForPeriod: jest.fn(),
    };
    AiSearchModal.methods.initializeToolbar.call(state);

    expect(state.fetchGoalsForPeriod).toHaveBeenCalledWith('day');
    expect(state.toolbarGoalRef).toBeNull();
  });

  it('refuses to save a day task under a month goal, with the period notice', () => {
    const vm = withMethods({
      searchQuery: 'Dim screens at 10pm',
      isSearchMode: false,
      isTaskMode: true,
      aiEnhancedTask: false,
      toolbarPeriod: 'day',
      toolbarGoalRef: 'month-1',
      goalItemsRef: monthGoals,
    });

    AiSearchModal.methods.handleSubmit.call(vm);

    expect(vm.$emit).not.toHaveBeenCalledWith('direct-task-create', expect.anything());
    expect(vm.goalRefNotice).toContain('not in the period above this one');
    expect(vm.toolbarGoalRef).toBeNull();
  });
});

describe('AiSearchModal quick add (D-08)', () => {
  const quickAdd = (state = {}) => withMethods({
    searchQuery: 'Run offline sync edge cases',
    isSearchMode: false,
    isTaskMode: true,
    aiEnhancedTask: false,
    toolbarPeriod: 'day',
    toolbarDate: '11-10-2026',
    toolbarTaskRef: 'task-1',
    toolbarGoalRef: 'week-1',
    goalItemsRef: weekGoals,
    promptTags: [],
    dialog: false,
    ...state,
  });

  it('creates the task and clears the text it submitted', () => {
    const vm = quickAdd();
    AiSearchModal.methods.handleSubmit.call(vm);

    expect(vm.$emit).toHaveBeenCalledWith('direct-task-create', expect.objectContaining({
      body: 'Run offline sync edge cases', goalRef: 'week-1',
    }));
    expect(vm.searchQuery).toBe('');
  });

  it('creates a second task typed into the same sheet on its own', () => {
    const vm = quickAdd({ dialog: true });
    AiSearchModal.methods.handleSubmit.call(vm);
    vm.searchQuery = 'Write the changelog entry';
    AiSearchModal.methods.handleSubmit.call(vm);

    const bodies = vm.$emit.mock.calls
      .filter(([event]) => event === 'direct-task-create')
      .map(([, data]) => data.body);
    expect(bodies).toEqual(['Run offline sync edge cases', 'Write the changelog entry']);
    expect(vm.focusPromptInput).toHaveBeenCalled();
  });
});
