/* eslint-env jest */
const fs = require('fs');
const path = require('path');
const Vue = require('vue');

const RoutineComposer = require('./RoutineComposer.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const SRC = fs.readFileSync(path.join(__dirname, 'RoutineComposer.vue'), 'utf8');
const CSS = (SRC.match(/<style>([\s\S]*)<\/style>/) || ['', ''])[1]
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The composer is styled from a global `<style>` block, which vue-jest does not
 * inject into jsdom, so a size that lives in CSS has to be read off the source.
 * Selectors are matched exactly, never as a substring.
 */
const declOf = (selector, prop) => {
  const rules = CSS.match(/[^{}]+\{[^{}]*\}/g) || [];
  const matching = rules.filter((rule) => rule
    .split('{')[0]
    .split(',')
    .some((sel) => sel.trim() === selector));
  if (!matching.length) return null;
  const body = matching[matching.length - 1].split('{')[1];
  const hit = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
  return hit ? hit[1].trim() : null;
};

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(RoutineComposer, { props: { ...props } }),
  }).$mount();
  return { vm, composer: vm.$children[0], el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

const SHELLS = ['phone', 'tablet', 'desktop'];

describe('OrganismRoutineComposer — the "+" is on every shell', () => {
  // It used to be `v-if="variant === 'phone'"`, so the tablet and desktop
  // composers shipped with no way into the capture sheet at all — the design
  // draws the circle in all three frames.
  it('renders the add button on phone, tablet and desktop alike', () => {
    SHELLS.forEach((variant) => {
      expect(testid(render({ variant }).el, 'composer-add')).not.toBeNull();
    });
  });

  it('emits add-task from every shell', () => {
    SHELLS.forEach((variant) => {
      const { composer, el } = render({ variant });
      const fired = [];
      composer.$on('add-task', () => fired.push(variant));
      testid(el, 'composer-add').click();
      expect(fired).toEqual([variant]);
    });
  });

  it('is a 40px circle on the phone and a 42px one in the panes', () => {
    expect(declOf('.rn-composer__plus', 'width')).toBe('40px');
    expect(declOf('.rn-composer__plus', 'height')).toBe('40px');
    expect(declOf('.rn-composer--desktop .rn-composer__plus', 'width')).toBe('42px');
    expect(declOf('.rn-composer--desktop .rn-composer__plus', 'height')).toBe('42px');
  });
});

/**
 * Measured against the rendered desktop screen the composer was a step off the
 * design everywhere: `10px 12px 12px` of padding (design `12px 16px 16px`), a
 * 34px send button (36) and 16px input text (15). Nothing pinned those numbers,
 * which is how the drift shipped.
 */
describe('OrganismRoutineComposer — metrics', () => {
  it('pads the pane composers 12px 16px 16px', () => {
    expect(declOf('.rn-composer--desktop', 'padding')).toBe('12px 16px 16px');
    expect(declOf('.rn-composer--tablet', 'padding'))
      .toBe(declOf('.rn-composer--desktop', 'padding'));
  });

  it('keeps the phone composer flush with the card column', () => {
    expect(declOf('.rn-composer', 'padding')).toBe('10px 0');
  });

  it('sends with a 34px button on the phone and a 36px one in the panes', () => {
    expect(declOf('.rn-composer__send', 'width')).toBe('34px');
    expect(declOf('.rn-composer__send', 'height')).toBe('34px');
    expect(declOf('.rn-composer--desktop .rn-composer__send', 'width')).toBe('36px');
    expect(declOf('.rn-composer--desktop .rn-composer__send', 'height')).toBe('36px');
  });

  // The design pins 15px everywhere, and the panes render it. The phone keeps
  // 16px as a documented departure: iOS Safari auto-zooms a focused input under
  // 16px and never zooms back out, and the only viewport cure
  // (`maximum-scale=1` / `user-scalable=no`) disables pinch-zoom for everyone.
  it('renders the design 15px in the panes and 16px on the phone', () => {
    expect(declOf('.rn-composer__input', 'font-size')).toBe('15px');
    expect(declOf('.rn-composer--phone .rn-composer__input', 'font-size')).toBe('16px');
    ['tablet', 'desktop'].forEach((variant) => {
      expect(declOf(`.rn-composer--${variant} .rn-composer__input`, 'font-size')).toBeNull();
    });
  });

  it('keeps the pill 44px on the phone and 46px in the panes', () => {
    expect(render({ variant: 'phone' }).composer.pillStyle.height).toBe('44px');
    expect(render({ variant: 'desktop' }).composer.pillStyle.height).toBe('46px');
  });
});

describe('OrganismRoutineComposer — send behaviour', () => {
  it('sends the trimmed value and nothing when empty', () => {
    const { composer, el } = render({ value: '  break it down  ' });
    const sent = [];
    composer.$on('send', (text) => sent.push(text));
    testid(el, 'composer-send').click();
    expect(sent).toEqual(['break it down']);

    const blank = render({ value: '   ' });
    const none = [];
    blank.composer.$on('send', (text) => none.push(text));
    blank.composer.send();
    expect(none).toEqual([]);
  });

  it('greys the send button out until there is something to send', () => {
    expect(testid(render({ value: '' }).el, 'composer-send').style.background)
      .toBe('rgba(0, 0, 0, 0.2)');
    expect(testid(render({ value: 'hi' }).el, 'composer-send').style.background)
      .toBe('rgb(40, 139, 213)');
  });

  it('emits focus so the host can collapse the checklist', () => {
    const { composer, el } = render();
    const focused = [];
    composer.$on('focus', () => focused.push(true));
    const input = testid(el, 'composer-input');
    input.dispatchEvent(new window.Event('focus'));
    expect(focused).toEqual([true]);
  });
});

describe('OrganismRoutineComposer — purity', () => {
  // packages/ui/** is props in, events out: no Apollo, no router, no stores.
  it('never reaches for the router, a store or Apollo', () => {
    expect(SRC).not.toMatch(/\$router|\$route\b|\$apollo|vue-apollo|graphql/);
  });
});
