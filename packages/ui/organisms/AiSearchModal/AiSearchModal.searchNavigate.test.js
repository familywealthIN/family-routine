/**
 * D-18: searching from the AI modal landed on /search already scoped to the
 * routine task the toolbar had auto-selected, so goals outside that routine
 * were reported as missing. Search must start unscoped.
 */
/* eslint-env jest */
// The modal pulls the atoms barrel and the markdown editor, which reach
// third-party components shipped as raw .vue files that cannot be parsed
// here. Search navigation never renders them.
jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModal = require('./AiSearchModal.vue').default;

const navigateFrom = (vm) => {
  const pushed = [];
  AiSearchModal.methods.handleSearchNavigate.call({
    $router: { push: (loc) => { pushed.push(loc); return Promise.resolve(); } },
    closeModal: () => {},
    ...vm,
  });
  return pushed[0];
};

describe('AiSearchModal search navigation', () => {
  it('does not scope the search to the auto-selected routine', () => {
    const location = navigateFrom({
      searchQuery: 'Seven-Day',
      toolbarTaskRef: 'task-1',
      promptTags: [],
    });

    expect(location.query).toEqual({ q: 'Seven-Day' });
  });

  it('still carries the tags the user typed', () => {
    const location = navigateFrom({
      searchQuery: 'Seven-Day',
      toolbarTaskRef: 'task-1',
      promptTags: ['health', 'habit'],
    });

    expect(location.query).toEqual({ q: 'Seven-Day', tags: 'health,habit' });
  });
});
