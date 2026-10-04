/* eslint-env jest */
/**
 * GoalCalendar — a ring per day, the selected week by default.
 *
 * The two things only this component can get wrong: which seven cells the folded
 * phone view shows, and the ring colour rule (green at 100%, orange for today,
 * blue otherwise, nothing at all for a day that has not happened).
 */
const Vue = require('vue');

const GoalCalendar = require('./GoalCalendar.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

/**
 * September 2026, the month the design draws: two leading blanks (the 1st is a
 * Tuesday), 30 days, padded to 35 cells. Day 12 is today and selected.
 */
const CELLS = (() => {
  const cells = [{ key: 'pad-0', blank: true }, { key: 'pad-1', blank: true }];
  for (let day = 1; day <= 30; day += 1) {
    cells.push({
      key: `d${day}`,
      blank: false,
      day,
      date: `${String(day).padStart(2, '0')}-09-2026`,
      total: day === 11 ? 1 : 2,
      done: day === 11 ? 1 : 1,
      value: day === 11 ? 100 : 50,
      selected: day === 12,
      today: day === 12,
      future: day > 12,
    });
  }
  while (cells.length % 7) cells.push({ key: `tail-${cells.length}`, blank: true });
  return cells;
})();

const render = (props = {}) => {
  const events = {
    day: [], toggle: 0, prev: 0, next: 0,
  };
  const vm = new Vue({
    render: (h) => h(GoalCalendar, {
      props: { monthLabel: 'September 2026', cells: CELLS, ...props },
      on: {
        'select-day': (date) => events.day.push(date),
        toggle: () => { events.toggle += 1; },
        'prev-month': () => { events.prev += 1; },
        'next-month': () => { events.next += 1; },
      },
    }),
  }).$mount();
  return { el: vm.$el, cal: vm.$children[0], events };
};

const days = (el) => Array.from(el.querySelectorAll('[data-testid^="goal-calendar-day-"]'));

describe('GoalCalendar — week versus month', () => {
  it('shows the whole month when it is not collapsible', () => {
    expect(days(render().el).length).toBe(30);
  });

  it('shows only the selected week on the phone until it is pulled open', () => {
    const { el, cal } = render({ collapsible: true });
    expect(cal.visibleCells.filter((cell) => !cell.blank).map((cell) => cell.day))
      .toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(days(el).length).toBe(7);
  });

  it('shows the whole month once it is open', () => {
    const { el } = render({ collapsible: true, expanded: true });
    expect(days(el).length).toBe(30);
  });

  it('labels the toggle with what tapping it gives you', () => {
    const closed = render({ collapsible: true });
    expect(closed.el.querySelector('[data-testid="goal-calendar-toggle"]').textContent).toContain('Month');
    const open = render({ collapsible: true, expanded: true });
    expect(open.el.querySelector('[data-testid="goal-calendar-toggle"]').textContent).toContain('Week');
  });

  it('asks to be pulled open rather than doing it itself', () => {
    const { el, events } = render({ collapsible: true });
    el.querySelector('[data-testid="goal-calendar-toggle"]').click();
    expect(events.toggle).toBe(1);
  });

  it('offers the hint instead of the toggle where the month is always open', () => {
    const { el } = render({ hint: 'Tap a day' });
    expect(el.querySelector('[data-testid="goal-calendar-toggle"]')).toBeNull();
    expect(el.querySelector('.rn-gcal__hint').textContent).toBe('Tap a day');
  });

  it('falls back to the first week when the selection is in another month', () => {
    const cells = CELLS.map((cell) => ({ ...cell, selected: false }));
    const { cal } = render({ collapsible: true, cells });
    expect(cal.visibleCells.filter((cell) => !cell.blank).map((cell) => cell.day)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('GoalCalendar — selecting a day', () => {
  it('loads that day by date, not by day number', () => {
    const { el, events } = render();
    days(el).find((cell) => cell.dataset.testid === 'goal-calendar-day-8').click();
    expect(events.day).toEqual(['08-09-2026']);
  });

  it('ignores the padding cells', () => {
    const { el, events } = render();
    el.querySelector('[data-testid="goal-calendar-pad"]').click();
    expect(events.day).toEqual([]);
  });
});

describe('GoalCalendar — stepping the month', () => {
  it('flanks the month label with a chevron each way', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="goal-calendar-prev"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="goal-calendar-next"]')).not.toBeNull();
    expect(el.querySelector('.rn-gcal__month').textContent).toBe('September 2026');
  });

  it('asks the page to change month rather than changing it itself', () => {
    const { el, events } = render();
    el.querySelector('[data-testid="goal-calendar-prev"]').click();
    el.querySelector('[data-testid="goal-calendar-next"]').click();
    el.querySelector('[data-testid="goal-calendar-next"]').click();
    expect(events).toMatchObject({ prev: 1, next: 2 });
    expect(events.day).toEqual([]);
  });

  /**
   * ARCHITECTURE § 3.7 — the old page locked both buttons behind `isNavigating`
   * while the month read was in flight, which ate every second tap.
   */
  it('never disables the chevrons', () => {
    const { el } = render({ loadError: true });
    expect(el.querySelector('[data-testid="goal-calendar-prev"]').disabled).toBe(false);
    expect(el.querySelector('[data-testid="goal-calendar-next"]').disabled).toBe(false);
  });

  it('keeps them reachable on a month that failed to load, so you can leave it', () => {
    const { el, events } = render({ loadError: true });
    el.querySelector('[data-testid="goal-calendar-next"]').click();
    expect(events.next).toBe(1);
  });
});

describe('GoalCalendar — the ring colour rule', () => {
  const cellAt = (day, overrides = {}) => ({
    key: `d${day}`, blank: false, day, date: `${day}-09-2026`, total: 2, done: 1, value: 50, selected: false, today: false, future: false, ...overrides,
  });
  const cal = () => render().cal;

  it('fills a finished day green', () => {
    expect(cal().ringColor(cellAt(11, { value: 100 }))).toBe('#4CAF50');
  });

  it('paints today orange while it is still in progress', () => {
    expect(cal().ringColor(cellAt(12, { today: true }))).toBe('#FF9800');
  });

  it('paints a past day blue', () => {
    expect(cal().ringColor(cellAt(10))).toBe('#288bd5');
  });

  it('draws no arc at all for a day that has not happened', () => {
    expect(cal().ringColor(cellAt(20, { future: true, value: 0 }))).toBe('transparent');
  });

  it('inverts the selected day — white arc on the brand fill', () => {
    const selected = cellAt(12, { selected: true, today: true });
    expect(cal().ringColor(selected)).toBe('#fff');
    expect(cal().fillColor(selected)).toBe('#288bd5');
    expect(cal().numStyle(selected).color).toBe('#fff');
  });

  it('hides the track on a day with nothing planned', () => {
    expect(cal().trackColor(cellAt(5, { total: 0, value: 0 }))).toBe('transparent');
    expect(cal().trackColor(cellAt(5, { total: 1 }))).toBe('rgba(0,0,0,.08)');
  });

  it('bolds today and the selection, and greys the future', () => {
    expect(cal().numStyle(cellAt(12, { today: true })).fontWeight).toBe(700);
    expect(cal().numStyle(cellAt(10)).fontWeight).toBe(500);
    expect(cal().numStyle(cellAt(20, { future: true })).color).toBe('rgba(0,0,0,.45)');
  });
});

describe('GoalCalendar — error is not an empty month (D-10)', () => {
  it('says the month could not be loaded instead of drawing thirty blank rings', () => {
    const { el } = render({ loadError: true });
    expect(el.querySelector('[data-testid="goal-calendar-error"]').textContent)
      .toContain('nothing has been deleted');
    expect(days(el).length).toBe(0);
  });

  it('offers a Retry that asks the container to read the month again', () => {
    const { el, cal } = render({ loadError: true });
    const retries = [];
    cal.$on('retry', () => retries.push(true));
    el.querySelector('[data-testid="goal-calendar-retry"]').click();
    expect(retries).toEqual([true]);
  });

  it('draws the grid as usual when the month did load', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="goal-calendar-error"]')).toBeNull();
    expect(days(el).length).toBe(30);
  });
});
