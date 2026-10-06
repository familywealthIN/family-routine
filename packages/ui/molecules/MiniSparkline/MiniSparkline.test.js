/* eslint-env jest */
/**
 * MiniSparkline — Progress' trend line.
 *
 * Three things the design is explicit about, and so are these tests:
 *   1. the X/Y projection, including the n === 1 special case,
 *   2. a null value is a GAP (skipped from both paths) but still gets a
 *      zero-size dot, so the reader sees that a day is missing rather than
 *      reading a straight line as real data,
 *   3. the hit target is a full inter-point-wide invisible column, never the
 *      8px dot — a thumb has to land somewhere.
 */
const Vue = require('vue');

const MiniSparkline = require('./MiniSparkline.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const W = 320;
const H = 96;
const Y = (v) => H - 6 - (v / 100) * (H - 14);

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(MiniSparkline, {
      props: { values: [40, 60, null, 80, 55], ...props },
    }),
  }).$mount();
  return { vm, el: vm.$el, spark: vm.$children[0] };
};

const q = (el, id) => el.querySelector(`[data-testid="mini-sparkline-${id}"]`);
const qa = (el, id) => el.querySelectorAll(`[data-testid="mini-sparkline-${id}"]`);

describe('MiniSparkline — projection', () => {
  it('spreads X evenly across the 320 wide box', () => {
    const { spark } = render({ values: [1, 2, 3, 4, 5] });
    expect([0, 1, 2, 3, 4].map((i) => spark.xAt(i))).toEqual([0, 80, 160, 240, 320]);
  });

  it('centres a single point instead of dividing by zero', () => {
    const { spark } = render({ values: [70] });
    expect(spark.n).toBe(1);
    expect(spark.xAt(0)).toBe(160);
  });

  it('maps Y as H - 6 - (v/100) * (H - 14)', () => {
    const { spark } = render();
    expect(spark.yAt(0)).toBe(90);
    expect(spark.yAt(100)).toBe(8);
    expect(spark.yAt(50)).toBeCloseTo(49, 5);
  });

  it('declares the 320x96 viewBox the formulas assume', () => {
    const { el } = render();
    expect(el.querySelector('svg').getAttribute('viewBox')).toBe('0 0 320 96');
    expect(el.querySelector('svg').getAttribute('preserveAspectRatio')).toBe('none');
  });
});

describe('MiniSparkline — null values are gaps', () => {
  it('skips a null from the line path', () => {
    const { el, spark } = render({ values: [40, null, 80] });
    expect(spark.lineD).toBe(`M0.0 ${Y(40).toFixed(1)} L320.0 ${Y(80).toFixed(1)}`);
    expect(q(el, 'line').getAttribute('d')).not.toContain('160.0');
  });

  it('skips a null from the area path and closes on the real endpoints', () => {
    const { spark } = render({ values: [40, null, 80] });
    expect(spark.areaD).toBe(`${spark.lineD} L320.0 96 L0.0 96 Z`);
  });

  it('still renders a dot for the null, at zero size', () => {
    const { el } = render({ values: [40, null, 80] });
    const dots = qa(el, 'dot');
    expect(dots).toHaveLength(3);
    expect(dots[1].style.width).toBe('0px');
    expect(dots[1].style.height).toBe('0px');
  });

  it('gives the null no hit zone, because there is nothing to select', () => {
    const { el } = render({ values: [40, null, 80] });
    expect(Array.from(qa(el, 'hit')).map((z) => Number(z.dataset.index))).toEqual([0, 2]);
  });

  it('draws nothing at all when every value is null', () => {
    const { el, spark } = render({ values: [null, null, null] });
    expect(spark.lineD).toBe('');
    expect(spark.areaD).toBe('');
    expect(q(el, 'line')).toBeNull();
    expect(q(el, 'area')).toBeNull();
    expect(q(el, 'guide')).toBeNull();
    expect(spark.activeIndex).toBeNull();
    expect(qa(el, 'hit')).toHaveLength(0);
  });
});

describe('MiniSparkline — reference line', () => {
  it('draws the previous period as a dashed line at its own Y', () => {
    const { el, spark } = render({ previous: 62 });
    expect(Number(spark.refY)).toBeCloseTo(Y(62), 1);
    const line = q(el, 'reference');
    expect(line.getAttribute('stroke-dasharray')).toBe('3 4');
    expect(line.getAttribute('x2')).toBe('320');
  });

  it('omits the reference line when there is no previous period', () => {
    expect(q(render({ previous: null }).el, 'reference')).toBeNull();
  });
});

