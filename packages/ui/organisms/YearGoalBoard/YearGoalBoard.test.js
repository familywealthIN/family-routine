/* eslint-env jest */
/**
 * The board's per-shell layout. Phone is one column that scrolls with the page;
 * tablet and desktop split the focus card from the chat panel and give each its
 * own scroll and composer (380px / 420px — Year Goals.dc.html).
 *
 * The thread itself arrives through a slot, because it is the same organism Home
 * mounts and this page does not own a second one.
 */
const Vue = require('vue');

const YearGoalBoard = require('./YearGoalBoard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const STATUS = {
  active: {
    label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)', chipColor: '#e68900',
  },
};

const MONTH = {
  index: 8,
  name: 'September',
  label: 'Sep',
  isCurrent: true,
  isPast: false,
  goal: {
    id: 'm9', body: 'Launch mobile dashboard', period: 'month', date: '30-09-2026',
  },
  weeks: [],
  weeksDone: 1,
  isComplete: false,
  canTickByHand: true,
  status: STATUS.active,
  percent: 33,
  rule: 'Ticks after 3 week goals · 2 to go',
};

const GOAL = {
  id: 'y1',
  body: 'Ship v2 of Routine Notes',
  about: ['Rebuild around the routine you are in.'],
  year: 2026,
  monthsDone: 5,
  percent: 83,
  isComplete: false,
  ringColor: '#288bd5',
  routineName: 'Start Work',
  status: STATUS.active,
  rule: 'Ticks after 6 month goals · 1 to go',
  months: [MONTH],
};

const TILES = [{
  key: 8,
  index: 8,
  label: 'Sep',
  name: 'September',
  selected: true,
  isCurrent: true,
  title: 'September: Launch mobile dashboard',
  bodyText: 'Launch mobile dashboard',
  labelColor: '#e68900',
  labelWeight: 700,
  state: 'active',
  ringColor: '#FF9800',
  ringValue: 33,
  track: 'rgba(0,0,0,.08)',
  trackDash: null,
  fill: 'transparent',
  icon: '',
  iconColor: 'rgba(0,0,0,.3)',
  text: '1/3',
}];

const render = (props = {}) => {
  const events = [];
  const vm = new Vue({
    render: (h) => h(YearGoalBoard, {
      props: {
        goal: GOAL,
        tiles: TILES,
        month: MONTH,
        openWeekId: '',
        shell: 'phone',
        thresholds: { week: 5, month: 3, year: 6 },
        indexLabel: '3 of 7',
        hasPrev: true,
        hasNext: true,
        chatSubline: 'September · 1/3 weeks · year 83%',
        ...props,
      },
      on: {
        'select-month': (i) => events.push(['select-month', i]),
        step: (d) => events.push(['step', d]),
        'open-switcher': () => events.push(['open-switcher']),
        'tick-week': (w) => events.push(['tick-week', w]),
        'tick-day': (p) => events.push(['tick-day', p]),
        'edit-day': (p) => events.push(['edit-day', p]),
      },
    }, [
      h('div', { slot: 'chat', attrs: { 'data-testid': 'slot-chat' } }, 'thread'),
      h('div', { slot: 'composer', attrs: { 'data-testid': 'slot-composer' } }, 'composer'),
    ]),
  }).$mount();
  return { el: vm.$el, events };
};

describe('OrganismYearGoalBoard — the phone', () => {
  it('stacks hero, strip, focus card and thread in one column', () => {
    const { el } = render({ shell: 'phone' });
    expect(el.className).toContain('rn-ygb--phone');
    const order = ['year-goal-hero', 'year-month-strip', 'month-focus-card', 'slot-chat'];
    const positions = order.map((id) => Array.prototype.indexOf.call(
      el.querySelectorAll('*'),
      el.querySelector(`[data-testid="${id}"]`),
    ));
    expect(positions).toEqual(positions.slice().sort((a, b) => a - b));
    expect(positions.every((p) => p >= 0)).toBe(true);
  });

  it('has no chat panel of its own — the thread is in the body', () => {
    const { el } = render({ shell: 'phone' });
    expect(el.querySelector('[data-testid="year-goal-chat-panel"]')).toBeNull();
  });

  it('sticks the composer to the bottom of the page’s own scroller', () => {
    const { el } = render({ shell: 'phone' });
    const host = el.querySelector('.rn-ygb__composer-phone');
    expect(host.querySelector('[data-testid="slot-composer"]')).not.toBeNull();
    // Not a second scroller: the shell body already scrolls.
    expect(el.querySelector('.rn-ygb__scroll')).toBeNull();
  });

  it('offers the ‹ › steppers and the routine chip only here', () => {
    const { el, events } = render({ shell: 'phone' });
    el.querySelector('[data-testid="year-goal-next"]').click();
    el.querySelector('[data-testid="year-goal-routine-chip"]').click();
    expect(events).toEqual([['step', 1], ['open-switcher']]);
  });
});

