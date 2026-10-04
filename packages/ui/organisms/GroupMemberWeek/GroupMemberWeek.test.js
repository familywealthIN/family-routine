/* eslint-env jest */
/**
 * The member week grid (routines x days).
 *
 * The assertion that matters: a `later` cell — a routine today that has not been
 * reached — is drawn transparent with a dashed outline and NO tick, so it cannot
 * be read as a miss. The missed cell beside it is the control.
 */
const Vue = require('vue');

const GroupMemberWeek = require('./GroupMemberWeek.vue').default;
const { WEEK_CELL } = require('../../constants/groups');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const cell = (state, overrides = {}) => ({
  key: `c-${state}-${overrides.key || ''}`,
  state,
  missed: state === 'missed',
  title: `Lunch Walk · Today · ${state}`,
  bg: { done: WEEK_CELL.doneBg, missed: WEEK_CELL.missedBg, later: WEEK_CELL.laterBg }[state],
  ring: state === 'later' ? WEEK_CELL.noRing : WEEK_CELL.todayRing,
  icon: state === 'done' ? 'check' : '',
  ...overrides,
});

const PROPS = {
  name: 'Priya Shah',
  email: 'priya@shah.in',
  color: '#7b5ea7',
  streak: 14,
  weekAverage: 86,
  todayScore: 40,
  dayHeads: [
    { key: 'h1', label: 'Fri', isToday: false, color: 'rgba(0,0,0,.45)' },
    { key: 'h2', label: 'Today', isToday: true, color: '#288bd5' },
  ],
  rows: [
    {
      key: '09:00|Start Work',
      name: 'Start Work',
      time: '09:00',
      cells: [cell('done', { key: 'a' }), cell('missed', { key: 'b' })],
    },
    {
      key: '12:30|Lunch Walk',
      name: 'Lunch Walk',
      time: '12:30',
      cells: [cell('done', { key: 'c' }), cell('later', { key: 'd' })],
    },
  ],
  dayTotals: [
    { key: 't1', value: '100%', color: '#4CAF50' },
    { key: 't2', value: '40%', color: '#FF9800' },
  ],
};

const render = (props = {}) => {
  const vm = new Vue({ render: (h) => h(GroupMemberWeek, { props: { ...PROPS, ...props } }) }).$mount();
  return { vm, week: vm.$children[0], el: vm.$el };
};

const cells = (el) => Array.from(el.querySelectorAll('.rn-gmweek__cell'));

describe('OrganismGroupMemberWeek', () => {
  it('draws a later-today cell transparent, dashed and untick-ed', () => {
    const later = cells(render().el).find((node) => node.dataset.state === 'later');

    expect(later.className).toContain('rn-gmweek__cell--later');
    expect(later.style.background).toBe('transparent');
    expect(later.querySelector('.rn-gmweek__cell-icon')).toBeNull();
    expect(later.getAttribute('title')).toContain('later');
  });

  it('keeps the missed cell visibly different — grey fill, today’s blue ring', () => {
    const missed = cells(render().el).find((node) => node.dataset.state === 'missed');

    expect(missed.className).not.toContain('--later');
    expect(missed.style.background).toBe('rgba(0, 0, 0, 0.08)');
    expect(missed.style.boxShadow).toBe('inset 0 0 0 2px rgba(40,139,213,.5)');
  });

  it('ticks a done cell', () => {
    const done = cells(render().el).find((node) => node.dataset.state === 'done');
    expect(done.querySelector('.rn-gmweek__cell-icon').textContent).toBe('check');
  });

  it('totals every day under a DAY SCORE row', () => {
    const { el } = render();
    expect(el.querySelector('.rn-gmweek__total-label').textContent).toBe('DAY SCORE');
    expect(Array.from(el.querySelectorAll('.rn-gmweek__total')).map((n) => n.textContent.trim()))
      .toEqual(['100%', '40%']);
  });

  it('sizes the grid to the number of columns it was given', () => {
    const grid = render().el.querySelector('[data-testid="group-member-week-grid"]');
    expect(grid.style.gridTemplateColumns).toBe('104px repeat(2, minmax(0, 1fr))');
  });

  it('labels this week, today, and the member’s streak', () => {
    const { el } = render();
    expect(el.querySelector('.rn-gmweek__sub').textContent.trim())
      .toBe('priya@shah.in · 14-day streak');
    expect(Array.from(el.querySelectorAll('.rn-gmweek__stat-value')).map((n) => n.textContent))
      .toEqual(['86%', '40%', '14 days']);
  });

  it('carries a close affordance only where it is a sheet', () => {
    expect(render({ closable: true }).el.querySelector('[data-testid="group-member-week-close"]'))
      .not.toBeNull();
    // Tablet / desktop: the panel is permanently visible, so there is nothing to close.
    expect(render().el.querySelector('[data-testid="group-member-week-close"]')).toBeNull();
  });

  it('says so rather than drawing an empty grid when there is no history', () => {
    const { el } = render({ rows: [] });
    expect(el.querySelector('[data-testid="group-member-week-grid"]')).toBeNull();
    expect(el.querySelector('[data-testid="group-member-week-empty"]')).not.toBeNull();
  });

  it('speaks to you, not about "them", when the week is your own', () => {
    const empty = (props) => render({ rows: [], ...props }).el
      .querySelector('[data-testid="group-member-week-empty"]').textContent.trim();
    expect(empty({ you: true })).toBe('No routine history yet — your week fills in once you log a day.');
    expect(empty({ you: true })).not.toMatch(/they/);
    expect(empty()).toBe('No routine history yet — check back once they have logged a day.');
  });

  it('draws a no-data cell blank, without the missed fill or a glyph', () => {
    const { el } = render({
      rows: [{
        key: 'r',
        name: 'Lunch Walk',
        time: '12:30',
        cells: [cell('nodata', { bg: 'transparent', ring: WEEK_CELL.noRing }), cell('done')],
      }],
    });
    const blank = cells(el).find((node) => node.dataset.state === 'nodata');
    expect(blank.className).toContain('rn-gmweek__cell--nodata');
    expect(blank.style.background).toBe('transparent');
    expect(blank.querySelector('.rn-gmweek__cell-icon')).toBeNull();
  });
});
