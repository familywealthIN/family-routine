/* eslint-env jest */
/**
 * The members card. Two things are asserted: a sent invite renders as a row
 * inside the list (not a separate section), and when the group is full the
 * in-list invite row dims and relabels rather than disappearing.
 */
const Vue = require('vue');

const GroupMemberList = require('./GroupMemberList.vue').default;
const { FULL_LABEL, INVITE_LABEL } = require('../../constants/groups');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}, children = null) => {
  const vm = new Vue({
    render: (h) => h(GroupMemberList, { props }, children ? children(h) : undefined),
  }).$mount();
  return { vm, list: vm.$children[0], el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('OrganismGroupMemberList', () => {
  it('heads the card the way the design does', () => {
    const { el } = render();
    expect(el.querySelector('.rn-gmlist__eyebrow').textContent).toBe('MEMBERS · TODAY');
    expect(el.querySelector('.rn-gmlist__hint').textContent).toBe('Last 7 days');
  });

  it('renders the member rows it is handed through its slot', () => {
    const { el } = render({}, (h) => [h('div', { attrs: { 'data-testid': 'slotted' } }, 'Priya')]);
    expect(testid(el, 'slotted').textContent).toBe('Priya');
  });

  it('renders a sent invite as a row inside the list', () => {
    const { el } = render({ pending: [{ id: 'p1', email: 'jo@family.com' }] });
    const row = testid(el, 'group-pending-row');

    expect(row).not.toBeNull();
    expect(row.textContent).toContain('jo@family.com');
    expect(row.textContent).toContain('Invite sent · waiting to join');
  });

  it('passes a cancelled invite back up with the invite it belongs to', () => {
    const invite = { id: 'p1', email: 'jo@family.com' };
    const { list, el } = render({ pending: [invite] });
    const cancelled = [];
    list.$on('cancel-invite', (value) => cancelled.push(value));

    testid(el, 'group-pending-cancel').click();

    expect(cancelled).toEqual([invite]);
  });

  it('invites from the in-list row', () => {
    const { list, el } = render();
    const events = [];
    list.$on('invite', () => events.push('invite'));
    testid(el, 'group-invite-row').click();
    expect(events).toEqual(['invite']);
  });

  it('dims and relabels the invite row when the group is full', () => {
    const open = testid(render().el, 'group-invite-row');
    expect(open.textContent).toContain(INVITE_LABEL);
    expect(open.className).not.toContain('--full');

    const full = testid(render({ full: true }).el, 'group-invite-row');
    expect(full.textContent).toContain(FULL_LABEL);
    expect(full.className).toContain('rn-gmlist__invite--full');
  });

  it('still emits from the full row, so the page can say why', () => {
    const { list, el } = render({ full: true });
    const events = [];
    list.$on('invite', () => events.push('invite'));
    testid(el, 'group-invite-row').click();
    expect(events).toEqual(['invite']);
  });

  it('says the group is empty instead of leaving a gap', () => {
    expect(testid(render({ empty: true }).el, 'group-member-list-empty')).not.toBeNull();
    expect(testid(render().el, 'group-member-list-empty')).toBeNull();
  });
});
