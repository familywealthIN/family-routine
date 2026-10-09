/* eslint-env jest */
/**
 * Groups — the /groups page.
 *
 * Rendered for real (the containers are stubbed, because the layout does not
 * depend on Apollo) so the two shell-shaped rules are actually proven: tablet and
 * desktop keep the member panel permanently beside the list, and only phone turns
 * it into a sheet. Plus the 10-member cap, which must count pending invites, and
 * the group switch that accepting an invite has to trigger.
 */
// The chassis shell container owns the points read; the layout does not depend on
// it, so it is stubbed down to the two slots the page fills.
jest.mock('../../containers/AppShellContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'AppShellContainer',
    props: { subtitle: { type: String, default: '' } },
    render(h) {
      return h('div', { attrs: { 'data-testid': 'shell-stub' } }, [
        h('header', this.$slots['header-actions']),
        h('main', this.$slots.default),
      ]);
    },
  },
}));
jest.mock('../../containers/GroupIdentityContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupIdentityContainer',
    methods: { refresh: jest.fn() },
    render() { return null; },
  },
}));
jest.mock('../../containers/GroupMembersContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupMembersContainer',
    props: {
      groupId: { type: String, default: '' },
      full: { type: Boolean, default: false },
      pending: { type: Array, default: () => [] },
    },
    render(h) {
      return h('div', { attrs: { 'data-testid': 'members-stub', 'data-full': String(this.full) } });
    },
  },
}));
jest.mock('../../containers/GroupMemberWeekContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupMemberWeekContainer',
    props: { email: { type: String, default: '' } },
    render(h) { return h('div', { attrs: { 'data-testid': 'week-stub' } }, this.email); },
  },
}));
jest.mock('../../containers/GroupPulseContainer.vue', () => ({
  __esModule: true,
  default: { name: 'GroupPulseContainer', render(h) { return h('div'); } },
}));
jest.mock('../../containers/GroupInviteContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupInviteContainer',
    props: { open: { type: Boolean, default: false }, taken: { type: Array, default: () => [] } },
    render() { return null; },
  },
}));
jest.mock('../../containers/GroupLeaveContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupLeaveContainer',
    props: { open: { type: Boolean, default: false }, othersNames: { type: String, default: '' } },
    render() { return null; },
  },
}));
jest.mock('../../containers/GroupJoinRequestContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupJoinRequestContainer',
    props: { inviterEmail: { type: String, default: '' } },
    render(h) { return h('div', { attrs: { 'data-testid': 'join-stub' } }, this.inviterEmail); },
  },
}));
jest.mock('../../containers/GroupPendingInvitesContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupPendingInvitesContainer',
    methods: { refresh: jest.fn() },
    render() { return null; },
  },
}));
jest.mock('../../containers/GroupInviteCancelContainer.vue', () => ({
  __esModule: true,
  default: {
    name: 'GroupInviteCancelContainer',
    methods: { run: jest.fn(() => Promise.resolve(true)) },
    render() { return null; },
  },
}));
// Pulls Capacitor + localforage; nothing here signs out.
jest.mock('../../utils/signOut', () => ({ __esModule: true, signOut: jest.fn(), default: jest.fn() }));

const Vue = require('vue');

const Groups = require('../FamilyRoutine.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const BREAKPOINTS = {
  phone: { xsOnly: true, width: 412 },
  tablet: { xsOnly: false, width: 1133 },
  desktop: { xsOnly: false, width: 1440 },
};

const ME = { name: 'Alex Morgan', email: 'alex@routine.app', picture: '' };

const roster = (count) => [ME].concat(
  Array.from({ length: count - 1 }, (unused, index) => ({
    name: `Member ${index}`, email: `m${index}@x.com`, picture: '',
  })),
);

