/* eslint-env jest */

// D-28: three rows on /goals/milestones read "Invalid date - asdsad" — the
// body was junk the tester typed, but the date prefix is the UI's own output
// and has to degrade to nothing. Day rows also have to carry their month.

const Vue = require('vue');
const Vuetify = require('vuetify');

const GoalItemMilestoneTile = require('./GoalItemMilestoneTile.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const label = (goalItem) => {
  const vm = new Vue({
    render: (h) => h(GoalItemMilestoneTile, { props: { goalItem } }),
  }).$mount();
  return vm.$el.querySelector('h4').textContent.trim();
};

describe('GoalItemMilestoneTile label', () => {
  it('shows the body alone when the stored date cannot be read', () => {
    expect(label({
      id: 'g1', body: 'asdsad', period: 'day', date: 'asdsad', isComplete: false,
    })).toBe('asdsad');
  });

  it('tells two day rows in different months apart', () => {
    const march = {
      id: 'g1', body: 'Draft the outline', period: 'day', date: '08-03-2026', isComplete: false,
    };
    const april = { ...march, id: 'g2', date: '08-04-2026' };

    expect(label(march)).toBe('08 March - Draft the outline');
    expect(label(april)).toBe('08 April - Draft the outline');
  });
});
