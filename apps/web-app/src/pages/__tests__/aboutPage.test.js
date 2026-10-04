/* eslint-env jest */
/**
 * AboutTime — five feature tabs, the belief as the hero, and three doors.
 *
 * About holds no server state, so the page's own job is small: the shell, the
 * version it reads, and the router behind "Getting started". The copy decisions
 * are the ones worth guarding at this level — the design's trimmed text wins
 * (`docs/redesign/chassis.md` § Conflicts), and "Home" is the nav's word.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const Vue = require('vue');

const AboutTime = require('../AboutTime.vue').default;
const pkg = require('../../../package.json');

const { computed, methods } = AboutTime;

const router = () => {
  const pushed = [];
  return {
    pushed,
    $route: { path: '/about' },
    $router: { push: (route) => { pushed.push(route); return Promise.resolve(); } },
  };
};

describe('AboutTime — the shell', () => {
  it('uses the one breakpoint rule, not a second scheme', () => {
    const shellFor = (breakpoint) => computed.shell.call({ $vuetify: { breakpoint } });
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
    expect(computed.shell.call({})).toBe('phone');
  });

  it('straps the header on tablet and desktop only', () => {
    expect(computed.subLabel.call({ shell: 'phone' })).toBe('');
    expect(computed.subLabel.call({ shell: 'tablet' }))
      .toBe('Why Routine Notes works the way it does');
  });

  it('marks itself the active nav entry', () => {
    // eslint-disable-next-line global-require
    const { MORE_NAV } = require('@routine-notes/ui/constants/navigation');
    expect(MORE_NAV.some((item) => item.key === 'about' && item.route === '/about')).toBe(true);
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
});

describe('AboutTime — mounted', () => {
  const mount = (breakpoint) => {
    const Page = Vue.extend(AboutTime);
    const vm = new Vue({
      data: { name: 'Gaurav', email: 'g@example.com', picture: '' },
      render: (h) => h(Page),
    });
    vm.$route = { path: '/about' };
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

  const tabs = (el) => Array.from(el.querySelectorAll('[data-testid="sliding-switch-segment"]'));

  it('renders the chassis shell, the hero, the tabs and the three steps', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.getAttribute('data-testid')).toBe('app-shell');
    expect(el.querySelector('[data-testid="shell-topbar"]').textContent).toContain('About');
    expect(el.querySelector('[data-testid="about-hero"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="about-features"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="getting-started"]')).not.toBeNull();
  });

  it('makes the belief the hero line', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="about-belief"]').textContent)
      .toContain('Incremental daily achievement compounds');
  });

  it('reads the real version rather than the mock\'s "Version 2.0 · beta 3"', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="about-version"]').textContent.trim())
      .toBe(`Version ${pkg.version}`);
    expect(el.textContent).not.toContain('beta 3');
  });

  it('offers the five feature tabs, with the underline under the open one', async () => {
    const vm = mount({ xsOnly: true, width: 412 });
    const el = vm.$el;
    expect(tabs(el).map((tab) => tab.textContent.trim()).map((t) => t.replace(/^\w+/, '').trim()))
      .toEqual(['Routines', 'Goals', 'Priority', 'Agents', 'Evolution']);

    const indicator = () => el.querySelector('[data-testid="sliding-switch-indicator"]').style.left;
    expect(indicator()).toBe('calc(0%)');

    tabs(el)[3].click();
    await Vue.nextTick();
    expect(indicator()).toBe('calc(60%)');
    expect(el.querySelector('[data-testid="about-feature-title"]').textContent.trim())
      .toBe('Automation attached to routines');
  });

  it('follows the design in trimming the soldier out of the three points', async () => {
    const vm = mount({ xsOnly: true, width: 412 });
    tabs(vm.$el)[4].click();
    await Vue.nextTick();
    const panel = vm.$el.querySelector('[data-testid="about-feature-panel"]');
    expect(panel.textContent).not.toContain('Picture a soldier');
    expect(panel.textContent).toContain('be present. Tick routines inside their punctuality window');
    // The full analogy is one link away rather than inlined.
    expect(panel.querySelector('[data-testid="about-feature-link"]').getAttribute('href'))
      .toContain('blog.familywealth.in');
  });

  it('says Home, not Dashboard, and six months, not nine', async () => {
    const vm = mount({ xsOnly: true, width: 412 });
    tabs(vm.$el)[1].click();
    await Vue.nextTick();
    const panel = vm.$el.querySelector('[data-testid="about-feature-panel"]');
    expect(panel.textContent).toContain('shows on the Home card');
    expect(panel.textContent).not.toContain('Dashboard');
    expect(panel.textContent).toContain('six months a year');
    expect(panel.textContent).not.toContain('nine months');
  });

  it('routes a getting-started step through the router, not a reload', () => {
    const pushed = [];
    const vm = mount({ xsOnly: true, width: 412 });
    vm.$children[0].$router = { push: (route) => { pushed.push(route); return Promise.resolve(); } };
    vm.$el.querySelector('[data-testid="getting-started-year-goals"]').click();
    expect(pushed).toEqual(['/year-goals']);
  });

  it('splits into two columns on desktop', () => {
    const page = mount({ xsOnly: false, width: 1440 }).$el.querySelector('[data-testid="about-page"]');
    expect(page.className).toContain('rn-about--desktop');
    expect(page.querySelector('.rn-about__main')).not.toBeNull();
    expect(page.querySelector('.rn-about__side')).not.toBeNull();
  });

  it('says the points balance is unknown rather than printing 0', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="focus-points-chip"]').textContent).toContain('…');
  });
});
