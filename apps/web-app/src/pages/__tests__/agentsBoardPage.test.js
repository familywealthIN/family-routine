/* eslint-env jest */
/**
 * AgentsBoard — the /agents page.
 *
 * The layout rule is the one worth rendering for: **tablet and desktop show the
 * list and the detail side by side in a 2:3 split, with the detail pane always
 * mounted; only phone turns the detail into a sheet.** A page that quietly used
 * the sheet on a 1133px iPad would look finished and be wrong.
 *
 * Also covered: the selection self-heals when the selected agent disappears, and
 * a failed load is never reported in the header as "0 agents" (D-10).
 */
// The containers own Apollo and the store; the layout does not depend on either.
// AppShellContainer owns the header's xpBalance read; the layout under it does
// not care, so it is reduced to its two slots.
jest.mock('../../containers/AppShellContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'AppShellContainer',
    render(h) {
      return h('div', [this.$slots['header-actions'], this.$slots.default]);
    },
  },
}));
jest.mock('../../containers/AgentsListContainer.vue', () => ({
  __esModule: true,
  default: { name: 'AgentsListContainer', render() {} },
}));
jest.mock('../../containers/AgentDetailContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'AgentDetailContainer',
    props: { agentId: { type: String, default: '' } },
    render(h) { return h('div', { attrs: { 'data-testid': 'detail-stub' } }, this.agentId); },
  },
}));
jest.mock('../../containers/AgentFormContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'AgentFormContainer',
    methods: { openNew: jest.fn(), openEdit: jest.fn() },
    render() {},
  },
}));
// Pulls Capacitor + localforage; nothing here signs out.
jest.mock('../../utils/signOut', () => ({ __esModule: true, signOut: jest.fn(), default: jest.fn() }));

const Vue = require('vue');

const AgentsBoard = require('../AgentsBoard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const BREAKPOINTS = {
  phone: { xsOnly: true, width: 412 },
  tablet: { xsOnly: false, width: 1133 },
  desktop: { xsOnly: false, width: 1440 },
};

