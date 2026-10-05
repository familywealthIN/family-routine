/* eslint-env jest */
const Vue = require('vue');

const RoutineTopBar = require('./RoutineTopBar.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => new Vue({
  render: (h) => h(RoutineTopBar, { props }),
}).$mount().$el;

describe('OrganismRoutineTopBar — day summary', () => {
  // The phone shows the same "n routines left · n/9 tasks" line the large
  // shells carry in their header.
  it('shows the day summary under the title', () => {
    const el = render({ subtitle: '5 routines left · 7/9 tasks' });
    expect(el.querySelector('[data-testid="topbar-day-summary"]').textContent)
      .toBe('5 routines left · 7/9 tasks');
    expect(el.querySelector('.rn-topbar__title-text').textContent).toBe('Home');
  });

  it('draws no empty line when there is no summary', () => {
    expect(render().querySelector('[data-testid="topbar-day-summary"]')).toBeNull();
  });
});
