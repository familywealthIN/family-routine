/* eslint-env jest */
/**
 * About's five feature tabs.
 *
 * The underline is the detail that matters: it is `SlidingSwitch`'s `underline`
 * variant, so its indicator sits at `i * 100% / 5` with `width: 100% / 5` — the
 * same geometry the 12h/24h thumb uses, not a second copy for five segments.
 */
const Vue = require('vue');

const AboutFeatureTabs = require('./AboutFeatureTabs.vue').default;
const { ABOUT_FEATURES } = require('../../constants/about');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({ render: (h) => h(AboutFeatureTabs, { props }) }).$mount();
  return { vm, tabs: vm.$children[0], el: vm.$el };
};

const tabNodes = (el) => Array.from(el.querySelectorAll('[data-testid="sliding-switch-segment"]'));
const indicator = (el) => el.querySelector('[data-testid="sliding-switch-indicator"]');
const text = (el, selector) => el.querySelector(selector).textContent.trim();

describe('OrganismAboutFeatureTabs — the five tabs', () => {
  it('renders exactly the five features, icon over label', () => {
    const { el } = mount();
    const labels = tabNodes(el).map((tab) => tab.textContent.trim());
    expect(labels).toHaveLength(5);
    ABOUT_FEATURES.forEach((feature, index) => {
      expect(labels[index]).toContain(feature.label);
      expect(labels[index]).toContain(feature.icon);
    });
  });

  it('opens on Routines', () => {
    const { el } = mount();
    expect(text(el, '[data-testid="about-feature-title"]')).toBe('Your day, time-boxed');
  });

  it('can be opened on a named tab', () => {
    const { el } = mount({ value: 'agents' });
    expect(text(el, '[data-testid="about-feature-title"]'))
      .toBe('Automation attached to routines');
  });

  it('ignores a tab name that does not exist', () => {
    const { el } = mount({ value: 'nonsense' });
    expect(text(el, '[data-testid="about-feature-title"]')).toBe('Your day, time-boxed');
  });
});

describe('OrganismAboutFeatureTabs — the sliding underline', () => {
  it('is one fifth wide — `100% / n`, folded by the browser', () => {
    expect(indicator(mount().el).style.width).toBe('calc(20%)');
  });

  it('moves one fifth per tab, so the underline sits under the one that is open', async () => {
    const { vm, el } = mount();
    const lefts = [];
    const count = tabNodes(el).length;
    for (let index = 0; index < count; index += 1) {
      tabNodes(el)[index].click();
      // eslint-disable-next-line no-await-in-loop
      await vm.$nextTick();
      lefts.push(indicator(el).style.left);
    }
    expect(lefts).toEqual(['calc(0%)', 'calc(20%)', 'calc(40%)', 'calc(60%)', 'calc(80%)']);
  });

  it('swaps the panel with the tab', async () => {
    const { vm, el } = mount();
    tabNodes(el)[2].click();
    await vm.$nextTick();
    expect(text(el, '[data-testid="about-feature-title"]'))
      .toContain('Do / Plan / Delegate / Automate');
  });

  it('reports which tab was picked', async () => {
    const { vm, tabs, el } = mount();
    const picked = [];
    tabs.$on('change', (key) => picked.push(key));
    tabNodes(el)[4].click();
    await vm.$nextTick();
    expect(picked).toEqual(['evolution']);
  });
});

describe('OrganismAboutFeatureTabs — each point leads with its term', () => {
  it('bolds the term and separates it with a middot', () => {
    const { el } = mount();
    const first = el.querySelectorAll('[data-testid="about-feature-point"]')[0];
    expect(first.querySelector('.rn-afeat__term').textContent.trim()).toBe('Punctuality window');
    expect(first.textContent).toContain('·');
    expect(first.querySelector('.rn-afeat__point-glyph').textContent.trim()).toBe('check_circle');
  });

  it('gives a point with no term an arrow instead of a tick', async () => {
    const { vm, el } = mount();
    tabNodes(el)[1].click();
    await vm.$nextTick();
    const points = Array.from(el.querySelectorAll('[data-testid="about-feature-point"]'));
    const glyphs = points.map((point) => point.querySelector('.rn-afeat__point-glyph').textContent.trim());
    expect(glyphs).toEqual(['arrow_right', 'check_circle', 'check_circle', 'arrow_right']);
    expect(points[0].querySelector('.rn-afeat__term')).toBeNull();
  });

  it('says six months a year on the Goals tab, not the design\'s nine', async () => {
    const { vm, el } = mount();
    tabNodes(el)[1].click();
    await vm.$nextTick();
    expect(el.textContent).toContain('six months a year');
    expect(el.textContent).not.toContain('nine months');
  });
});

describe('OrganismAboutFeatureTabs — the external link', () => {
  it('appears on Evolution only, and opens safely', async () => {
    const { vm, el } = mount();
    expect(el.querySelector('[data-testid="about-feature-link"]')).toBeNull();

    tabNodes(el)[4].click();
    await vm.$nextTick();
    const link = el.querySelector('[data-testid="about-feature-link"]');
    expect(link.getAttribute('href'))
      .toBe('https://blog.familywealth.in/2022/01/point-system-of-family-routine.html');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.textContent).toContain('Read the full soldier analogy');
  });
});
