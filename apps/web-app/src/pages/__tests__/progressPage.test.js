/* eslint-env jest */
/**
 * ProgressTime — what only the page can get wrong.
 *
 * It composes two containers and otherwise owns three things: which shell it
 * picks, the period in the URL, and where a row goes. The deep link is the one
 * worth guarding: the mock sends every "Needs attention" row to the generic
 * Routines page, but the routine's id is in the data, so a real row has to open
 * that routine (docs/redesign/chassis.md § "Things the mocks get wrong on
 * purpose").
 */
// The page pulls the ui barrels through its containers, which transitively
// import third-party components shipped as raw .vue files in node_modules (jest
// won't transform them). Stub them, plus the native sign-in plugins and the
// gitignored blob config the Log out path reads client ids from.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const Vue = require('vue');

const ProgressTime = require('../ProgressTime.vue').default;

const { computed, methods } = ProgressTime;

const router = () => {
  const pushed = [];
  return {
    pushed,
    $route: { path: '/progress/week' },
    $router: { push: (route) => { pushed.push(route); return Promise.resolve(); } },
  };
};

describe('ProgressTime — the shell', () => {
  const shellFor = (breakpoint) => computed.shell.call({ $vuetify: { breakpoint } });

  it('uses the one breakpoint rule, not a second scheme', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('falls back to the phone when there is no Vuetify at all', () => {
    expect(computed.shell.call({})).toBe('phone');
  });
});

describe('ProgressTime — the period in the URL', () => {
  const sub = (period) => computed.rangeLabel.call({
    today: '12-09-2026',
    safePeriod: computed.safePeriod.call({ period }),
  });

  it('routes a period change instead of holding it in local state', () => {
    const vm = router();
    methods.goPeriod.call({ ...vm, goTo: methods.goTo }, 'month');
    expect(vm.pushed).toEqual(['/progress/month']);
  });

  it('ignores a period the URL invented', () => {
    const vm = router();
    vm.$route.path = '/progress/fortnight';
    methods.goPeriod.call({ ...vm, goTo: methods.goTo }, 'fortnight');
    expect(vm.pushed).toEqual(['/progress/week']);
  });

  it('does not re-push the route already showing', () => {
    const vm = router();
    vm.$route.path = '/progress/month';
    methods.goPeriod.call({ ...vm, goTo: methods.goTo }, 'month');
    expect(vm.pushed).toEqual([]);
  });

  it('subtitles the shell with the window the report covers', () => {
    expect(sub('day')).toBe('Saturday, 12 September');
    expect(sub('week')).toBe('Week of 6 – 12 September');
    expect(sub('month')).toBe('September 2026 · 12 days in');
    expect(sub('year')).toBe('2026 · January – September');
  });
});

describe('ProgressTime — where a row goes', () => {
  it('deep-links an attention row to that routine', () => {
    expect(methods.routineHref({ id: 'abc123' })).toBe('/agenda/tree/abc123');
  });

  it('opens that routine rather than the generic Routines page', () => {
    const vm = router();
    methods.openRoutine.call(
      { ...vm, goTo: methods.goTo, routineHref: methods.routineHref },
      'abc123',
    );
    expect(vm.pushed).toEqual(['/agenda/tree/abc123']);
  });

  it('goes nowhere at all when the card carried no id', () => {
    const vm = router();
    const ctx = { ...vm, goTo: methods.goTo, routineHref: methods.routineHref };
    expect(methods.routineHref(null)).toBe('');
    methods.openRoutine.call(ctx, '');
    expect(vm.pushed).toEqual([]);
  });

  it('keeps the routine history row on /history', () => {
    const vm = router();
    methods.goTo.call(vm, '/history');
    expect(vm.pushed).toEqual(['/history']);
  });
});

describe('ProgressTime — the shell nav', () => {
  it('routes a nav item by its own route', () => {
    const vm = router();
    methods.onNavigate.call({ ...vm, goTo: methods.goTo }, 'goals', { route: '/goals' });
    expect(vm.pushed).toEqual(['/goals']);
  });

  it('sends Log out to signOut, not to a route', () => {
    const vm = router();
    const signedOut = [];
    methods.onNavigate.call(
      { ...vm, goTo: methods.goTo, onSignOut: () => signedOut.push(true) },
      'logout',
      { route: '' },
    );
    expect(vm.pushed).toEqual([]);
    expect(signedOut).toEqual([true]);
  });

  it('marks itself the active nav entry', () => {
    // The shell highlights by nav key; MORE_NAV's Progress entry is 'progress'.
    // eslint-disable-next-line global-require
    const { MORE_NAV } = require('@routine-notes/ui/constants/navigation');
    expect(MORE_NAV.some((item) => item.key === 'progress' && item.route === '/progress')).toBe(true);
  });
});

describe('ProgressTime — mounted', () => {
  // The whole composition, really rendered: shell -> containers -> organism.
  // Without vue-apollo installed the smart queries never run, which is exactly
  // the first-paint state — nothing loaded, nothing invented.
  const mount = (breakpoint, period = 'week') => {
    const Page = Vue.extend(ProgressTime);
    const vm = new Vue({
      data: { name: 'Gaurav', email: 'g@example.com', picture: '' },
      render: (h) => h(Page, { props: { period } }),
    });
    vm.$route = { path: '/progress/week' };
    vm.$router = { push: () => Promise.resolve() };
    vm.$vuetify = { breakpoint };
    Vue.prototype.$route = vm.$route;
    Vue.prototype.$router = vm.$router;
    Vue.prototype.$vuetify = vm.$vuetify;
    return vm.$mount();
  };

  afterEach(() => {
    delete Vue.prototype.$route;
    delete Vue.prototype.$router;
    delete Vue.prototype.$vuetify;
  });

  it('renders the shell, the report and the phone period switch', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.getAttribute('data-testid')).toBe('app-shell');
    expect(el.className).toContain('rn-shell--phone');
    expect(el.querySelector('[data-testid="progress-report"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="shell-topbar"]').textContent).toContain('Progress');
    expect(el.querySelector('[data-testid="shell-topbar"]').textContent)
      .toContain('Week of');
    expect(el.querySelectorAll('[data-testid="sliding-switch"]')).toHaveLength(1);
  });

  it('moves the switch into the shell header on desktop, and only once', () => {
    const el = mount({ xsOnly: false, width: 1440 }).$el;
    const switches = el.querySelectorAll('[data-testid="sliding-switch"]');
    expect(switches).toHaveLength(1);
    expect(el.querySelector('[data-testid="shell-head"]').contains(switches[0])).toBe(true);
  });

  it('says the points balance is unknown rather than printing 0', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    // Nothing has resolved, so the chip must not claim a figure.
    expect(el.querySelector('[data-testid="focus-points-chip"]').textContent).toContain('…');
  });

  it('shows a loading state, not an empty-looking report, before the report lands', () => {
    // BUG-4: "—" plus "No routines scored in this week yet." read as no data.
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="progress-loading"]').textContent)
      .toContain('Loading your week');
    expect(el.querySelector('[data-testid="progress-balance"]')).toBeNull();
    expect(el.querySelector('[data-testid="mini-sparkline"]')).toBeNull();
    expect(el.querySelector('[data-testid="progress-efficiency"]')).toBeNull();
    expect(el.textContent).not.toContain('No routines scored');
    expect(el.querySelector('[data-testid="progress-history-link"]')).not.toBeNull();
  });

  it('selects the Week tab when the URL names a period that does not exist', () => {
    // BUG-5: /progress/foo fell back to week data with no tab selected.
    const el = mount({ xsOnly: false, width: 1440 }, 'foo').$el;
    const selected = Array.from(el.querySelectorAll('[data-testid="sliding-switch-segment"]'))
      .filter((seg) => seg.getAttribute('aria-selected') === 'true')
      .map((seg) => seg.textContent.trim());
    expect(selected).toEqual(['Week']);
  });
});
