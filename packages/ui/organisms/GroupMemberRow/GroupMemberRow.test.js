/* eslint-env jest */
/**
 * The member row. What is asserted here is what the design calls out: today's
 * dot is deliberately unlike the other six, a live member gets the pulsing dot,
 * and a pending invite is the same row with none of the scoring furniture.
 */
const Vue = require('vue');

const GroupMemberRow = require('./GroupMemberRow.vue').default;
const { TODAY_DOT_BG } = require('../../constants/groups');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const DOTS = [
  { key: 'd1', title: 'Mon · 90%', bg: '#4CAF50', icon: 'check', isToday: false },
  { key: 'd2', title: 'Tue · 20%', bg: '#e53935', icon: 'close', isToday: false },
  {
    key: 'd3', title: 'Today · still going', bg: TODAY_DOT_BG, icon: '', isToday: true,
  },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(GroupMemberRow, {
      props: {
        name: 'Priya Shah',
        email: 'priya@shah.in',
        color: '#7b5ea7',
        todayScore: 62,
        nowText: 'In Start Work · 3 of 5 done',
        dots: DOTS,
        ...props,
      },
    }),
  }).$mount();
  return { vm, row: vm.$children[0], el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('OrganismGroupMemberRow', () => {
  it('draws today’s dot as a flat blue tint with no icon', () => {
    const { el } = render();
    const dots = testid(el, 'group-member-dots').children;

    expect(dots).toHaveLength(3);
    expect(dots[0].querySelector('.rn-gmrow__dot-icon').textContent).toBe('check');
    expect(dots[2].querySelector('.rn-gmrow__dot-icon')).toBeNull();
    expect(dots[2].style.background).toBe('rgba(40, 139, 213, 0.18)');
    expect(dots[2].className).toContain('rn-gmrow__dot--today');
  });

  it('pulses the 6px orange dot only while the member is in a routine', () => {
    expect(testid(render({ live: true }).el, 'group-member-live')).not.toBeNull();
    expect(testid(render({ live: false }).el, 'group-member-live')).toBeNull();
  });

  it('colours the now line orange while live and grey when not', () => {
    expect(testid(render({ live: true }).el, 'group-member-now').style.color)
      .toBe('rgb(230, 137, 0)');
    expect(testid(render({ live: false }).el, 'group-member-now').style.color)
      .toBe('rgba(0, 0, 0, 0.55)');
  });

  it('badges you, and nobody else', () => {
    expect(testid(render({ you: true }).el, 'group-member-you').textContent).toBe('YOU');
    expect(testid(render().el, 'group-member-you')).toBeNull();
  });

  it('shows today’s score beside the ring, and rings it at that value', () => {
    const { el } = render({ todayScore: 50 });
    expect(testid(el, 'group-member-score').textContent.replace(/\s+/g, ' ').trim())
      .toBe('50% today');
    const arc = testid(el, 'group-member-ring').querySelector('[data-testid="progress-ring-value"]');
    expect(arc.getAttribute('stroke-dasharray')).toBe('138.23');
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(69.12, 1);
  });

  it('opens the member it was given', () => {
    const { row } = render();
    const opened = [];
    row.$on('open', (email) => opened.push(email));
    row.$el.click();
    expect(opened).toEqual(['priya@shah.in']);
  });

  describe('a pending invite', () => {
    const pendingProps = {
      pending: true,
      name: 'jo@family.com',
      email: 'jo@family.com',
      nowText: 'Invite sent · waiting to join',
      dots: [],
    };

    it('has no ring, no dots and no score — it has nothing to score yet', () => {
      const { el } = render(pendingProps);
      expect(testid(el, 'group-member-ring')).toBeNull();
      expect(testid(el, 'group-member-dots')).toBeNull();
      expect(testid(el, 'group-member-score')).toBeNull();
      // The row's own testid says which of the two kinds of row this is.
      expect(el.getAttribute('data-testid')).toBe('group-pending-row');
      expect(render().el.getAttribute('data-testid')).toBe('group-member-row');
    });

    it('shows the grey @ avatar and the waiting line', () => {
      const { el } = render(pendingProps);
      expect(el.querySelector('.rn-gmrow__avatar').textContent.trim()).toBe('@');
      expect(el.querySelector('.rn-gmrow__avatar').style.background).toBe('rgb(189, 189, 189)');
      expect(testid(el, 'group-member-now').textContent.trim())
        .toBe('Invite sent · waiting to join');
    });

    it('offers Cancel, and never opens a week that does not exist', () => {
      const { row, el } = render(pendingProps);
      const events = [];
      row.$on('cancel', () => events.push('cancel'));
      row.$on('open', () => events.push('open'));

      testid(el, 'group-pending-cancel').click();
      row.$el.click();

      expect(events).toEqual(['cancel']);
    });
  });
});
