/* eslint-env jest */
/**
 * SlidingSwitch — the one segmented control.
 *
 * The thumb geometry is generalised from Progress, whose mock hardcodes `/ 4`.
 * These tests pin the formula for every n the designs actually use (2 for
 * Profile and the agent event kind, 4 for Progress, 5 for About) so the
 * generalisation cannot regress into a per-page copy.
 */
const Vue = require('vue');

const SlidingSwitch = require('./SlidingSwitch.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(SlidingSwitch, {
      props: { segments: PERIODS, value: 'week', ...props },
    }),
  }).$mount();
  return { vm, el: vm.$el, sw: vm.$children[0] };
};

const indicator = (el) => el.querySelector('[data-testid="sliding-switch-indicator"]');
const segments = (el) => el.querySelectorAll('[data-testid="sliding-switch-segment"]');

describe('SlidingSwitch — thumb geometry', () => {
  it('sizes the thumb to one nth of the track inside the 3px padding', () => {
    expect(render().sw.indicatorStyle.width).toBe('calc((100% - 6px) / 4)');
  });

  it('places the thumb at 3px + i * segment width', () => {
    expect(render({ value: 'day' }).sw.indicatorStyle.left)
      .toBe('calc(3px + 0 * (100% - 6px) / 4)');
    expect(render({ value: 'month' }).sw.indicatorStyle.left)
      .toBe('calc(3px + 2 * (100% - 6px) / 4)');
    expect(render({ value: 'year' }).sw.indicatorStyle.left)
      .toBe('calc(3px + 3 * (100% - 6px) / 4)');
  });

  it('generalises off n rather than the mocks hardcoded 4', () => {
    const two = render({ segments: ['12', '24'], value: '24' });
    expect(two.sw.indicatorStyle.width).toBe('calc((100% - 6px) / 2)');
    expect(two.sw.indicatorStyle.left).toBe('calc(3px + 1 * (100% - 6px) / 2)');
  });

  it('carries the track and thumb classes the chassis pins the styling to', () => {
    const { el } = render();
    expect(el.className).toContain('rn-switch--thumb');
    expect(indicator(el).className).toContain('rn-switch__indicator--thumb');
  });
});

describe('SlidingSwitch — underline variant (About)', () => {
  const FEATURES = ['Routines', 'Goals', 'Priority', 'Agents', 'Progress'];

  it('spans a full nth with no padding inset', () => {
    const { sw } = render({ segments: FEATURES, value: 'Routines', variant: 'underline' });
    expect(sw.indicatorStyle.width).toBe('calc(100% / 5)');
    expect(sw.indicatorStyle.left).toBe('calc(0 * 100% / 5)');
  });

  it('slides to i * 100%/n — 20% steps for the five feature tabs', () => {
    const { sw } = render({ segments: FEATURES, value: 'Agents', variant: 'underline' });
    expect(sw.indicatorStyle.left).toBe('calc(3 * 100% / 5)');
  });

  it('paints the 2px indicator in the chassis primary by default', () => {
    const { el } = render({ segments: FEATURES, value: 'Goals', variant: 'underline' });
    expect(indicator(el).className).toContain('rn-switch__indicator--underline');
    expect(indicator(el).style.background).toBe('rgb(40, 139, 213)');
  });

  it('takes an indicator colour override', () => {
    const { el } = render({ variant: 'underline', indicatorColor: '#E53935' });
    expect(indicator(el).style.background).toBe('rgb(229, 57, 53)');
  });
});

describe('SlidingSwitch — selection', () => {
  it('emits input and change with the segment key', () => {
    const { el, sw } = render();
    const inputs = [];
    const changes = [];
    sw.$on('input', (v) => inputs.push(v));
    sw.$on('change', (v) => changes.push(v));
    segments(el)[3].click();
    expect(inputs).toEqual(['year']);
    expect(changes).toEqual(['year']);
  });

  it('makes clicking the active segment a no-op', () => {
    const { el, sw } = render({ value: 'week' });
    const inputs = [];
    sw.$on('input', (v) => inputs.push(v));
    segments(el)[1].click();
    expect(inputs).toEqual([]);
  });

  it('marks exactly one segment active for assistive tech', () => {
    const { el } = render({ value: 'month' });
    const selected = Array.from(segments(el))
      .map((node) => node.getAttribute('aria-selected'));
    expect(selected).toEqual(['false', 'false', 'true', 'false']);
  });

  it('colours the active label darker than the rest', () => {
    const { el } = render({ value: 'day' });
    expect(segments(el)[0].style.color).toBe('rgba(0, 0, 0, 0.87)');
    expect(segments(el)[1].style.color).toBe('rgba(0, 0, 0, 0.55)');
  });
});

describe('SlidingSwitch — segment shapes', () => {
  it('accepts bare strings as both key and label', () => {
    const { el, sw } = render({ segments: ['URL', 'cURL'], value: 'URL' });
    expect(Array.from(segments(el)).map((n) => n.textContent.trim())).toEqual(['URL', 'cURL']);
    expect(sw.resolvedSegments[0].key).toBe('URL');
  });

  it('renders an icon above the label when one is given', () => {
    const { el } = render({
      segments: [{ key: 'r', label: 'Routines', icon: 'history' }],
      value: 'r',
      variant: 'underline',
    });
    expect(segments(el)[0].querySelector('.rn-switch__icon').textContent).toBe('history');
  });

  it('applies the height prop so the pill and the tab strip can differ', () => {
    expect(segments(render({ height: 34 }).el)[0].style.height).toBe('34px');
    expect(segments(render({ height: 52 }).el)[0].style.height).toBe('52px');
  });
});

describe('SlidingSwitch — degenerate input', () => {
  it('renders no indicator for an empty segment list instead of dividing by zero', () => {
    const { el, sw } = render({ segments: [] });
    expect(sw.indicatorStyle).toBeNull();
    expect(indicator(el)).toBeNull();
    expect(segments(el)).toHaveLength(0);
  });

  it('parks the indicator on the first segment when the value matches none', () => {
    const { sw } = render({ value: 'decade' });
    expect(sw.activeIndex).toBe(0);
    expect(sw.indicatorStyle.left).toBe('calc(3px + 0 * (100% - 6px) / 4)');
  });

  it('still emits when no segment is active, so an unknown value is recoverable', () => {
    const { el, sw } = render({ value: 'decade' });
    const inputs = [];
    sw.$on('input', (v) => inputs.push(v));
    segments(el)[0].click();
    expect(inputs).toEqual(['day']);
  });
});
