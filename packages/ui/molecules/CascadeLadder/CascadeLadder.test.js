/* eslint-env jest */
/**
 * CascadeLadder — the Goals page's navigation.
 *
 * What it must not get wrong: the threshold chip belongs BETWEEN two steps (so
 * the last step never draws one), tapping a step is navigation rather than a
 * tick, and a step whose goal just auto-ticked replays `rn-pop`.
 */
const Vue = require('vue');

const CascadeLadder = require('./CascadeLadder.vue').default;
const { thresholdChip } = require('../../constants/goalsCascade');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const STEPS = [
  {
    key: 'day', label: 'Today', num: '1/2', value: 50, color: '#FF9800', active: true, threshold: '×5', pop: false,
  },
  {
    key: 'week', label: 'Week', num: '2/6', value: 33, color: '#288bd5', active: false, threshold: '×3', pop: false,
  },
  {
    key: 'month', label: 'Month', num: '1/7', value: 14, color: '#288bd5', active: false, threshold: '×6', pop: false,
  },
  {
    key: 'year', label: 'Year', num: '58%', value: 58, color: '#288bd5', active: false, threshold: '', pop: false,
  },
  {
    key: 'lifetime', label: 'Life', num: '0/3', value: 0, color: '#288bd5', active: false, threshold: '', pop: false,
  },
];

const render = (props = {}) => {
  const selected = [];
  const vm = new Vue({
    render: (h) => h(CascadeLadder, {
      props: { steps: STEPS, rule: 'Day goals count toward this week’s goal.', ruleIcon: 'today', ...props },
      on: { select: (key) => selected.push(key) },
    }),
  }).$mount();
  return { el: vm.$el, selected };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('CascadeLadder', () => {
  it('draws one step per level', () => {
    const { el } = render();
    expect(el.querySelectorAll('.rn-ladder__step').length).toBe(5);
    expect(q(el, 'ladder-num-year').textContent).toBe('58%');
  });

  it('puts the roll-up chip between two steps and never after the last', () => {
    const { el } = render();
    expect(q(el, 'ladder-threshold-day').textContent).toContain('×5');
    expect(q(el, 'ladder-threshold-week').textContent).toContain('×3');
    expect(q(el, 'ladder-threshold-month').textContent).toContain('×6');
    expect(q(el, 'ladder-threshold-year')).toBeNull();
    expect(q(el, 'ladder-threshold-lifetime')).toBeNull();
  });

  it('reads the chips off the one threshold table, not a local copy', () => {
    expect(thresholdChip('day')).toBe('×5');
    expect(thresholdChip('month')).toBe('×6');
    expect(thresholdChip('year')).toBe('');
  });

  it('navigates on a tap instead of changing anything', () => {
    const { el, selected } = render();
    q(el, 'ladder-step-month').click();
    q(el, 'ladder-step-lifetime').click();
    expect(selected).toEqual(['month', 'lifetime']);
  });

  it('marks the active step for the screen reader as well as the eye', () => {
    const { el } = render();
    expect(q(el, 'ladder-step-day').getAttribute('aria-selected')).toBe('true');
    expect(q(el, 'ladder-step-week').getAttribute('aria-selected')).toBe('false');
    expect(q(el, 'ladder-step-day').className).toContain('rn-ladder__step--active');
  });

  it('pops only the step that just auto-ticked', () => {
    const steps = STEPS.map((step) => (step.key === 'week' ? { ...step, pop: true } : step));
    const { el } = render({ steps });
    expect(q(el, 'ladder-num-week').className).toContain('rn-ladder__num--pop');
    expect(q(el, 'ladder-num-day').className).not.toContain('rn-ladder__num--pop');
  });

  it('states the roll-up rule under the ladder', () => {
    const { el } = render();
    expect(q(el, 'cascade-rule').textContent).toContain('this week’s goal');
  });

  it('drops the rule line rather than drawing an empty one', () => {
    expect(q(render({ rule: '' }).el, 'cascade-rule')).toBeNull();
  });
});
