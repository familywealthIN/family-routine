/* eslint-env jest */
/**
 * ProgressRing — the chassis ring primitive.
 *
 * The suite walks the whole "Rings" table in docs/redesign/chassis.md so a
 * change to the geometry cannot silently break one screen's ring while the
 * others keep passing. The table's dasharray literals are the mocks' hardcoded
 * values at mixed precision (263.9 and 119.4 are 1dp, 125.66 and 131.95 are
 * 2dp), so they are compared with `toBeCloseTo` against the exact 2*PI*r.
 */
const Vue = require('vue');

const ProgressRing = require('./ProgressRing.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(ProgressRing, { props }),
  }).$mount();
  return { vm, el: vm.$el, ring: vm.$children[0] };
};

const arc = (el) => el.querySelector('[data-testid="progress-ring-value"]');

describe('ProgressRing — geometry', () => {
  it('derives the circumference as 2*PI*r', () => {
    expect(render({ r: 20 }).ring.circumference).toBeCloseTo(125.66, 1);
  });

  it('offsets the dash by c * (1 - value/100)', () => {
    const { ring } = render({ r: 42, value: 25 });
    expect(Number(ring.dashOffset)).toBeCloseTo(263.9 * 0.75, 1);
  });

  it('leaves a full offset at 0% and none at 100%', () => {
    expect(Number(render({ r: 20, value: 0 }).ring.dashOffset)).toBeCloseTo(125.66, 1);
    expect(Number(render({ r: 20, value: 100 }).ring.dashOffset)).toBe(0);
  });

  it('rounds the arc caps', () => {
    expect(arc(render().el).getAttribute('stroke-linecap')).toBe('round');
  });

  it('keeps the viewBox independent of the rendered size', () => {
    const { el, ring } = render({ size: 44, viewBox: 48 });
    expect(el.querySelector('svg').getAttribute('viewBox')).toBe('0 0 48 48');
    expect(el.style.width).toBe('44px');
    expect(ring.centre).toBe(24);
  });

  it('falls back to the rendered size when no viewBox is given', () => {
    const { el, ring } = render({ size: 128 });
    expect(el.querySelector('svg').getAttribute('viewBox')).toBe('0 0 128 128');
    expect(ring.centre).toBe(64);
  });
});

describe('ProgressRing — every ring in the chassis table', () => {
  const TABLE = [
    { name: 'D/K/G trio outer', size: 128, viewBox: 128, r: 56, stroke: 10, c: 351.86 },
    { name: 'D/K/G trio middle', size: 128, viewBox: 128, r: 42, stroke: 10, c: 263.9 },
    { name: 'D/K/G trio inner', size: 128, viewBox: 128, r: 28, stroke: 10, c: 175.93 },
    { name: 'Goals ladder step', size: 44, viewBox: 48, r: 20, stroke: 4, c: 125.66 },
    { name: 'Goals calendar day', size: 34, viewBox: 48, r: 21, stroke: 3, c: 131.95 },
    { name: 'Year hero phone', size: 120, viewBox: 96, r: 42, stroke: 7, c: 263.9 },
    { name: 'Year hero tablet', size: 80, viewBox: 96, r: 42, stroke: 7, c: 263.9 },
    { name: 'Year hero desktop', size: 100, viewBox: 96, r: 42, stroke: 7, c: 263.9 },
    { name: 'Priority tile', size: 26, viewBox: 48, r: 19, stroke: 6, c: 119.4 },
  ];

  TABLE.forEach(({
    name, size, viewBox, r, stroke, c,
  }) => {
    it(`${name}: ${size}px / r${r} / stroke ${stroke} / dasharray ${c}`, () => {
      const { el, ring } = render({
        size, viewBox, r, stroke, value: 50,
      });
      expect(el.style.width).toBe(`${size}px`);
      expect(el.style.height).toBe(`${size}px`);
      expect(el.querySelector('svg').getAttribute('viewBox')).toBe(`0 0 ${viewBox} ${viewBox}`);
      expect(Number(arc(el).getAttribute('r'))).toBe(r);
      expect(Number(arc(el).getAttribute('stroke-width'))).toBe(stroke);
      expect(Number(arc(el).getAttribute('cx'))).toBe(viewBox / 2);
      expect(Number(ring.dashArray)).toBeCloseTo(c, 1);
      // half of the circumference still to go at 50%
      expect(Number(ring.dashOffset)).toBeCloseTo(c / 2, 1);
    });
  });
});