const render = (shell = 'phone') => {
  const push = jest.fn(() => Promise.resolve());
  Vue.prototype.$vuetify = { breakpoint: BREAKPOINTS[shell] };
  Vue.prototype.$route = { path: '/groups' };
  Vue.prototype.$router = { push };
  const vm = new Vue({ data: { ...ME }, render: (h) => h(Groups) }).$mount();
  const page = vm.$children[0];
  page.onIdentity({
    me: ME, groupId: 'g1', inviterEmail: '', loaded: true,
  });
  return {
    vm, page, el: vm.$el, push,
  };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  localStorage.clear();
});

describe('Groups — the member panel, beside the list or in a sheet', () => {
  it.each(['tablet', 'desktop'])('%s keeps the panel permanently visible, with no sheet', async (shell) => {
    const { el, page } = render(shell);
    page.onMembers(roster(3));
    await Vue.nextTick();

    expect(q(el, 'groups-detail-pane')).not.toBeNull();
    // Not "a closed sheet" — on these shells there is no sheet host at all.
    expect(q(el, 'groups-detail-sheet')).toBeNull();
    expect(q(el, 'groups-page').className).toContain(`rn-groups__layout--${shell}`);
  });

  it('defaults the panel to somebody else’s week, not your own', async () => {
    const { el, page } = render('tablet');
    page.onMembers(roster(3));
    await Vue.nextTick();

    expect(q(el, 'week-stub').textContent).toBe('m0@x.com');
  });

  it('phone has no side panel and keeps the sheet shut until a row is tapped', async () => {
    const { el, page } = render('phone');
    page.onMembers(roster(3));
    await Vue.nextTick();

    expect(q(el, 'groups-detail-pane')).toBeNull();
    expect(q(el, 'groups-detail-sheet')).toBeNull();

    page.openMember('m0@x.com');
    await Vue.nextTick();

    expect(page.sheet).toBe('member');
    expect(q(el, 'groups-detail-sheet')).not.toBeNull();
    expect(q(el, 'week-stub').textContent).toBe('m0@x.com');
  });

  it('selecting on tablet moves the panel without opening a sheet', async () => {
    const { page } = render('tablet');
    page.onMembers(roster(3));
    page.openMember('m1@x.com');
    await Vue.nextTick();

    expect(page.sheet).toBeNull();
    expect(page.selectedMember.email).toBe('m1@x.com');
  });
});

