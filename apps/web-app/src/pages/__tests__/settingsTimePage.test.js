/* eslint-env jest */
/**
 * SettingsTime — the Routines page (`/settings`, route name `routines`).
 *
 * The page owns composition and the three things no container may: which routine
 * is selected, which one just saved, and the toast. What is locked here:
 *
 *   1. one breakpoint rule (`resolveShell`) drives the shell, and the header
 *      subtitle counts and pluralises honestly,
 *   2. a timeline row SELECTS AND OPENS; a dial arc only toggles the selection —
 *      and there is no per-row delete anywhere, because delete lives in the
 *      editor (a stated goal of the redesign),
 *   3. the inline gap row opens the editor at the midpoint minute it named,
 *   4. D-03 lives on: when a save re-slices a NEIGHBOUR's daily task target, the
 *      toast's sub says so instead of printing the routine's own details. The
 *      "before" schedule is snapshotted when the editor OPENS, so a mutation
 *      result already in the cache cannot make before and after identical,
 *   5. "Manage" on the agent row is wired to the real agent editor — the mock
 *      leaves it dead,
 *   6. a selection that disappears is cleared rather than dimming every arc.
 */
// Analytics pulls firebase; nothing here measures anything.
jest.mock('@/utils/measurementMixins', () => ({
  __esModule: true,
  MeasurementMixin: { methods: { trackPageView() {}, trackBusinessEvent() {} } },
  default: {},
}));
// Pulls Capacitor + localforage; nothing here signs out for real.
jest.mock('../../utils/signOut', () => ({ __esModule: true, signOut: jest.fn(), default: jest.fn() }));
// The containers own Apollo and the agent store; the composition does not care.
jest.mock('../../containers/AppShellContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'AppShellContainer',
    props: { subtitle: { type: String, default: '' } },
    render(h) {
      return h('div', [
        h('div', { attrs: { 'data-testid': 'shell-subtitle' } }, this.subtitle),
        this.$slots['header-actions'],
        this.$slots.default,
      ]);
    },
  },
}));
jest.mock('../../containers/RoutineYearGoalLinksContainer.vue', () => ({
  __esModule: true,
  default: { name: 'RoutineYearGoalLinksContainer', render() {} },
}));
jest.mock('../../containers/RoutineDayPlanContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'RoutineDayPlanContainer',
    props: { selectedId: { type: String, default: '' }, flashId: { type: String, default: '' } },
    methods: { refresh: jest.fn() },
    render(h) {
      return h('div', { attrs: { 'data-testid': 'plan-stub', 'data-selected': this.selectedId, 'data-flash': this.flashId } });
    },
  },
}));
jest.mock('../../containers/RoutineItemEditorContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'RoutineItemEditorContainer',
    props: {
      siblings: { type: Array, default: () => [] },
      tagUniverse: { type: Array, default: () => [] },
      tagUsage: { type: Object, default: () => ({}) },
    },
    methods: { openNew() {}, openEdit() {} },
    render() {},
  },
}));
jest.mock('../../containers/AgentFormContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'AgentFormContainer',
    methods: { openNew() {}, openEdit() {} },
    render() {},
  },
}));

const Vue = require('vue');

const SettingsTime = require('../SettingsTime.vue').default;
const { signOut } = require('../../utils/signOut');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const BREAKPOINTS = {
  phone: { xsOnly: true, width: 412 },
  tablet: { xsOnly: false, width: 1133 },
  desktop: { xsOnly: false, width: 1440 },
};

const ITEMS = [
  {
    id: 'mp', name: 'Morning Pages', time: '06:30', points: 10, tags: ['morning', 'area:work:writing'], steps: [],
  },
  {
    id: 'sw', name: 'Start Work', time: '09:00', points: 12, tags: ['area:work'], steps: [],
  },
  {
    id: 'wd', name: 'Wind Down', time: '11:30', points: 8, tags: [], steps: [],
  },
];

