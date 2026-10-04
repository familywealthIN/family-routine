/* eslint-env jest */
/**
 * ProfileTime — the whole composition, and what only the page can get wrong.
 *
 * The page owns layout, the shell, the open overlay and the toast; every read and
 * write is a container. So the mount tests are about the six places the design
 * disagrees with shipped data (`docs/redesign/chassis.md` § Conflicts) actually
 * rendering the shipped side, and the unit tests are about the page's own
 * orchestration — the re-read after a mutation, and the session teardown after a
 * delete.
 */
// The page pulls the ui components through its containers, which transitively
// import third-party components shipped as raw .vue files in node_modules (jest
// won't transform them). Stub them, plus the native sign-in plugins and the
// gitignored blob config the Log out path reads client ids from.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const Vue = require('vue');

const { TIMEZONE_OPTIONS, PROFILE_SETTINGS } = require('@routine-notes/ui/constants/settings');
const ProfileTime = require('../ProfileTime.vue').default;

const { computed, methods } = ProfileTime;

const router = () => {
  const pushed = [];
  return {
    pushed,
    $route: { path: '/settings/profile' },
    $router: { push: (route) => { pushed.push(route); return Promise.resolve(); } },
  };
};

describe('ProfileTime — the shell', () => {
  const shellFor = (breakpoint) => computed.shell.call({ $vuetify: { breakpoint } });

  it('uses the one breakpoint rule, not a second scheme', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('falls back to the phone when there is no Vuetify at all', () => {
    expect(computed.shell.call({})).toBe('phone');
  });

  it('straps the header on tablet and desktop only', () => {
    const sub = (shell, extra = {}) => computed.subLabel.call({
      shell, isPhone: shell === 'phone', profileFailed: false, profile: { loaded: true }, ...extra,
    });
    expect(sub('phone')).toBe('');
    expect(sub('desktop')).toBe('Settings, connections and your account');
  });

  it('says a failed read failed rather than looking normal', () => {
    expect(computed.subLabel.call({
      shell: 'desktop', isPhone: false, profileFailed: true, profile: { loaded: false },
    })).toBe("Couldn't load your account");
  });
});

describe('ProfileTime — identity before and after the read', () => {
  const identity = (profile, root = {}) => computed.identity.call({
    profile,
    sessionIdentity: computed.sessionIdentity.call({ $root: { $data: root } }),
  });

  it('uses the profile once it has loaded', () => {
    expect(identity({
      loaded: true, name: 'Server Name', email: 's@x', picture: 'p',
    }, { name: 'Session' }))
      .toEqual({ name: 'Server Name', email: 's@x', picture: 'p' });
  });

  it('falls back to the signed-in session while it has not', () => {
    expect(identity({ loaded: false, name: '' }, { name: 'Session', email: 'a@b', picture: '' }))
      .toEqual({ name: 'Session', email: 'a@b', picture: '' });
  });

  it('renders empty rather than inventing a name when nothing is known', () => {
    expect(identity({ loaded: false }, {})).toEqual({ name: '', email: '', picture: '' });
  });
});

describe('ProfileTime — the shell nav', () => {
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

  it('does not re-push the route already showing', () => {
    const vm = router();
    methods.goTo.call(vm, '/settings/profile');
    expect(vm.pushed).toEqual([]);
  });

  it('marks itself the active nav entry', () => {
    // eslint-disable-next-line global-require
    const { MORE_NAV } = require('@routine-notes/ui/constants/navigation');
    expect(MORE_NAV.some((item) => item.key === 'profile' && item.route === '/settings/profile'))
      .toBe(true);
  });
});

describe('ProfileTime — cross-container orchestration', () => {
  const ctx = (extra = {}) => ({
    toast: { seq: 0 },
    notify: methods.notify,
    ...extra,
  });

  it('asks the read container to re-read after a write', () => {
    const refreshed = [];
    methods.refreshProfile.call({ $refs: { profile: { refresh: () => refreshed.push(true) } } });
    expect(refreshed).toEqual([true]);
  });

  it('survives a re-read before the read container has mounted', () => {
    expect(() => methods.refreshProfile.call({ $refs: {} })).not.toThrow();
  });

  it('toasts the API key instead of the old alert()', () => {
    const vm = ctx();
    methods.onKeyGenerated.call(vm, 'frt_abc', false);
    expect(vm.toast.title).toBe('API key generated');
    expect(vm.toast.sub).toBe('Copy it now and store it safely');

    methods.onKeyGenerated.call(vm, 'frt_def', true);
    expect(vm.toast.title).toBe('API key regenerated');
    expect(vm.toast.sub).toBe('The old key stopped working');
  });

  it('toasts a time-zone save with the zone it saved', () => {
    const vm = ctx();
    methods.onTimezoneSaved.call(vm, '(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk');
    expect(vm.toast.title).toBe('Time zone updated');
    expect(vm.toast.sub).toContain('Tokyo');
  });

  it('bumps the toast sequence so a repeat of the same message replays', () => {
    const vm = ctx();
    methods.onCopied.call(vm, 'Client id');
    methods.onCopied.call(vm, 'Client id');
    expect(vm.toast.seq).toBe(2);
  });

  it('says it could not copy, rather than claiming it did', () => {
    const vm = ctx();
    methods.onCopyFailed.call(vm, 'Client secret');
    expect(vm.toast.title).toBe("Couldn't copy Client secret");
  });
});

describe('ProfileTime — deleting the account', () => {
  it('toasts, then leaves the app entirely', () => {
    jest.useFakeTimers();
    const left = [];
    const vm = {
      deleteOpen: true,
      toast: { seq: 0 },
      notify: methods.notify,
      leaveApp: () => left.push(true),
    };
    methods.onAccountDeleted.call(vm, 'Account removed');

    expect(vm.deleteOpen).toBe(false);
    expect(vm.toast.title).toBe('Account deleted');
    expect(vm.toast.sub).toBe('Account removed');
    expect(left).toEqual([]);

    jest.advanceTimersByTime(2000);
    expect(left).toEqual([true]);
    jest.useRealTimers();
  });

  it('does not leave the app when the delete failed', () => {
    jest.useFakeTimers();
    const left = [];
    const vm = {
      deleteOpen: true, toast: { seq: 0 }, notify: methods.notify, leaveApp: () => left.push(true),
    };
    methods.onDeleteFailed.call(vm, 'Nothing was deleted');

    jest.advanceTimersByTime(5000);
    expect(left).toEqual([]);
    expect(vm.toast.title).toBe("Couldn't delete your account");
    expect(vm.deleteOpen).toBe(false);
    jest.useRealTimers();
  });
});

describe('ProfileTime — mounted', () => {
  // The whole composition, really rendered: shell -> containers -> organisms.
  // Without vue-apollo installed the smart queries never run, which is exactly
  // the first-paint state — nothing loaded, nothing invented.
  const mount = (breakpoint) => {
    const Page = Vue.extend(ProfileTime);
    const vm = new Vue({
      data: { name: 'Gaurav', email: 'g@example.com', picture: '' },
      render: (h) => h(Page),
    });
    vm.$route = { path: '/settings/profile' };
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

  it('renders the chassis shell and every card', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.getAttribute('data-testid')).toBe('app-shell');
    expect(el.className).toContain('rn-shell--phone');
    expect(el.querySelector('[data-testid="shell-topbar"]').textContent).toContain('Profile');
    ['profile-identity', 'profile-time', 'profile-rates', 'connect-ai', 'api-key-card',
      'delete-account'].forEach((testid) => {
      expect(el.querySelector(`[data-testid="${testid}"]`)).not.toBeNull();
    });
  });

  it('drops the yellow read-only banner for locks on the rows themselves', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.textContent).not.toContain('READ ONLY');
    expect(el.querySelectorAll('.rn-mi')).not.toHaveLength(0);
    expect(el.querySelector('[data-testid="profile-week-lock"]').textContent.trim()).toBe('lock');
    expect(el.querySelectorAll('.rn-prates__lock')).toHaveLength(2);
  });

  it('renders the real rates, the real chain and the real timezone list', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="profile-rate-value-D"]').textContent.trim()).toBe('24 h');
    expect(el.querySelector('[data-testid="profile-rate-value-K"]').textContent.trim()).toBe('2 h');
    expect(el.querySelector('[data-testid="profile-rate-value-G"]').textContent.trim()).toBe('25%');

    expect(el.querySelector('[data-testid="profile-rollup-year"]').textContent).toContain('6');
    expect(el.querySelector('[data-testid="profile-rollup-chain"]').textContent).not.toContain('9');
    expect(PROFILE_SETTINGS.autoCheckThreshold.month).toBe(6);

    // Before the profile read lands the zone is unknown: one placeholder, no
    // Asia/Kolkata default dressed up as the user's zone, nothing to pick.
    const options = el.querySelectorAll('[data-testid="profile-timezone"] option');
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('');
    expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(1);
  });

  it('shows the session identity, not an invented name, before the profile loads', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="profile-identity-name"]').textContent.trim()).toBe('Gaurav');
    expect(el.textContent).not.toContain('Routine Notes');
  });

  it('shows Connect AI disconnected, which the design never draws', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="connect-ai-status"]').textContent)
      .toContain('Not connected');
    expect(el.querySelector('[data-testid="connect-ai-value-sec"]').textContent)
      .toContain('frt_secret_');
  });

  it('keeps the delete gate shut until it is opened and typed into', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="delete-account-sheet"]')).toBeNull();
    expect(el.querySelector('[data-testid="delete-account-open"]')).not.toBeNull();
  });

  it('opens the gate on the row, and only on the row', async () => {
    const vm = mount({ xsOnly: true, width: 412 });
    vm.$el.querySelector('[data-testid="delete-account-open"]').click();
    await Vue.nextTick();
    const sheet = vm.$el.querySelector('[data-testid="delete-account-sheet"]');
    expect(sheet).not.toBeNull();
    expect(sheet.querySelector('[data-testid="delete-account-confirm"]').disabled).toBe(true);
  });

  it('says the points balance is unknown rather than printing 0', () => {
    const el = mount({ xsOnly: true, width: 412 }).$el;
    expect(el.querySelector('[data-testid="focus-points-chip"]').textContent).toContain('…');
    // And the identity card draws no chip at all for a balance it cannot read.
    expect(el.querySelector('[data-testid="profile-identity-points"]')).toBeNull();
  });

  it('puts identity first on the phone and in the side column above it', () => {
    const phone = mount({ xsOnly: true, width: 412 }).$el;
    const page = phone.querySelector('[data-testid="profile-page"]');
    expect(page.children[0].getAttribute('data-testid')).toBe('profile-identity');
    expect(page.querySelectorAll('[data-testid="profile-identity"]')).toHaveLength(1);

    const desktop = mount({ xsOnly: false, width: 1440 }).$el
      .querySelector('[data-testid="profile-page"]');
    expect(desktop.className).toContain('rn-profile--desktop');
    expect(desktop.querySelectorAll('[data-testid="profile-identity"]')).toHaveLength(1);
    expect(desktop.querySelector('.rn-profile__side')
      .children[0].getAttribute('data-testid')).toBe('profile-identity');
  });
});
