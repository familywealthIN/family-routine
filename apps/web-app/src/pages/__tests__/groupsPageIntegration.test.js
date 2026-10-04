/* eslint-env jest */
/**
 * Groups, mounted with every REAL container.
 *
 * The sibling `groupsPage.test.js` stubs the containers to assert the layout
 * rules. This one does the opposite: nothing is stubbed but sign-out, so the whole
 * composition is exercised at once — page -> containers -> organisms.
 *
 * It exists for two defects a stubbed test cannot see:
 *
 *  - **an update loop.** Each member row reports its derived stats upward, the page
 *    writes them into a map, and the roster container reads that map back to order
 *    the rows. That is a real cycle; if any step produced a fresh object on every
 *    read, Vue would spin. The assertion is that no "infinite update loop" warning
 *    is ever emitted.
 *  - **a container that renders nothing.** A missing prop or a mis-shaped
 *    derivation shows up here as an organism that is simply absent.
 *
 * vue-apollo is not installed in the unit environment, so each container's
 * `apollo` option is inert and every read stays at its empty default — which is
 * also the state the page is in on first paint.
 */
// Pulls Capacitor + localforage; nothing here signs out.
jest.mock('../../utils/signOut', () => ({ __esModule: true, signOut: jest.fn(), default: jest.fn() }));

const Vue = require('vue');

const Groups = require('../FamilyRoutine.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ME = { name: 'Alex Morgan', email: 'alex@routine.app', picture: '' };

const mount = (width) => {
  Vue.prototype.$vuetify = { breakpoint: { xsOnly: width < 600, width } };
  Vue.prototype.$route = { path: '/groups' };
  Vue.prototype.$router = { push: jest.fn(() => Promise.resolve()) };
  const vm = new Vue({ data: { ...ME }, render: (h) => h(Groups) }).$mount();
  return { vm, page: vm.$children[0], el: vm.$el };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('Groups — the whole composition', () => {
  let errors;

  beforeEach(() => {
    localStorage.clear();
    errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errors.mockRestore();
  });

  it('renders every part on tablet, and never spins', async () => {
    const { page, el } = mount(1133);
    page.onIdentity({
      me: ME, groupId: 'g1', inviterEmail: 'nina@studio.co', loaded: true,
    });
    await Vue.nextTick();
    await Vue.nextTick();

    expect(q(el, 'group-join-request')).not.toBeNull();
    expect(q(el, 'group-pulse')).not.toBeNull();
    expect(q(el, 'group-member-list')).not.toBeNull();
    // You are in your own list before any read lands, so there is always a row…
    expect(q(el, 'group-member-row')).not.toBeNull();
    // …and therefore always a week to show in the panel beside it.
    expect(q(el, 'group-member-week')).not.toBeNull();
    expect(q(el, 'groups-invite-button')).not.toBeNull();

    const loops = errors.mock.calls.filter((call) => /infinite update loop/i.test(String(call[0])));
    expect(loops).toEqual([]);
  });

  it('reports the pulse honestly before any member week has been read', async () => {
    const { page, el } = mount(412);
    page.onIdentity({
      me: ME, groupId: 'g1', inviterEmail: '', loaded: true,
    });
    await Vue.nextTick();
    await Vue.nextTick();

    // One member (you), nothing ticked yet: 0%, and nobody finished in the hour.
    expect(q(el, 'group-pulse-average').textContent.trim()).toBe('0%');
    expect(q(el, 'group-pulse-recent').textContent.replace(/\s+/g, ' ').trim())
      .toBe('0 of 1 finished a routine in the last hour');
    expect(q(el, 'group-pulse-stack').children).toHaveLength(0);
  });

  it('carries the invite row, and the leave row only while you are in a group', async () => {
    const { page, el } = mount(412);
    page.onIdentity({
      me: ME, groupId: '', inviterEmail: '', loaded: true,
    });
    await Vue.nextTick();

    expect(q(el, 'group-invite-row')).not.toBeNull();
    expect(q(el, 'groups-leave-button')).toBeNull();

    page.onIdentity({
      me: ME, groupId: 'g1', inviterEmail: '', loaded: true,
    });
    await Vue.nextTick();

    expect(q(el, 'groups-leave-button')).not.toBeNull();
  });
});
