/* eslint-env jest */
/**
 * StatusRing — the agent lifecycle ring.
 *
 * Two contracts worth locking:
 *   1. the stage list is NOT redefined here — colour and glyph come from
 *      AGENT_STAGES, liveness from AGENT_LIVE_STAGES,
 *   2. the ring only breathes while running or listening. "Always animated" is
 *      the failure mode: a permanently pulsing avatar stops meaning anything.
 */
const Vue = require('vue');

const StatusRing = require('./StatusRing.vue').default;
const { AGENT_STAGES, AGENT_LIVE_STAGES } = require('../../constants/routineFocus');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}, children = null) => {
  const vm = new Vue({
    render: (h) => h(StatusRing, { props: { stage: 'running', ...props } }, children ? [children(h)] : undefined),
  }).$mount();
  return { vm, el: vm.$el, ring: vm.$children[0] };
};

const face = (el) => el.querySelector('[data-testid="status-ring-face"]');
const pulse = (el) => el.querySelector('[data-testid="status-ring-pulse"]');

describe('StatusRing — the ring itself', () => {
  it('draws a 2px inset ring on a 42px avatar by default', () => {
    const { el } = render({ stage: 'finished' });
    expect(el.style.width).toBe('42px');
    expect(el.style.height).toBe('42px');
    expect(face(el).style.boxShadow)
      .toBe(`inset 0 0 0 2px ${AGENT_STAGES.finished.color}`);
  });

  it('takes a size override for the detail header without changing the ring width', () => {
    const { el } = render({ stage: 'finished', size: 48 });
    expect(el.style.width).toBe('48px');
    expect(face(el).style.boxShadow).toContain('inset 0 0 0 2px');
  });

  it('tints the avatar with the stage colour at 12%', () => {
    const { ring } = render({ stage: 'running' });
    // #1976d2
    expect(ring.resolvedTint).toBe('rgba(25,118,210,.12)');
  });

  it('takes explicit colour and tint overrides', () => {
    const { ring } = render({ color: '#288bd5', tint: 'rgba(0,0,0,.04)' });
    expect(ring.resolvedColor).toBe('#288bd5');
    expect(ring.resolvedTint).toBe('rgba(0,0,0,.04)');
  });

  it('degrades to a neutral ring for an unknown stage instead of blowing up', () => {
    const { el, ring } = render({ stage: 'teleporting' });
    expect(ring.token).toBeNull();
    expect(ring.resolvedColor).toBe('rgba(0,0,0,.24)');
    expect(ring.resolvedTint).toBe('transparent');
    expect(pulse(el)).toBeNull();
  });
});

describe('StatusRing — breathing', () => {
  it('breathes while running', () => {
    const { el, ring } = render({ stage: 'running' });
    expect(ring.breathing).toBe(true);
    expect(pulse(el)).not.toBeNull();
    expect(pulse(el).style.animation).toBe('rn-breathe 1.8s ease-in-out infinite');
  });

  it('breathes while listening', () => {
    const { el, ring } = render({ stage: 'listening' });
    expect(ring.breathing).toBe(true);
    expect(pulse(el)).not.toBeNull();
  });

  ['waiting', 'firing', 'finished', 'failed'].forEach((stage) => {
    it(`stays static while ${stage}`, () => {
      const { el, ring } = render({ stage });
      expect(ring.breathing).toBe(false);
      expect(pulse(el)).toBeNull();
    });
  });

  it('never animates the avatar itself, only the ring layer over it', () => {
    // rn-breathe scales to 1.45 and fades out; on the avatar that would make
    // the agent vanish. The face carries no animation at any stage.
    ['running', 'listening', 'waiting', 'finished'].forEach((stage) => {
      expect(face(render({ stage }).el).style.animation).toBe('');
    });
  });

  it('matches the pulse ring colour to the stage', () => {
    const { el } = render({ stage: 'listening' });
    expect(pulse(el).style.boxShadow).toBe(`0 0 0 2px ${AGENT_STAGES.listening.color}`);
  });
});

describe('StatusRing — stage tokens come from the constants', () => {
  Object.keys(AGENT_STAGES).forEach((stage) => {
    it(`reads ${stage}'s colour and glyph from AGENT_STAGES`, () => {
      const { el, ring } = render({ stage });
      expect(ring.resolvedColor).toBe(AGENT_STAGES[stage].color);
      expect(ring.resolvedGlyph).toBe(AGENT_STAGES[stage].glyph);
      expect(el.dataset.stage).toBe(stage);
    });
  });

  it('derives liveness from AGENT_LIVE_STAGES rather than a local list', () => {
    AGENT_LIVE_STAGES.forEach((stage) => {
      expect(render({ stage }).ring.live).toBe(true);
    });
    ['finished', 'failed'].forEach((stage) => {
      expect(render({ stage }).ring.live).toBe(false);
    });
  });

  it('flags a live ring as busy for assistive tech', () => {
    expect(face(render({ stage: 'running' }).el).getAttribute('aria-busy')).toBe('true');
    expect(face(render({ stage: 'finished' }).el).getAttribute('aria-busy')).toBe('false');
  });
});

describe('StatusRing — content', () => {
  it('renders the stage glyph by default', () => {
    const { el } = render({ stage: 'listening' });
    expect(el.querySelector('.rn-status__glyph').textContent).toBe('hearing');
  });

  it('renders no glyph for a stage that has none (failed)', () => {
    expect(render({ stage: 'failed' }).el.querySelector('.rn-status__glyph')).toBeNull();
  });

  it('takes a glyph override', () => {
    const { el } = render({ stage: 'running', glyph: 'smart_toy' });
    expect(el.querySelector('.rn-status__glyph').textContent).toBe('smart_toy');
  });

  it('blanks the glyph for an explicit empty override', () => {
    expect(render({ stage: 'running', glyph: '' }).el.querySelector('.rn-status__glyph'))
      .toBeNull();
  });

  it('scales the glyph with the avatar', () => {
    expect(render({ size: 42 }).el.querySelector('.rn-status__glyph').style.fontSize)
      .toBe('22px');
    expect(render({ size: 48 }).el.querySelector('.rn-status__glyph').style.fontSize)
      .toBe('25px');
  });

  it('lets a slot replace the glyph with a real avatar image', () => {
    const { el } = render({}, (h) => h('img', { attrs: { id: 'face', src: 'a.png' } }));
    expect(el.querySelector('#face')).not.toBeNull();
    expect(el.querySelector('.rn-status__glyph')).toBeNull();
  });

  it('emits click so the host can open the agent', () => {
    const { el, ring } = render();
    const clicks = [];
    ring.$on('click', () => clicks.push(1));
    el.click();
    expect(clicks).toHaveLength(1);
  });
});
