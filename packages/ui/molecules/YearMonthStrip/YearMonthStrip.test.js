/* eslint-env jest */
/**
 * The 12-month strip. Three tile states, and tapping one focuses that month —
 * it does not navigate, which is the whole reason the nested expansion panels
 * went away.
 */
const Vue = require('vue');

const YearMonthStrip = require('./YearMonthStrip.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const tile = (index, state, over) => ({
  key: index,
  index,
  label: ['Jan', 'Feb', 'Mar'][index % 3],
  name: 'September',
  selected: false,
  isCurrent: false,
  title: 'September: Launch mobile dashboard',
  bodyText: 'Launch mobile dashboard',
  labelColor: 'rgba(0,0,0,.45)',
  labelWeight: 500,
  state,
  ringColor: 'transparent',
  ringValue: 0,
  track: 'rgba(0,0,0,.08)',
  trackDash: null,
  fill: 'transparent',
  icon: '',
  iconColor: 'rgba(0,0,0,.3)',
  text: '',
  ...over,
});

const DONE = tile(0, 'done', {
  fill: '#4CAF50', icon: 'check', iconColor: '#fff', track: 'rgba(76,175,80,.25)',
});
const ACTIVE = tile(1, 'active', {
  ringColor: '#FF9800', ringValue: 33, text: '1/3', isCurrent: true, selected: true,
});
const EMPTY_FUTURE = tile(2, 'empty', { trackDash: '3 3', track: 'rgba(0,0,0,.22)', icon: 'add' });
const EMPTY_PAST = tile(3, 'empty', { trackDash: '3 3', track: 'rgba(0,0,0,.22)', icon: 'remove' });

const render = (props = {}) => {
  const selected = [];
  const vm = new Vue({
    render: (h) => h(YearMonthStrip, {
      props: {
        tiles: [DONE, ACTIVE, EMPTY_FUTURE, EMPTY_PAST],
        shell: 'phone',
        ...props,
      },
      on: { select: (i) => selected.push(i) },
    }),
  }).$mount();
  return { el: vm.$el, selected };
};

describe('MoleculeYearMonthStrip', () => {
  it('paints a done month solid green with a check', () => {
    const { el } = render();
    const done = el.querySelector('[data-testid="month-tile-0"]');
    expect(done.getAttribute('data-state')).toBe('done');
    expect(done.querySelector('.rn-yms__disc').style.background).toBe('rgb(76, 175, 80)');
    expect(done.querySelector('.rn-yms__icon').textContent.trim()).toBe('check');
    expect(done.querySelector('.rn-yms__text')).toBeNull();
  });

  it('paints an active month as a ring reading n/3, with no disc fill', () => {
    const { el } = render();
    const active = el.querySelector('[data-testid="month-tile-1"]');
    expect(active.getAttribute('data-state')).toBe('active');
    expect(active.querySelector('.rn-yms__text').textContent.trim()).toBe('1/3');
    expect(active.querySelector('.rn-yms__icon')).toBeNull();
    expect(active.querySelector('[data-testid="progress-ring-value"]').getAttribute('stroke'))
      .toBe('#FF9800');
  });

  it('paints a month with no goal as a dashed track, + ahead and − behind', () => {
    const { el } = render();
    const future = el.querySelector('[data-testid="month-tile-2"]');
    expect(future.getAttribute('data-state')).toBe('empty');
    expect(future.querySelector('.rn-yms__dash circle').getAttribute('stroke-dasharray'))
      .toBe('3 3');
    expect(future.querySelector('.rn-yms__icon').textContent.trim()).toBe('add');
    expect(el.querySelector('[data-testid="month-tile-3"] .rn-yms__icon').textContent.trim())
      .toBe('remove');
  });

  it('draws the dashed track only where there is no goal', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="month-tile-0"] .rn-yms__dash')).toBeNull();
    expect(el.querySelector('[data-testid="month-tile-1"] .rn-yms__dash')).toBeNull();
  });

  it('focuses a month on tap — a button, not a link', () => {
    const { el, selected } = render();
    const tiles = el.querySelectorAll('.rn-yms__tile');
    expect(tiles).toHaveLength(4);
    expect(el.querySelector('a')).toBeNull();
    tiles[2].click();
    expect(selected).toEqual([2]);
  });

  it('lifts the focused tile onto a white card', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="month-tile-1"]').className)
      .toContain('rn-yms__tile--selected');
    expect(el.querySelector('[data-testid="month-tile-0"]').className)
      .not.toContain('rn-yms__tile--selected');
  });

  it('adds each month’s body only on desktop, where there is room for it', () => {
    expect(render({ shell: 'phone' }).el.querySelector('.rn-yms__body')).toBeNull();
    expect(render({ shell: 'tablet' }).el.querySelector('.rn-yms__body')).toBeNull();
    expect(render({ shell: 'desktop' }).el.querySelector('.rn-yms__body').textContent.trim())
      .toBe('Launch mobile dashboard');
  });

  it('always carries the month goal in the tooltip, on every shell', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="month-tile-0"]').getAttribute('title'))
      .toBe('September: Launch mobile dashboard');
  });
});