describe('Groups — the 10-member cap counts pending invites', () => {
  it('opens the invite sheet while there is room', () => {
    const { page } = render();
    page.onMembers(roster(4));

    page.openInvite();

    expect(page.isFull).toBe(false);
    expect(page.sheet).toBe('invite');
  });

  it('is full at eight members plus two sent invites, and says so instead of opening', () => {
    const { page } = render();
    page.onMembers(roster(8));
    page.onInviteSent('a@x.com');
    page.onInviteSent('b@x.com');
    page.sheet = null;

    expect(page.slotsRemaining).toBe(0);
    expect(page.isFull).toBe(true);

    page.openInvite();

    expect(page.sheet).toBeNull();
    expect(page.toast.title).toBe('Group is full');
    expect(page.toast.sub).toBe('10 members max');
  });

  it('dims the header button and relabels the subtitle when full', async () => {
    const { el, page } = render();
    page.onMembers(roster(10));
    await Vue.nextTick();

    expect(q(el, 'groups-invite-button').className).toContain('rn-shell__act--muted');
    expect(page.subLabel).toBe('Group is full · 10 members max');
    expect(q(el, 'members-stub').dataset.full).toBe('true');
  });

  it('frees the slot again once the server cancels a sent invite', async () => {
    const { page } = render();
    page.onMembers(roster(9));
    page.onInviteSent('a@x.com');
    expect(page.isFull).toBe(true);
    const run = jest.fn(() => Promise.resolve(true));
    page.$refs.cancelInvite.run = run;

    await page.cancelInvite(page.pending[0]);

    expect(run).toHaveBeenCalledWith('a@x.com');
    expect(page.pending).toEqual([]);
    expect(page.isFull).toBe(false);
    expect(page.toast.title).toBe('Invite cancelled');
  });

  it('keeps the row and says so when the server refuses the cancel', async () => {
    const { page } = render();
    page.onPending([{
      id: 'a@x.com', email: 'a@x.com', name: '', picture: '',
    }]);
    page.$refs.cancelInvite.run = jest.fn(() => Promise.resolve(false));
    const refresh = jest.spyOn(page, 'refreshPending');

    await page.cancelInvite(page.pending[0]);

    expect(page.pending).toHaveLength(1);
    expect(page.toast.title).toBe('Could not cancel that invite');
    expect(refresh).toHaveBeenCalled();
  });

  it('sends one cancel per invite while it is in flight', async () => {
    const { page } = render();
    page.onPending([{
      id: 'a@x.com', email: 'a@x.com', name: '', picture: '',
    }]);
    const run = jest.fn(() => Promise.resolve(true));
    page.$refs.cancelInvite.run = run;

    await Promise.all([page.cancelInvite(page.pending[0]), page.cancelInvite(page.pending[0])]);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('takes the pending list from the server read, not from this device', () => {
    localStorage.setItem('rn-group-pending:alex@routine.app', JSON.stringify([{ id: 'p1', email: 'stale@x.com' }]));
    const { page } = render();
    expect(page.pending).toEqual([]);

    page.onMembers(roster(2));
    page.onPending([
      {
        id: 'jo@family.com', email: 'jo@family.com', name: 'Jo', picture: '',
      },
    ]);

    expect(page.pending.map((invite) => invite.email)).toEqual(['jo@family.com']);
    expect(page.subLabel).toBe('2 members · 7 spots left');

    // A declined invite drops out of the server's answer, and its slot is freed.
    page.onPending([]);
    expect(page.subLabel).toBe('2 members · 8 spots left');
  });

  it('re-reads the server list after an invite is sent', () => {
    const { page } = render();
    const refresh = jest.spyOn(page, 'refreshPending');

    page.onInviteSent('jo@family.com');

    expect(refresh).toHaveBeenCalled();
    expect(page.pending.map((invite) => invite.email)).toEqual(['jo@family.com']);
  });

  it('counts members and pending invites as already-taken addresses', () => {
    const { page } = render();
    page.onMembers(roster(2));
    page.onInviteSent('jo@family.com');

    expect(page.takenEmails).toEqual(['alex@routine.app', 'm0@x.com', 'jo@family.com']);
  });

  it('drops a pending invite once that person shows up in the roster', () => {
    const { page } = render();
    page.onInviteSent('m0@x.com');
    expect(page.pending).toHaveLength(1);

    page.onMembers(roster(2));

    expect(page.pending).toEqual([]);
  });
});

describe('Groups — the identity read failed', () => {
  const failed = async () => {
    const { el, page } = render();
    page.onIdentity({
      me: {}, groupId: '', inviterEmail: '', loaded: false,
    });
    page.onIdentityFailed();
    await Vue.nextTick();
    return { el, page };
  };

  it('says so instead of claiming "1 member · 9 spots left"', async () => {
    const { el, page } = await failed();

    expect(page.subLabel).toBe('Could not load your group');
    expect(q(el, 'groups-invite-button').className).toContain('rn-shell__act--muted');
  });

  it('does not open the invite sheet, and retries the read instead', async () => {
    const { page } = await failed();
    const refresh = jest.spyOn(page, 'refreshIdentity');

    page.openInvite();

    expect(page.sheet).toBeNull();
    expect(page.toast.title).toBe('Could not load your group');
    expect(refresh).toHaveBeenCalled();
  });

  it('shows an error with Retry instead of member rows or a pulse built on a guess', async () => {
    const { el, page } = await failed();
    // The template binds the method at render, so spy on what it calls.
    const refresh = jest.fn();
    page.$refs.identity.refresh = refresh;

    expect(q(el, 'groups-load-error')).not.toBeNull();
    expect(el.querySelector('.rn-pulse, [data-testid^="group-pulse"]')).toBeNull();
    expect(el.querySelector('[data-testid^="group-member-row"]')).toBeNull();

    q(el, 'groups-load-error').querySelector('.load-error-state__retry').click();
    expect(refresh).toHaveBeenCalled();
  });

  it('recovers once the read lands', async () => {
    const { page } = await failed();
    page.onIdentity({
      me: ME, groupId: 'g1', inviterEmail: '', loaded: true,
    });
    page.onMembers(roster(2));

    expect(page.loadFailed).toBe(false);
    expect(page.subLabel).toBe('2 members · 8 spots left');
  });
});

describe('Groups — your own week', () => {
  it('tells the week panel when the selected member is you', async () => {
    const { page } = render('desktop');
    page.onMembers([ME]);
    await Vue.nextTick();

    expect(page.isMe(page.selectedMember)).toBe(true);
    expect(page.isMe({ email: 'm0@x.com' })).toBe(false);
  });
});

describe('Groups — accepting an invite switches group for real', () => {
  it('clears the old group’s derived state and re-reads the root', () => {
    const { page } = render();
    page.onMembers(roster(3));
    page.onMemberStats({ email: 'm0@x.com', average: 50, todayScore: 20 });
    const refresh = jest.spyOn(page.$refs.identity, 'refresh');

    page.onInviteAccepted({ inviterEmail: 'nina@studio.co', groupId: 'g-new' });

    expect(page.members).toEqual([]);
    expect(page.memberStats).toEqual({});
    expect(page.selectedEmail).toBe('');
    expect(refresh).toHaveBeenCalled();
    expect(page.toast.title).toBe('You joined nina@studio.co’s group');
  });

  it('shows the join request card only while there is one', async () => {
    const { el, page } = render();
    expect(q(el, 'join-stub')).toBeNull();

    page.onIdentity({
      me: ME, groupId: 'g1', inviterEmail: 'nina@studio.co', loaded: true,
    });
    await Vue.nextTick();

    expect(q(el, 'join-stub').textContent).toBe('nina@studio.co');
  });
});

describe('Groups — leaving and the empty state', () => {
  it('asks in the sheet rather than leaving straight from the row', async () => {
    const { el, page } = render();
    await Vue.nextTick();

    q(el, 'groups-leave-button').click();
    await Vue.nextTick();

    expect(page.sheet).toBe('leave');
  });

  it('forgets the group once the mutation reports back', () => {
    const { page } = render();
    page.onMembers(roster(3));
    page.onLeft();

    expect(page.members).toEqual([]);
    expect(page.pending).toEqual([]);
    expect(page.toast.title).toBe('You left the group');
    expect(page.toast.sub).toBe('Your routines and history are unchanged');
  });

  it('offers no Leave row, and says so, when you are in no group', async () => {
    const { el, page } = render();
    page.onIdentity({
      me: ME, groupId: '', inviterEmail: '', loaded: true,
    });
    await Vue.nextTick();

    expect(q(el, 'groups-leave-button')).toBeNull();
    expect(page.subLabel).toBe('You’re not in a group');
  });

  it('names who you stop seeing in the leave sheet', () => {
    const { page } = render();
    page.onMembers([ME, { name: 'Priya Shah', email: 'p@x.com' }]);
    expect(page.othersNames).toBe('Priya');
  });
});

describe('Groups — the shell', () => {
  it('routes the nav through the router, and never to the page it is on', () => {
    const { page, push } = render();

    page.onNavigate('progress', { route: '/progress' });
    expect(push).toHaveBeenCalledWith('/progress');

    push.mockClear();
    page.onNavigate('groups', { route: '/groups' });
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps one clock for every member row', () => {
    const { page } = render();
    expect(typeof page.nowMinutes).toBe('number');
    expect(page.today).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });
});
