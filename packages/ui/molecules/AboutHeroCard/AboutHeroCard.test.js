/* eslint-env jest */
/**
 * About's hero. The version line is the thing worth guarding: the design's
 * "Version 2.0 · beta 3" is a placeholder, and nothing in the repo stamps a
 * release channel — so none is invented, and an unknown version prints no line
 * at all rather than "Version undefined".
 */
const Vue = require('vue');

const AboutHeroCard = require('./AboutHeroCard.vue').default;
const { ABOUT_BELIEF } = require('../../constants/about');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => new Vue({
  render: (h) => h(AboutHeroCard, { props }),
}).$mount().$el;

describe('MoleculeAboutHeroCard', () => {
  it('makes the belief the hero line', () => {
    const el = mount();
    expect(el.querySelector('[data-testid="about-belief"]').textContent.trim()).toBe(ABOUT_BELIEF);
  });

  it('prints the version it is given, and no channel', () => {
    const el = mount({ version: '0.1.0' });
    expect(el.querySelector('[data-testid="about-version"]').textContent.trim())
      .toBe('Version 0.1.0');
    expect(el.textContent).not.toContain('beta');
  });

  it('renders no version line at all when there is none to render', () => {
    const el = mount();
    expect(el.querySelector('[data-testid="about-version"]')).toBeNull();
    expect(el.textContent).not.toContain('undefined');
  });

  it('keeps the emphasis on "moved"', () => {
    expect(mount().querySelector('.rn-ahero__sub i').textContent.trim()).toBe('moved');
  });
});