const render = (shell = 'phone', agents = [], { loaded = true } = {}) => {
  const push = jest.fn(() => Promise.resolve());
  const host = new Vue({
    data: { name: 'Alex', email: 'alex@routine.app', picture: '' },
    render: (h) => h(SettingsTime),
  });
  // The page reads $vuetify/$route/$router/$agent off itself; children inherit
  // them from the prototype (the AgentsBoard page-test convention).
  const agentStore = {
    agents,
    fetchAll: jest.fn(),
    getByTaskRef: (ref) => agents.find((a) => a.taskRef === ref) || null,
  };
  Vue.prototype.$vuetify = { breakpoint: BREAKPOINTS[shell] };
  Vue.prototype.$route = { path: '/settings' };
  Vue.prototype.$router = { push };
  Vue.prototype.$agent = agentStore;
  host.$vuetify = Vue.prototype.$vuetify;
  host.$route = Vue.prototype.$route;
  host.$router = Vue.prototype.$router;
  host.$agent = agentStore;
  host.$mount();
  const page = host.$children[0];
  if (loaded) page.onItems(ITEMS);
  return { host, page, push };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const text = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : null);
const tick = () => Vue.nextTick();

describe('the shell', () => {
  it('resolves the three shells from the one breakpoint rule', () => {
    expect(render('phone').page.shell).toBe('phone');
    expect(render('tablet').page.shell).toBe('tablet');
    expect(render('desktop').page.shell).toBe('desktop');
  });

  it('counts the routines and the points a full day is worth', async () => {
    const { host } = render('phone');
    await tick();
    expect(text(q(host.$el, 'shell-subtitle'))).toBe('3 routines · 30 points a day');
  });

  it('pluralises one routine properly', async () => {
    const { host, page } = render('phone');
    page.onItems([ITEMS[0]]);
    await tick();
    expect(text(q(host.$el, 'shell-subtitle'))).toBe('1 routine · 10 points a day');
  });

  it('adds the tap hint where tablet and desktop have room', () => {
    expect(render('tablet').page.subLabel).toContain('· tap a routine on the dial or the list');
    expect(render('phone').page.subLabel).not.toContain('tap a routine');
  });

  it('owns no GraphQL of its own — every read belongs to a container', () => {
    expect(SettingsTime.apollo).toBeUndefined();
  });
});

describe('the New routine control', () => {
  it('is a bare + on phone and a labelled pill above it', () => {
    expect(text(q(render('phone').host.$el, 'routines-new'))).toBe('add');
    expect(text(q(render('desktop').host.$el, 'routines-new'))).toBe('add New routine');
  });

  it('opens the editor with no suggested time', () => {
    const { host, page } = render('phone');
    const openNew = jest.spyOn(page.$refs.editor, 'openNew');
    q(host.$el, 'routines-new').dispatchEvent(new Event('click'));
    expect(openNew).toHaveBeenCalledWith(null);
  });

  // E2E BUG-5: before the list lands, the points budget would be worked out
  // against an empty day. A tap then waits for the list instead.
  describe('before the list has loaded', () => {
    it('says it is loading rather than "0 routines · 0 points"', () => {
      const { page } = render('phone', [], { loaded: false });
      expect(page.subLabel).toBe('Loading routines…');
    });

    it('holds a New routine tap and opens it once the list arrives', () => {
      const { page } = render('phone', [], { loaded: false });
      const openNew = jest.spyOn(page.$refs.editor, 'openNew');
      page.openNew(650);
      expect(openNew).not.toHaveBeenCalled();
      page.onItems(ITEMS);
      expect(openNew).toHaveBeenCalledTimes(1);
      expect(openNew).toHaveBeenCalledWith(650);
      // The "before" schedule is the real one, not an empty day.
      expect(page.scheduleBefore.map((item) => item.id)).toEqual(['mp', 'sw', 'wd']);
      page.onItems(ITEMS);
      expect(openNew).toHaveBeenCalledTimes(1);
    });
  });
});

