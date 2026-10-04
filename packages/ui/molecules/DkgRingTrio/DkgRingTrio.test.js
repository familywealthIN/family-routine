/* eslint-env jest */
/**
 * DkgRingTrio — three concentric rings, one honest legend.
 *
 * The two behaviours worth pinning: the geometry (128 / r 56-42-28 / stroke 10,
 * the chassis table) and the clamp-the-arc-not-the-label rule, because D and K
 * routinely read above 100% on day one of a period.
 */
const Vue = require('vue');

const DkgRingTrio = require('./DkgRingTrio.vue').default;
const { STIMULI } = require('../../constants/routineFocus');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}, children = null) => {
  const vm = new Vue({
    render: (h) => h(DkgRingTrio, { props: { values: { D: 92, K: 64, G: 48 }, ...props } }, children ? [children(h)] : undefined),
  }).$mount();
  return { vm, el: vm.$el, trio: vm.$children[0] };
};

const arcs = (el) => el.querySelectorAll('[data-testid="progress-ring-value"]');
const legendValues = (el) => Array.from(el.querySelectorAll('[data-testid="dkg-legend-value"]'))
  .map((node) => node.textContent.trim());

describe('DkgRingTrio — geometry', () => {
  it('draws three concentric rings at r 56 / 42 / 28', () => {
    const { el } = render();
    expect(Array.from(arcs(el)).map((a) => Number(a.getAttribute('r')))).toEqual([56, 42, 28]);
  });

  it('strokes all three at width 10', () => {
    const { el } = render();
    Array.from(arcs(el)).forEach((a) => {
      expect(Number(a.getAttribute('stroke-width'))).toBe(10);
    });
  });

  it('shares one 128-unit coordinate space centred at 64', () => {
    const { el } = render();
    el.querySelectorAll('svg').forEach((svg) => {
      expect(svg.getAttribute('viewBox')).toBe('0 0 128 128');
    });
    Array.from(arcs(el)).forEach((a) => {
      expect(Number(a.getAttribute('cx'))).toBe(64);
      expect(Number(a.getAttribute('cy'))).toBe(64);
    });
  });

  it('renders at 128px by default and scales from one prop', () => {
    expect(render().el.querySelector('.rn-dkg__rings').style.width).toBe('128px');
    const small = render({ size: 96 });
    expect(small.el.querySelector('.rn-dkg__rings').style.width).toBe('96px');
    // the coordinate space is unchanged, so radii stay in viewBox units
    expect(Number(arcs(small.el)[0].getAttribute('r'))).toBe(56);
  });

  it('offsets each arc by its own circumference', () => {
    const { el } = render({ values: { D: 50, K: 50, G: 50 } });
    const offs = Array.from(arcs(el)).map((a) => Number(a.getAttribute('stroke-dashoffset')));
    expect(offs[0]).toBeCloseTo((2 * Math.PI * 56) / 2, 1);
    expect(offs[1]).toBeCloseTo((2 * Math.PI * 42) / 2, 1);
    expect(offs[2]).toBeCloseTo((2 * Math.PI * 28) / 2, 1);
  });
});

describe('DkgRingTrio — tokens', () => {
  it('reads D / K / G colours from the shared constants, not a second set', () => {
    const { el } = render();
    expect(Array.from(arcs(el)).map((a) => a.getAttribute('stroke')))
      .toEqual([STIMULI.D.color, STIMULI.K.color, STIMULI.G.color]);
  });

  it('matches the chassis palette values', () => {
    const { el } = render();
    expect(Array.from(arcs(el)).map((a) => a.getAttribute('stroke')))
      .toEqual(['#4CAF50', '#E53935', '#2196F3']);
  });

  it('labels each ring with the design hint', () => {
    const { el } = render();
    const hints = Array.from(el.querySelectorAll('.rn-dkg__hint')).map((n) => n.textContent.trim());
    expect(hints).toEqual(['showing up on time', 'movement and energy', 'focused output']);
  });

  it('names the three stimuli in order', () => {
    const { el } = render();
    const labels = Array.from(el.querySelectorAll('.rn-dkg__label')).map((n) => n.textContent.trim());
    expect(labels).toEqual(['Discipline', 'Kinetics', 'Geniuses']);
    const badges = Array.from(el.querySelectorAll('.rn-dkg__badge')).map((n) => n.textContent.trim());
    expect(badges).toEqual(['D', 'K', 'G']);
  });
});

describe('DkgRingTrio — overshoot', () => {
  it('clamps the arc at a full ring when a stimulus passes 100%', () => {
    const { el } = render({ values: { D: 140, K: 64, G: 48 } });
    expect(Number(arcs(el)[0].getAttribute('stroke-dashoffset'))).toBe(0);
  });

  it('keeps the legend honest about the real number', () => {
    const { el } = render({ values: { D: 140, K: 64, G: 48 } });
    expect(legendValues(el)[0]).toBe('140%');
  });

  it('rounds the label rather than printing a long float', () => {
    const { el } = render({ values: { D: 83.4, K: 0, G: 0 } });
    expect(legendValues(el)[0]).toBe('83%');
  });

  it('keeps the stimulus colour instead of falling into the ring colour rule', () => {
    // A clamped 140% would otherwise read as ProgressRing green; the trio is
    // always D/K/G coloured, so K at 140% must stay red.
    const { el } = render({ values: { D: 0, K: 140, G: 0 } });
    expect(arcs(el)[1].getAttribute('stroke')).toBe(STIMULI.K.color);
  });
});

describe('DkgRingTrio — missing and malformed values', () => {
  it('treats an absent stimulus as 0 rather than NaN', () => {
    const { el } = render({ values: {} });
    expect(legendValues(el)).toEqual(['0%', '0%', '0%']);
    Array.from(arcs(el)).forEach((a) => {
      expect(a.getAttribute('stroke-dashoffset')).not.toContain('NaN');
    });
  });

  it('ignores a non-numeric value', () => {
    const { el } = render({ values: { D: 'lots', K: null, G: 30 } });
    expect(legendValues(el)).toEqual(['0%', '0%', '30%']);
  });

  it('empties the arc completely at 0', () => {
    const { el } = render({ values: { D: 0, K: 0, G: 0 } });
    expect(Number(arcs(el)[0].getAttribute('stroke-dashoffset')))
      .toBeCloseTo(2 * Math.PI * 56, 1);
  });
});

describe('DkgRingTrio — composition', () => {
  it('hides the legend when the host only wants the rings', () => {
    const { el } = render({ legend: false });
    expect(el.querySelector('[data-testid="dkg-legend"]')).toBeNull();
    expect(arcs(el)).toHaveLength(3);
  });

  it('renders a heading above the legend rows when given', () => {
    const { el } = render({ heading: 'BALANCE · AVG PER DAY' });
    expect(el.querySelector('.rn-dkg__heading').textContent.trim())
      .toBe('BALANCE · AVG PER DAY');
  });

  it('renders no heading element when no heading is given', () => {
    expect(render().el.querySelector('.rn-dkg__heading')).toBeNull();
  });

  it('centres a slot inside the rings', () => {
    const { el } = render({}, (h) => h('span', { attrs: { id: 'mid' } }, '68%'));
    expect(el.querySelector('.rn-dkg__centre #mid').textContent).toBe('68%');
  });

  it('builds on ProgressRing instead of a second circumference formula', () => {
    const { trio } = render();
    const ring = trio.$children[0];
    expect(ring.$options.name).toBe('MoleculeProgressRing');
    expect(ring.circumference).toBeCloseTo(2 * Math.PI * 56, 4);
  });
});
