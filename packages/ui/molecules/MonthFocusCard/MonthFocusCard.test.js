/* eslint-env jest */
/**
 * The focused month card. What it must not do is as important as what it does:
 * a week unfolds IN PLACE — no route change, no dialog — and edit/delete are
 * nowhere on the row, only behind the ⋮.
 */
const Vue = require('vue');

const MonthFocusCard = require('./MonthFocusCard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const STATUS = {
  done: { label: 'Done', color: '#4CAF50', bg: 'rgba(76,175,80,.12)', chipColor: '#2e7d32' },
  active: { label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)', chipColor: '#e68900' },
  inactive: {
    label: 'Inactive', color: 'rgba(0,0,0,.5)', bg: 'rgba(0,0,0,.06)', chipColor: 'rgba(0,0,0,.5)',
  },
};

const day = (id, body, isComplete) => ({
  id, body, isComplete: !!isComplete, dateLabel: 'Mon 7 Sep', isToday: false, dow: 1,
});

const week = (id, body, days, overrides) => ({
  id,
  body,
  week: 37,
  rangeLabel: '6 – 12 Sep',
  days: days || [],
  dots: [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
    key: dow, label: 'M', num: 7 + dow, icon: 'fiber_manual_record', color: '#ccc', size: 8, isToday: false,
  })),
  doneDays: (days || []).filter((d) => d.isComplete).length,
  isComplete: false,
  isCurrent: true,
  canTickByHand: true,
  status: STATUS.active,
  percent: 40,
  barColor: '#FF9800',
  ...overrides,
});

const month = (overrides) => ({
  index: 8,
  name: 'September',
  label: 'Sep',
  isCurrent: true,
  isPast: false,
  goal: { id: 'm9', body: 'Launch mobile dashboard', period: 'month', date: '30-09-2026' },
  weeks: [week('w1', 'Ship the dashboard', [day('d1', 'Scaffold route', true), day('d2', 'Wire query')])],
  weeksDone: 0,
  isComplete: false,
  canTickByHand: true,
  status: STATUS.active,
  percent: 0,
  rule: 'Ticks after 3 week goals · 3 to go',
  ...overrides,
});

const render = (props = {}) => {
  const events = [];
  const vm = new Vue({
    render: (h) => h(MonthFocusCard, {
      props: {
        month: month(),
        openWeekId: '',
        shell: 'phone',
        weekThreshold: 5,
        monthThreshold: 3,
        ...props,
      },
      on: {
        expand: (payload) => events.push(['expand', payload]),
        'tick-week': (payload) => events.push(['tick-week', payload]),
        'tick-day': (payload) => events.push(['tick-day', payload]),
        'tick-month': (payload) => events.push(['tick-month', payload]),
        menu: (payload) => events.push(['menu', payload]),
        'add-day': (payload) => events.push(['add-day', payload]),
        'add-week': (payload) => events.push(['add-week', payload]),
        'add-month': (payload) => events.push(['add-month', payload]),
        'edit-day': (payload) => events.push(['edit-day', payload]),
      },
    }),
  }).$mount();
  return { el: vm.$el, events, vm };
};

describe('MoleculeMonthFocusCard — the month', () => {
  it('shows the month goal, its tally and the one rule line', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="month-focus-body"]').textContent.trim())
      .toBe('Launch mobile dashboard');
    expect(el.querySelector('[data-testid="month-focus-rule"]').textContent.trim())
      .toBe('Ticks after 3 week goals · 3 to go');
    expect(el.textContent).toContain('/ 3 weeks');
  });

  it('says Inactive for a month that is neither done nor current', () => {
    const { el } = render({ month: month({ isCurrent: false, status: STATUS.inactive }) });
    expect(el.querySelector('[data-testid="month-focus-status"]').textContent.trim())
      .toBe('SEPTEMBER · INACTIVE');
  });

  it('puts edit and delete behind the ⋮, not on the row', () => {
    const { el, events } = render();
    expect(el.querySelector('[data-testid="month-focus-menu"]')).toBeTruthy();
    expect(el.textContent).not.toContain('Delete');
    expect(el.textContent).not.toContain('Edit');
    el.querySelector('[data-testid="month-focus-menu"]').click();
    expect(events[0][0]).toBe('menu');
    expect(events[0][1].kind).toBe('month');
  });

  it('offers a month goal where there is none, instead of an empty card', () => {
    const { el, events } = render({ month: month({ goal: null, weeks: [] }) });
    expect(el.querySelector('[data-testid="month-focus-empty"]')).toBeTruthy();
    el.querySelector('[data-testid="add-month-goal"]').click();
    expect(events[0][0]).toBe('add-month');
  });
});