describe('selecting and opening', () => {
  it('a row selects AND opens the editor on that routine', () => {
    const { page } = render();
    const openEdit = jest.spyOn(page.$refs.editor, 'openEdit');
    page.openEdit('sw');
    expect(page.selectedId).toBe('sw');
    expect(openEdit).toHaveBeenCalledWith(ITEMS[1]);
  });

  it('ignores a row id that is not in the list', () => {
    const { page } = render();
    const openEdit = jest.spyOn(page.$refs.editor, 'openEdit');
    page.openEdit('ghost');
    expect(openEdit).not.toHaveBeenCalled();
    expect(page.selectedId).toBe('');
  });

  it('an arc only toggles the selection — it does not open anything', () => {
    const { page } = render();
    const openEdit = jest.spyOn(page.$refs.editor, 'openEdit');
    page.onSelect('sw');
    expect(page.selectedId).toBe('sw');
    page.onSelect('sw');
    expect(page.selectedId).toBe('');
    expect(openEdit).not.toHaveBeenCalled();
  });

  it('the gap row opens the editor at the midpoint minute it named', () => {
    const { page } = render();
    const openNew = jest.spyOn(page.$refs.editor, 'openNew');
    page.openNew(650);
    expect(openNew).toHaveBeenCalledWith(650);
  });

  it('clears a selection whose routine has gone', async () => {
    const { page } = render();
    page.onSelect('wd');
    page.onItems(ITEMS.slice(0, 2));
    await tick();
    expect(page.selectedId).toBe('');
  });
});

describe('what the editor is given', () => {
  it('siblings carry id, time and points — the "Until …" caption and the day\'s budget', () => {
    expect(render().page.siblings).toEqual([
      { id: 'mp', time: '06:30', points: 10 },
      { id: 'sw', time: '09:00', points: 12 },
      { id: 'wd', time: '11:30', points: 8 },
    ]);
  });

  it('the tag vocabulary is everything already in use plus what the user typed before', () => {
    const { page } = render();
    page.storedTags = ['deep-focus'];
    expect(page.tagUniverse.sort()).toEqual(['area:work', 'area:work:writing', 'deep-focus', 'morning']);
  });

  it('tag usage counts a parent for every routine filed beneath it', () => {
    expect(render().page.tagUsage).toEqual({
      morning: 1,
      area: 2,
      'area:work': 2,
      'area:work:writing': 1,
    });
  });
});

describe('after a save', () => {
  const saved = (over = {}) => ({
    id: 'sw', name: 'Start Work', time: '09:00', points: 12, tags: ['area:work'], steps: [], ...over,
  });

  it('selects and flashes the saved row', () => {
    const { page } = render();
    page.openEdit('sw');
    page.onSaved(saved(), false);
    expect(page.selectedId).toBe('sw');
    expect(page.flashId).toBe('sw');
  });

  it('drops the flash again — rn-flash is one-shot', () => {
    jest.useFakeTimers();
    const { page } = render();
    page.openEdit('sw');
    page.onSaved(saved(), false);
    jest.advanceTimersByTime(900);
    expect(page.flashId).toBe('');
    jest.useRealTimers();
  });

  it('toasts the routine\'s own details when nothing else moved', () => {
    const { page } = render();
    page.openEdit('sw');
    page.onSaved(saved(), false);
    expect(page.toast.title).toBe('Routine saved');
    expect(page.toast.sub).toBe('Start Work · 09:00 · +12 pts · 1 tag');
  });

  it('pluralises a single point and several tags (E2E N-3)', () => {
    const { page } = render();
    page.openEdit('sw');
    page.onSaved(saved({ points: 1, tags: ['a', 'b'] }), false);
    expect(page.toast.sub).toBe('Start Work · 09:00 · +1 pt · 2 tags');
  });

  it('titles a create differently', () => {
    const { page } = render();
    page.openNew(null);
    page.onSaved(saved({ id: 'new', name: 'Evening Stretch', time: '19:30' }), true);
    expect(page.toast.title).toBe('Routine added');
  });

  it('names the NEIGHBOUR whose daily task target the new time moved (D-03)', () => {
    const { page } = render();
    page.openEdit('wd');
    // 09:00 -> 11:30 was a 1-slot window for Start Work; pushing Wind Down to
    // 21:30 re-slices it to 6.
    page.onSaved(saved({
      id: 'wd', name: 'Wind Down', time: '21:30', points: 8,
    }), false);
    expect(page.toast.title).toBe('Routine saved');
    expect(page.toast.sub).toContain('Start Work: 1 -> 6');
    expect(page.toast.icon).toBe('schedule');
  });

  it('stays quiet about targets when the edit moves none', () => {
    const { page } = render();
    page.openEdit('sw');
    page.onSaved(saved({ name: 'Deep Work' }), false);
    expect(page.toast.sub).not.toContain('->');
  });

  it('compares against the schedule as it stood when the editor OPENED', () => {
    const { page } = render();
    page.openEdit('wd');
    // A refetch lands while the sheet is open: `items` is now the new list.
    page.onItems(ITEMS.map((r) => (r.id === 'wd' ? { ...r, time: '21:30' } : r)));
    page.onSaved(saved({
      id: 'wd', name: 'Wind Down', time: '21:30', points: 8,
    }), false);
    expect(page.toast.sub).toContain('Start Work: 1 -> 6');
  });

  it('ignores a save that returned nothing', () => {
    const { page } = render();
    page.onSaved(null, false);
    expect(page.toast.title).toBe('');
  });

  it('replays the toast for a repeat of the same message', () => {
    const { page } = render();
    page.openEdit('sw');
    page.onSaved(saved(), false);
    const first = page.toast.seq;
    page.onSaved(saved(), false);
    expect(page.toast.seq).toBe(first + 1);
  });
});

