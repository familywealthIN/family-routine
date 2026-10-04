/* eslint-env jest */
const Vue = require('vue');

const RoutineRail = require('./RoutineRail.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => new Vue({
  render: (h) => h(RoutineRail, {
    props: {
      routines: [{ id: 'a', name: 'Wake Up', time: '06:00' }],
      tickedCount: 0,
      ...props,
    },
  }),
}).$mount().$el;

const header = (el) => el.querySelector('.rn-rail__header').textContent.replace(/\s+/g, ' ').trim();

describe('MoleculeRoutineRail header', () => {
  it('defaults to TODAY', () => {
    expect(header(render())).toBe('TODAY · 0 of 1 ticked');
  });

  // Viewing another day used to still say TODAY.
  it('names the viewed day when given one', () => {
    expect(header(render({ dayLabel: 'FRI 2 OCT' }))).toBe('FRI 2 OCT · 0 of 1 ticked');
  });
});