const render = (shell = 'tablet') => {
  const push = jest.fn(() => Promise.resolve());
  const vm = new Vue({
    data: { name: 'Alex Morgan', email: 'alex@routine.app', picture: '' },
    render: (h) => h(AgentsBoard),
  });
  vm.$vuetify = { breakpoint: BREAKPOINTS[shell] };
  vm.$route = { path: '/agents' };
  vm.$router = { push };
  // The page reads $vuetify/$route/$router off itself; children inherit them.
  Vue.prototype.$vuetify = { breakpoint: BREAKPOINTS[shell] };
  Vue.prototype.$route = { path: '/agents' };
  Vue.prototype.$router = { push };
  Vue.prototype.$agent = { agents: [{ id: 'a1', name: 'PR Summarizer', taskRef: 'r1' }] };
  vm.$mount();
  return {
    vm, el: vm.$el, page: vm.$children[0], push,
  };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('AgentsBoard — list + detail vs sheet', () => {
  it.each(['tablet', 'desktop'])('%s renders the detail pane beside the list, with no sheet', async (shell) => {
    const { el, page } = render(shell);
    page.onSummary({
      count: 1, live: 0, error: false, ids: ['a1'],
    });
    await Vue.nextTick();
    expect(q(el, 'agents-detail-pane')).not.toBeNull();
    // Not "a closed sheet" — there is no sheet host on these shells at all.
    expect(q(el, 'agents-detail-sheet')).toBeNull();
    expect(q(el, 'agents-page').className).toContain(`rn-agents--${shell}`);
  });

  it('tablet and desktop select the first agent so the pane is never empty', () => {
    const { page } = render('tablet');
    page.onSummary({
      count: 2, live: 0, error: false, ids: ['a1', 'a2'],
    });
    expect(page.selectedId).toBe('a1');
  });

  it('phone renders no side pane and keeps the sheet shut until a card is tapped', async () => {
    const { el, page } = render('phone');
    page.onSummary({
      count: 1, live: 0, error: false, ids: ['a1'],
    });
    await Vue.nextTick();
    expect(q(el, 'agents-detail-pane')).toBeNull();
    expect(page.selectedId).toBe('');
    expect(el.querySelector('[data-testid="responsive-sheet"]')).toBeNull();

    page.select('a1');
    await Vue.nextTick();
    expect(page.detailOpen).toBe(true);
    expect(el.querySelector('[data-testid="responsive-sheet"]')).not.toBeNull();
    expect(q(el, 'detail-stub').textContent).toBe('a1');
  });

  it('closes the phone sheet again', async () => {
    const { page } = render('phone');
    page.select('a1');
    page.closeDetail();
    await Vue.nextTick();
    expect(page.detailOpen).toBe(false);
  });

  it('selecting on tablet does not open a sheet', () => {
    const { page } = render('tablet');
    page.select('a1');
    expect(page.detailOpen).toBe(false);
  });
});

describe('AgentsBoard — selection self-healing', () => {
  it('moves to the first remaining agent when the selected one is deleted', () => {
    const { page } = render('desktop');
    page.onSummary({
      count: 2, live: 0, error: false, ids: ['a1', 'a2'],
    });
    page.select('a2');
    page.onSummary({
      count: 1, live: 0, error: false, ids: ['a1'],
    });
    expect(page.selectedId).toBe('a1');
  });

  it('empties the selection when the last agent goes', () => {
    const { page } = render('desktop');
    page.onSummary({
      count: 1, live: 0, error: false, ids: ['a1'],
    });
    page.onSummary({
      count: 0, live: 0, error: false, ids: [],
    });
    expect(page.selectedId).toBe('');
  });

  it('keeps a still-valid selection untouched', () => {
    const { page } = render('desktop');
    page.onSummary({
      count: 2, live: 0, error: false, ids: ['a1', 'a2'],
    });
    page.select('a2');
    page.onSummary({
      count: 2, live: 1, error: false, ids: ['a1', 'a2'],
    });
    expect(page.selectedId).toBe('a2');
  });

  it('closes the phone sheet when the open agent disappears', () => {
    const { page } = render('phone');
    page.select('a1');
    page.onSummary({
      count: 0, live: 0, error: false, ids: [],
    });
    expect(page.selectedId).toBe('');
    expect(page.detailOpen).toBe(false);
  });
});

describe('AgentsBoard — header subtitle', () => {
  it('counts the agents and the live ones', () => {
    const { page } = render('tablet');
    page.onSummary({
      count: 4, live: 2, error: false, ids: ['a1'],
    });
    expect(page.subLabel).toBe('4 agents · 2 live now');
  });

  it('says agent, singular, for one', () => {
    const { page } = render('tablet');
    page.onSummary({
      count: 1, live: 0, error: false, ids: ['a1'],
    });
    expect(page.subLabel).toBe('1 agent · 0 live now');
  });

  // D-10 again: a failed load is not "you have no agents".
  it('reports a failed load instead of claiming zero agents', () => {
    const { page } = render('tablet');
    page.onSummary({
      count: 0, live: 0, error: true, ids: [],
    });
    expect(page.subLabel).toBe("Couldn't load your agents");
  });
});

describe('AgentsBoard — toasts', () => {
  it('always pairs a title with the consequence, and bumps the replay key', () => {
    const { page } = render('tablet');
    page.onSaved({ id: 'a1', name: 'PR Summarizer', routineName: 'Start Work' }, true);
    expect(page.toast).toMatchObject({ title: 'Agent created', sub: 'Runs with Start Work', seq: 1 });

    page.onSaved({ id: 'a1', name: 'PR Summarizer' }, false);
    expect(page.toast).toMatchObject({ title: 'Agent saved', sub: 'PR Summarizer', seq: 2 });

    page.onRemoved({ id: 'a1', name: 'PR Summarizer' });
    expect(page.toast).toMatchObject({ title: 'Agent deleted', seq: 3 });
    expect(page.toast.sub).toContain('no longer fires events');

    page.onFailed('An agent already exists for this routine');
    expect(page.toast).toMatchObject({ title: "Couldn't save agent", seq: 4 });
  });

  it('names the routine the container resolved, never the raw routine id', () => {
    const { page } = render('tablet');
    page.onSaved({ id: 'a1', name: 'PR', taskRef: '6ac1795a52f4816f4ce3da9a' }, true, '06:00 Review payment');
    expect(page.toast.sub).toBe('Runs with 06:00 Review payment');
    page.onSaved({ id: 'a1', name: 'PR', taskRef: '6ac1795a52f4816f4ce3da9a' }, true, '');
    expect(page.toast.sub).toBe('Runs with its routine');
  });

  it('selects the agent it just saved', () => {
    const { page } = render('tablet');
    page.onSaved({ id: 'a9', name: 'New' }, true);
    expect(page.selectedId).toBe('a9');
  });
});

describe('AgentsBoard — shell plumbing', () => {
  it('routes a nav emit and ignores the page it is already on', () => {
    const { page, push } = render('desktop');
    page.onNavigate('goals', { key: 'goals', route: '/goals' });
    expect(push).toHaveBeenCalledWith('/goals');
    push.mockClear();
    page.onNavigate('agents', { key: 'agents', route: '/agents' });
    expect(push).not.toHaveBeenCalled();
  });

  it('opens the focus home for "Open routine"', () => {
    const { page, push } = render('desktop');
    page.openRoutine('r1');
    expect(push).toHaveBeenCalledWith('/home');
  });

  it('resolves exactly three shells from the one breakpoint rule', () => {
    expect(render('phone').page.shell).toBe('phone');
    expect(render('tablet').page.shell).toBe('tablet');
    expect(render('desktop').page.shell).toBe('desktop');
  });
});
