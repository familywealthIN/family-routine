/**
 * "Add task" from a Routine Focus card that is not the clock-current routine
 * filed the task under the current routine: on open the toolbar always
 * selected $currentTaskData. The opener's routine now wins.
 */
/* eslint-env jest */
jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModal = require('./AiSearchModal.vue').default;

const open = (over) => {
  const state = {
    todayFormatted: '03-10-2026',
    goalItemsRef: [],
    toolbarTaskRef: null,
    $currentTaskData: { id: 'now' },
    preselectTaskRef: '',
    populateRoutineTags: jest.fn(),
    loadSettings: jest.fn(),
    ...over,
  };
  AiSearchModal.methods.initializeToolbar.call(state);
  return state;
};

describe('AiSearchModal routine preselection on open', () => {
  it('selects the routine the opener is showing', () => {
    expect(open({ preselectTaskRef: 'rp' }).toolbarTaskRef).toBe('rp');
  });

  it('falls back to the clock-current routine', () => {
    expect(open().toolbarTaskRef).toBe('now');
  });

  it('replaces a selection left over from the previous open', () => {
    expect(open({ toolbarTaskRef: 'old', preselectTaskRef: 'rp' }).toolbarTaskRef).toBe('rp');
  });
});