describe('OrganismYearGoalBoard — tablet and desktop', () => {
  it('puts the strip inside the hero band, beside the ring', () => {
    const { el } = render({ shell: 'tablet' });
    const hero = el.querySelector('[data-testid="year-goal-hero"]');
    expect(hero.querySelector('[data-testid="year-month-strip"]')).not.toBeNull();
    expect(hero.querySelector('.rn-ygh__divider')).not.toBeNull();
  });

  it('splits the focus card from the chat panel, each with its own scroll', () => {
    const { el } = render({ shell: 'desktop' });
    const cols = el.querySelector('.rn-ygb__cols');
    expect(cols.querySelector('.rn-ygb__left')).not.toBeNull();
    const panel = el.querySelector('[data-testid="year-goal-chat-panel"]');
    expect(panel).not.toBeNull();
    expect(panel.querySelector('.rn-ygb__panel-body [data-testid="slot-chat"]')).not.toBeNull();
    expect(panel.querySelector('.rn-ygb__panel-foot [data-testid="slot-composer"]')).not.toBeNull();
  });

  it('runs the panel 380px on the tablet and 420px on the desktop', () => {
    expect(render({ shell: 'tablet' }).el
      .querySelector('[data-testid="year-goal-chat-panel"]').style.flexBasis).toBe('380px');
    expect(render({ shell: 'desktop' }).el
      .querySelector('[data-testid="year-goal-chat-panel"]').style.flexBasis).toBe('420px');
  });

  it('heads the panel with what the conversation is about', () => {
    const { el } = render({ shell: 'tablet' });
    const panel = el.querySelector('[data-testid="year-goal-chat-panel"]');
    expect(panel.querySelector('.rn-ygb__panel-title').textContent.trim())
      .toBe('Chat with this goal');
    expect(panel.querySelector('.rn-ygb__panel-sub').textContent.trim())
      .toBe('September · 1/3 weeks · year 83%');
  });

  it('drops the phone-only steppers, which the shelf and sidebar replace', () => {
    const { el } = render({ shell: 'tablet' });
    expect(el.querySelector('[data-testid="year-goal-next"]')).toBeNull();
    expect(el.querySelector('[data-testid="year-goal-routine-chip"]')).toBeNull();
  });
});

describe('OrganismYearGoalBoard — the hero numbers', () => {
  it('shows the percentage and the month tally the model computed', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="year-goal-percent"]').textContent.trim()).toBe('83%');
    expect(el.querySelector('[data-testid="year-goal-count"]').textContent.trim())
      .toBe('5/6 months');
  });

  it('shows exactly one rule line under the ring', () => {
    const { el } = render();
    expect(el.querySelectorAll('[data-testid="year-goal-rule"]')).toHaveLength(1);
    expect(el.querySelector('[data-testid="year-goal-rule"]').textContent.trim())
      .toBe('Ticks after 6 month goals · 1 to go');
  });

  it('sizes the hero ring per shell — 120 / 80 / 100 at r42', () => {
    const ring = (shell) => render({ shell }).el.querySelector('.rn-ygh__ring');
    expect(ring('phone').style.width).toBe('120px');
    expect(ring('tablet').style.width).toBe('80px');
    expect(ring('desktop').style.width).toBe('100px');
    expect(render().el.querySelector('[data-testid="progress-ring-value"]').getAttribute('r'))
      .toBe('42');
  });

  it('keeps the about bullets collapsed until asked', () => {
    expect(render().el.querySelector('[data-testid="year-goal-about"]')).toBeNull();
    expect(render({ aboutOpen: true }).el.querySelector('[data-testid="year-goal-about"]')
      .textContent).toContain('Rebuild around the routine you are in.');
  });
});

/** A week with one day goal in it, for the row events the focus card raises. */
const WEEK = {
  id: 'w1',
  body: 'Ship the dashboard',
  week: 37,
  rangeLabel: '6 - 12 Sep',
  days: [{
    id: 'd1', body: 'Write release notes', isComplete: false, dateLabel: 'Mon 7 Sep', isToday: false, dow: 1,
  }],
  dots: [],
  doneDays: 0,
  isComplete: false,
  isCurrent: true,
  canTickByHand: true,
  status: STATUS.active,
  percent: 0,
  barColor: '#FF9800',
};

/**
 * The board owns no row behaviour: it forwards whatever the focus card raises
 * (`v-on="$listeners"`), so the page is what decides what a row tap means. The
 * day row's edit glyph has to arrive the same way the tick does, or the editor is
 * unreachable from the one screen that draws day goals.
 */
describe('OrganismYearGoalBoard - row events reach the page', () => {
  const withDays = () => render({ month: { ...MONTH, weeks: [WEEK] }, openWeekId: 'w1' });

  it('forwards the day row edit glyph', () => {
    const { el, events } = withDays();
    el.querySelector('[data-testid="day-edit-d1"]').click();
    expect(events).toEqual([['edit-day', expect.objectContaining({ day: expect.objectContaining({ id: 'd1' }) })]]);
  });

  it('still forwards the day tick, which the glyph must not steal', () => {
    const { el, events } = withDays();
    el.querySelector('[data-testid="day-row-d1"]').click();
    expect(events.map((e) => e[0])).toEqual(['tick-day']);
  });
});
