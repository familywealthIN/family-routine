/* eslint-env jest */
/**
 * "Getting started" — three numbered steps, each a door.
 *
 * The old page said all three in one paragraph. The thing to guard is that each
 * step is a real `<a href>` (so middle-click works) whose click is intercepted
 * and handed to the page, because the router is never the component's.
 */
const Vue = require('vue');

const GettingStartedCard = require('./GettingStartedCard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = () => {
  const vm = new Vue({ render: (h) => h(GettingStartedCard) }).$mount();
  const card = vm.$children[0];
  const routed = [];
  card.$on('navigate', (route) => routed.push(route));
  return { vm, el: vm.$el, routed };
};

describe('MoleculeGettingStartedCard', () => {
  it('numbers three steps', () => {
    const { el } = mount();
    const numbers = Array.from(el.querySelectorAll('.rn-astart__n')).map((n) => n.textContent.trim());
    expect(numbers).toEqual(['1', '2', '3']);
  });

  it('links each step to the page where you do that thing', () => {
    const { el } = mount();
    expect(el.querySelector('[data-testid="getting-started-routines"]').getAttribute('href'))
      .toBe('/settings');
    expect(el.querySelector('[data-testid="getting-started-year-goals"]').getAttribute('href'))
      .toBe('/year-goals');
    expect(el.querySelector('[data-testid="getting-started-home"]').getAttribute('href'))
      .toBe('/home');
  });

  it('hands the route to the page instead of reloading the app', () => {
    const { el, routed } = mount();
    el.querySelector('[data-testid="getting-started-home"]').click();
    expect(routed).toEqual(['/home']);
  });

  it('drops the divider under the last step', () => {
    const { el } = mount();
    const steps = el.querySelectorAll('.rn-astart__step');
    expect(steps[2].className).toContain('rn-astart__step--last');
    expect(steps[0].className).not.toContain('rn-astart__step--last');
  });
});