describe('MiniSparkline — selection', () => {
  it('defaults to the last non-null point', () => {
    expect(render({ values: [40, 60, 80, null, null] }).spark.activeIndex).toBe(2);
  });

  it('honours an explicit selection', () => {
    expect(render({ selectedIndex: 1 }).spark.activeIndex).toBe(1);
  });

  it('ignores a selection that points at a gap and falls back to the last real point', () => {
    const { spark } = render({ values: [40, 60, null, 80, 55], selectedIndex: 2 });
    expect(spark.activeIndex).toBe(4);
  });

  it('ignores an out-of-range selection', () => {
    expect(render({ selectedIndex: 99 }).spark.activeIndex).toBe(4);
  });

  it('grows the selected dot to 12px and fills it with the line colour', () => {
    const { el } = render({ selectedIndex: 1 });
    const dots = qa(el, 'dot');
    expect(dots[1].style.width).toBe('12px');
    expect(dots[1].style.background).toBe('rgb(40, 139, 213)');
    expect(dots[0].style.width).toBe('8px');
    expect(dots[0].style.background).toBe('rgb(255, 255, 255)');
  });

  it('draws a guide line through the selected point', () => {
    const { el } = render({ values: [40, 60, 80, 55, 70], selectedIndex: 2 });
    expect(q(el, 'guide').getAttribute('x1')).toBe('160.0');
  });

  it('emits select and the sync event from a hit zone', () => {
    const { el, spark } = render();
    const picked = [];
    const synced = [];
    spark.$on('select', (i) => picked.push(i));
    spark.$on('update:selectedIndex', (i) => synced.push(i));
    qa(el, 'hit')[0].click();
    expect(picked).toEqual([0]);
    expect(synced).toEqual([0]);
  });

  it('makes re-picking the active point a no-op', () => {
    const { el, spark } = render({ selectedIndex: 0 });
    const picked = [];
    spark.$on('select', (i) => picked.push(i));
    qa(el, 'hit')[0].click();
    expect(picked).toEqual([]);
  });

  it('refuses a programmatic select on a gap', () => {
    const { spark } = render({ values: [40, null, 80] });
    const picked = [];
    spark.$on('select', (i) => picked.push(i));
    spark.select(1);
    expect(picked).toEqual([]);
  });
});

describe('MiniSparkline — hit targets', () => {
  // jsdom re-serialises percentages ("25.00%" -> "25%"), so compare numerically.
  const pct = (node, prop) => parseFloat(node.style[prop]);

  it('sizes each zone to a full inter-point width, not the dot', () => {
    const { el, spark } = render({ values: [10, 20, 30, 40, 50] });
    // 5 points -> 4 gaps -> 80px each -> 25% of the 320 box
    expect(spark.hitWidth).toBe(80);
    Array.from(qa(el, 'hit')).forEach((zone) => {
      expect(pct(zone, 'width')).toBeCloseTo(25, 2);
    });
  });

  it('centres the zone on its point', () => {
    const { el } = render({ values: [10, 20, 30, 40, 50] });
    const zones = qa(el, 'hit');
    // middle point sits at x=160 -> zone starts at 120 -> 37.5%
    expect(pct(zones[2], 'left')).toBeCloseTo(37.5, 2);
  });

  it('clips the first zone at the left edge instead of going negative', () => {
    const { el } = render({ values: [10, 20, 30, 40, 50] });
    expect(pct(qa(el, 'hit')[0], 'left')).toBe(0);
  });

  it('spans the whole plot for a single point', () => {
    const { el, spark } = render({ values: [70] });
    expect(spark.hitWidth).toBe(W);
    expect(pct(qa(el, 'hit')[0], 'width')).toBe(100);
    expect(pct(qa(el, 'hit')[0], 'left')).toBe(0);
  });

  it('keeps the zone far wider than the dot it selects', () => {
    const { el, spark } = render({ values: [10, 20, 30, 40, 50, 60, 70] });
    // 7 points -> ~53px columns against an 8px dot
    expect(spark.hitWidth).toBeCloseTo(320 / 6, 5);
    expect(qa(el, 'dot')[0].style.width).toBe('8px');
    expect(spark.hitWidth).toBeGreaterThan(40);
  });

  it('never lets the dots swallow the taps', () => {
    const { el } = render();
    // dots are pointer-events:none in the stylesheet, so assert the structural
    // guarantee: every real point has exactly one zone, and the zones come last
    const children = Array.from(el.querySelector('.rn-spark__plot').children);
    const lastThree = children.slice(-4);
    expect(lastThree.every((node) => node.className === 'rn-spark__hit')).toBe(true);
  });
});

describe('MiniSparkline — axis labels', () => {
  it('renders one span per label', () => {
    const { el } = render({ labels: ['Mon', 'Wed', 'Fri', 'Sun'] });
    expect(Array.from(q(el, 'axis').children).map((n) => n.textContent))
      .toEqual(['Mon', 'Wed', 'Fri', 'Sun']);
  });

  it('renders no axis row when there are no labels', () => {
    expect(q(render().el, 'axis')).toBeNull();
  });
});