describe('MoleculeMonthFocusCard — weeks expand in place', () => {
  it('hides a week’s days until that week is the open one', () => {
    const { el } = render({ openWeekId: '' });
    expect(el.querySelector('[data-testid="week-days-w1"]')).toBeNull();
    expect(el.querySelector('[data-testid="day-row-d1"]')).toBeNull();
  });

  it('unfolds the days inside the same card — no dialog, no link', () => {
    const { el } = render({ openWeekId: 'w1' });
    const open = el.querySelector('[data-testid="week-days-w1"]');
    expect(open).toBeTruthy();
    // The days live INSIDE the week row's own container, not in an overlay.
    expect(el.querySelector('[data-testid="week-row-w1"]').contains(open)).toBe(true);
    expect(el.querySelector('[data-testid="day-row-d1"]')).toBeTruthy();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('a')).toBeNull();
  });

  it('asks to expand when the row body is tapped, and does not tick', () => {
    const { el, events } = render();
    el.querySelector('[data-testid="week-expand-w1"]').click();
    expect(events).toEqual([['expand', expect.objectContaining({ id: 'w1' })]]);
  });

  it('ticks only from the checkbox', () => {
    const { el, events } = render();
    el.querySelector('[data-testid="week-tick-w1"]').click();
    expect(events[0][0]).toBe('tick-week');
    expect(events[0][1].id).toBe('w1');
  });

  it('ticks a day from its row, carrying the week it belongs to', () => {
    const { el, events } = render({ openWeekId: 'w1' });
    el.querySelector('[data-testid="day-row-d2"]').click();
    expect(events[0][0]).toBe('tick-day');
    expect(events[0][1].day.id).toBe('d2');
    expect(events[0][1].week.id).toBe('w1');
  });

  it('offers "Add day goal" inside the open week and "Add week goal" under the list', () => {
    const { el, events } = render({ openWeekId: 'w1' });
    el.querySelector('[data-testid="add-day-w1"]').click();
    el.querySelector('[data-testid="add-week-goal"]').click();
    expect(events.map((e) => e[0])).toEqual(['add-day', 'add-week']);
  });

  it('says what an empty week still counts toward', () => {
    const { el } = render({
      month: month({ weeks: [week('w1', 'Ship the dashboard', [])] }),
      openWeekId: 'w1',
    });
    expect(el.textContent).toContain("They count toward this week's 5.");
  });

  it('shows the week status chip, Inactive included', () => {
    const { el } = render({
      month: month({
        weeks: [week('w1', 'App store assets', [], { isCurrent: false, status: STATUS.inactive })],
      }),
    });
    expect(el.querySelector('[data-testid="week-status-w1"]').textContent.trim())
      .toBe('Inactive');
  });
});

/**
 * A day goal is a whole goal item, so it has a real editor to open — but the row
 * is already the TICK and the week row is the EXPAND, and neither may be stolen
 * to get there. So the way in is its own glyph, and what is pinned here is that
 * it reaches the editor without reaching anything else.
 */
describe('MoleculeMonthFocusCard — the day row’s edit glyph', () => {
  it('asks to edit the day, carrying the week it belongs to', () => {
    const { el, events } = render({ openWeekId: 'w1' });
    el.querySelector('[data-testid="day-edit-d2"]').click();
    expect(events).toHaveLength(1);
    expect(events[0][0]).toBe('edit-day');
    expect(events[0][1].day.id).toBe('d2');
    expect(events[0][1].week.id).toBe('w1');
  });

  it('does not tick the day it opens — the row tap still owns completion', () => {
    const { el, events } = render({ openWeekId: 'w1' });
    el.querySelector('[data-testid="day-edit-d1"]').click();
    expect(events.map((e) => e[0])).toEqual(['edit-day']);
    expect(events.map((e) => e[0])).not.toContain('tick-day');
  });

  it('does not fold the week it was opened from', () => {
    const { el, events } = render({ openWeekId: 'w1' });
    el.querySelector('[data-testid="day-edit-d1"]').click();
    expect(events.map((e) => e[0])).not.toContain('expand');
  });

  it('leaves the row tap as the tick', () => {
    const { el, events } = render({ openWeekId: 'w1' });
    el.querySelector('[data-testid="day-row-d1"]').click();
    expect(events.map((e) => e[0])).toEqual(['tick-day']);
  });

  it('is a real button, so it is reachable without a pointer', () => {
    const { el } = render({ openWeekId: 'w1' });
    const glyph = el.querySelector('[data-testid="day-edit-d1"]');
    expect(glyph.tagName).toBe('BUTTON');
    expect(glyph.getAttribute('aria-label')).toBe('Edit day goal');
  });

  it('gives it to day rows only — month and week keep edit behind the ⋮', () => {
    const { el } = render({ openWeekId: 'w1' });
    expect(el.querySelectorAll('[data-testid^="day-edit-"]')).toHaveLength(2);
    expect(el.querySelector('[data-testid="week-edit-w1"]')).toBeNull();
    expect(el.querySelector('[data-testid="month-focus-edit"]')).toBeNull();
    // Both ⋮ are still the only way to a month or week goal's actions.
    expect(el.querySelector('[data-testid="month-focus-menu"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="week-menu-w1"]')).toBeTruthy();
  });

  it('is nowhere to be found until the week is unfolded', () => {
    const { el } = render({ openWeekId: '' });
    expect(el.querySelector('[data-testid="day-edit-d1"]')).toBeNull();
  });
});
