/* eslint-env jest */
/**
 * The year-goal switcher. Three hosts, one list — and the behaviour that matters
 * most is that it stays MOUNTED when hidden, because it is also the page's index
 * (the hero's ‹ › steppers read the ordered goals from it).
 */
const Vue = require('vue');

const YearGoalSwitcher = require('./YearGoalSwitcher.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ROWS = [
  { header: 'BY ROUTINE' },
  {
    id: 'y1',
    title: 'Ship v2 of Routine Notes',
    percent: 83,
    monthsDone: 5,
    routineName: 'Start Work',
    routineTime: '',
    currentMonthBody: 'Launch mobile dashboard',
    currentMonthLabel: 'Sep',
    isActive: true,
    color: '#288bd5',
  },
  {
    id: 'y2',
    title: 'Run a half marathon',
    percent: 33,
    monthsDone: 2,
    routineName: 'Workout',
    routineTime: '',
    currentMonthBody: '',
    currentMonthLabel: 'Sep',
    isActive: false,
    color: '#288bd5',
  },
];

const CHIPS = [
  { key: 'routine', label: 'By routine time', icon: 'schedule' },
  { key: 'progress', label: 'By progress', icon: 'donut_large' },
];

const render = (props = {}) => {
  const events = [];
  const vm = new Vue({
    render: (h) => h(YearGoalSwitcher, {
      props: {
        rows: ROWS,
        sortChips: CHIPS,
        sort: 'routine',
        query: '',
        open: true,
        shell: 'phone',
        year: 2026,
        yearThreshold: 6,
        ...props,
      },
      on: {
        select: (id) => events.push(['select', id]),
        sort: (k) => events.push(['sort', k]),
        query: (q) => events.push(['query', q]),
        close: () => events.push(['close']),
        'open-overview': () => events.push(['open-overview']),
        retry: () => events.push(['retry']),
      },
    }),
  }).$mount();
  return { el: vm.$el, events };
};

describe('OrganismYearGoalSwitcher — staying mounted', () => {
  it('hides rather than unmounts, so the page keeps its ordered goal list', () => {
    const { el } = render({ open: false });
    expect(el.style.display).toBe('none');
    // Still in the DOM: the rows exist, they are simply not shown.
    expect(el.querySelector('[data-testid="year-goal-row-y1"]')).not.toBeNull();
  });

  it('shows itself when the page opens it', () => {
    const { el } = render({ open: true });
    expect(el.style.display).not.toBe('none');
  });

  it('is always on screen in the sidebar, whatever `open` says', () => {
    const { el } = render({ compact: true, open: false });
    expect(el.style.display).not.toBe('none');
  });
});

describe('OrganismYearGoalSwitcher — the overlay per shell', () => {
  it('covers the phone from the bottom', () => {
    const { el } = render({ shell: 'phone' });
    expect(el.className).toContain('rn-ygs--phone');
    expect(el.querySelector('[data-testid="year-goal-switcher-backdrop"]')).not.toBeNull();
    expect(el.querySelector('.rn-ygs__grab')).not.toBeNull();
  });

  it('slides out of the rail on the tablet, with no grab bar to drag', () => {
    const { el } = render({ shell: 'tablet' });
    expect(el.className).toContain('rn-ygs--tablet');
    expect(el.querySelector('.rn-ygs__grab')).toBeNull();
  });

  it('has no overlay at all in the sidebar', () => {
    const { el } = render({ compact: true });
    expect(el.className).toContain('rn-ygs--inline');
    expect(el.querySelector('[data-testid="year-goal-switcher-backdrop"]')).toBeNull();
    expect(el.querySelector('[data-testid="year-goal-search"]')).toBeNull();
    expect(el.querySelector('[data-testid="year-goal-sort-progress"]')).toBeNull();
    expect(el.querySelector('.rn-ygs__heading').textContent.trim()).toBe('YEAR GOALS · 2026');
  });

  it('closes on the backdrop', () => {
    const { el, events } = render();
    el.querySelector('[data-testid="year-goal-switcher-backdrop"]').click();
    expect(events).toEqual([['close']]);
  });
});

describe('OrganismYearGoalSwitcher — the list', () => {
  it('switches goal on a row, rather than linking away', () => {
    const { el, events } = render();
    expect(el.querySelector('a')).toBeNull();
    el.querySelector('[data-testid="year-goal-row-y2"]').click();
    expect(events).toEqual([['select', 'y2']]);
  });

  it('marks the open goal and ticks it', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="year-goal-row-y1"]').className)
      .toContain('rn-ygs__row--active');
    expect(el.querySelector('[data-testid="year-goal-row-y1"] .rn-ygs__check')).not.toBeNull();
    expect(el.querySelector('[data-testid="year-goal-row-y2"] .rn-ygs__check')).toBeNull();
  });

  it('prints an em dash for a routine time the server cannot supply', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="year-goal-row-y1"] .rn-ygs__time').textContent.trim())
      .toBe('—');
  });

  it('subtitles a row with its routine, its months and this month’s goal', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="year-goal-row-y1"] .rn-ygs__sub').textContent)
      .toContain('Start Work · 5/6 months · Sep: Launch mobile dashboard');
  });

  it('says "no goal yet" where this month is empty, not a blank', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="year-goal-row-y2"] .rn-ygs__sub').textContent)
      .toContain('Sep: no goal yet');
  });

  it('renders the group header the model supplied', () => {
    expect(render().el.querySelector('.rn-ygs__group').textContent.trim()).toBe('BY ROUTINE');
  });

  it('marks the live sort chip', () => {
    const { el, events } = render({ sort: 'progress' });
    expect(el.querySelector('[data-testid="year-goal-sort-progress"]').className)
      .toContain('rn-ygs__sort--on');
    el.querySelector('[data-testid="year-goal-sort-routine"]').click();
    expect(events).toEqual([['sort', 'routine']]);
  });

  it('types the search up to the page', () => {
    const { el, events } = render();
    const input = el.querySelector('[data-testid="year-goal-search"]');
    input.value = 'half';
    input.dispatchEvent(new Event('input'));
    expect(events).toEqual([['query', 'half']]);
  });

  it('names the query when nothing matches it', () => {
    const { el } = render({ rows: [{ header: 'BY ROUTINE' }], query: 'zzz' });
    expect(el.querySelector('[data-testid="year-goal-none"]').textContent.trim())
      .toBe('No year goal matches “zzz”');
  });

  it('says a failed read failed, never "No year goals yet.", and offers a retry', () => {
    const { el, events } = render({ rows: [], compact: true, failed: true });
    expect(el.querySelector('[data-testid="year-goal-none"]')).toBeNull();
    expect(el.querySelector('[data-testid="year-goal-failed"]').textContent)
      .toContain("Couldn't load your year goals.");
    el.querySelector('[data-testid="year-goal-retry"]').click();
    expect(events).toEqual([['retry']]);
  });

  it('keeps the rows it already has when a later re-read fails', () => {
    const { el } = render({ failed: true });
    expect(el.querySelector('[data-testid="year-goal-failed"]')).toBeNull();
    expect(el.querySelector('[data-testid="year-goal-row-y1"]')).not.toBeNull();
  });

  it('offers the Goals overview above the goals', () => {
    const { el, events } = render();
    el.querySelector('[data-testid="year-goal-overview"]').click();
    expect(events).toEqual([['open-overview']]);
  });
});