describe('ProgressRing — clamping', () => {
  it('stops the arc at a full ring when the value overshoots 100', () => {
    const { ring } = render({ r: 42, value: 140 });
    expect(ring.clamped).toBe(100);
    expect(Number(ring.dashOffset)).toBe(0);
  });

  it('never draws a negative arc', () => {
    const { ring } = render({ r: 42, value: -20 });
    expect(ring.clamped).toBe(0);
    expect(Number(ring.dashOffset)).toBeCloseTo(263.9, 1);
  });

  it('treats a non-numeric value as empty rather than rendering NaN', () => {
    const { ring } = render({ r: 20, value: Number.NaN });
    expect(ring.dashOffset).not.toContain('NaN');
    expect(ring.clamped).toBe(0);
  });
});

describe('ProgressRing — colour rule', () => {
  const colourOf = (props) => render(props).ring.resolvedColor;

  it('goes green at 100%', () => {
    expect(colourOf({ value: 100 })).toBe('#4CAF50');
  });

  it('goes green when an overshooting value clamps to 100%', () => {
    expect(colourOf({ value: 130 })).toBe('#4CAF50');
  });

  it('goes orange for today / the current routine', () => {
    expect(colourOf({ value: 40, current: true })).toBe('#FF9800');
  });

  it('stays orange for a current period that has earned nothing yet', () => {
    expect(colourOf({ value: 0, current: true })).toBe('#FF9800');
  });

  it('goes blue for an ordinary part-done ring', () => {
    expect(colourOf({ value: 40 })).toBe('#288bd5');
  });

  it('goes grey when empty', () => {
    expect(colourOf({ value: 0 })).toBe('rgba(0,0,0,.18)');
  });

  it('lets an explicit colour win over the rule', () => {
    expect(colourOf({ value: 100, color: '#E53935' })).toBe('#E53935');
  });
});

describe('ProgressRing — track and centre', () => {
  it('draws a track at the same width as the arc by default', () => {
    const { el } = render({ stroke: 7 });
    const track = el.querySelector('[data-testid="progress-ring-track"]');
    expect(Number(track.getAttribute('stroke-width'))).toBe(7);
    expect(track.getAttribute('fill')).toBe('none');
  });

  it('tints the track interior when asked (Goals calendar day)', () => {
    const { el } = render({ fill: 'rgba(40,139,213,.08)' });
    expect(el.querySelector('[data-testid="progress-ring-track"]').getAttribute('fill'))
      .toBe('rgba(40,139,213,.08)');
  });

  it('drops the track entirely for trackColor="none"', () => {
    const { el } = render({ trackColor: 'none' });
    expect(el.querySelector('[data-testid="progress-ring-track"]')).toBeNull();
  });

  it('renders no centre wrapper when nothing is slotted', () => {
    expect(render().el.querySelector('.rn-ring__centre')).toBeNull();
  });

  it('renders the centre slot upright, outside the rotated svg', () => {
    const vm = new Vue({
      render: (h) => h(ProgressRing, { props: { value: 50 } }, [h('span', '83%')]),
    }).$mount();
    const centre = vm.$el.querySelector('.rn-ring__centre');
    expect(centre).not.toBeNull();
    expect(centre.textContent).toBe('83%');
    expect(centre.querySelector('svg')).toBeNull();
    expect(vm.$el.querySelector('svg .rn-ring__centre')).toBeNull();
  });
});