describe('after a delete', () => {
  it('says what stops happening, and clears the selection', () => {
    const { page } = render();
    page.onSelect('sw');
    page.onRemoved({ id: 'sw', name: 'Start Work' });
    expect(page.toast.title).toBe('Routine deleted');
    expect(page.toast.sub).toBe('Start Work no longer earns points');
    expect(page.selectedId).toBe('');
  });

  it('leaves a different selection alone', () => {
    const { page } = render();
    page.onSelect('mp');
    page.onRemoved({ id: 'sw', name: 'Start Work' });
    expect(page.selectedId).toBe('mp');
  });

  it('reports a failure without pretending it worked', () => {
    const { page } = render();
    page.onFailed('Network request failed');
    expect(page.toast.title).toBe("Couldn't save");
    expect(page.toast.sub).toBe('Network request failed');
  });
});

describe('the agent row\'s Manage', () => {
  it('opens the bound agent for editing', () => {
    const agent = { id: 'a1', name: 'PR Summarizer', taskRef: 'sw' };
    const { page } = render('phone', [agent]);
    const openEdit = jest.spyOn(page.$refs.agentForm, 'openEdit');
    page.manageAgent('sw');
    expect(openEdit).toHaveBeenCalledWith(agent);
  });

  it('starts a new agent prefilled with the routine when none is bound', () => {
    const { page } = render();
    const openNew = jest.spyOn(page.$refs.agentForm, 'openNew');
    page.manageAgent('sw');
    expect(openNew).toHaveBeenCalledWith('sw');
  });

  it('does nothing without a routine', () => {
    const { page } = render();
    const openNew = jest.spyOn(page.$refs.agentForm, 'openNew');
    page.manageAgent('');
    expect(openNew).not.toHaveBeenCalled();
  });

  it('toasts the agent write it just made', () => {
    const { page } = render();
    page.onAgentSaved({ id: 'a1', name: 'PR Summarizer' }, true);
    expect(page.toast.title).toBe('Agent created');
    page.onAgentRemoved({ id: 'a1', name: 'PR Summarizer' });
    expect(page.toast.title).toBe('Agent deleted');
  });
});

describe('navigation', () => {
  it('opens the linked year goal by id, and Year Goals when there is none', () => {
    const { page, push } = render();
    page.openYearGoal('g1');
    expect(push).toHaveBeenCalledWith('/year-goals/g1');
    page.openYearGoal('');
    expect(push).toHaveBeenCalledWith('/year-goals');
  });

  it('pushes a nav item\'s route, and never the one already showing', () => {
    const { page, push } = render();
    page.onNavigate('progress', { route: '/progress' });
    expect(push).toHaveBeenCalledWith('/progress');
    push.mockClear();
    page.onNavigate('routines', { route: '/settings' });
    expect(push).not.toHaveBeenCalled();
  });

  it('signs out through the one shared path', () => {
    const { page } = render();
    signOut.mockClear();
    page.onNavigate('logout', { route: '' });
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
