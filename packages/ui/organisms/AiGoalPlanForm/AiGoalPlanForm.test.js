/* eslint-env jest */

// D-28: the timeline heading rendered as " Generated Monthly Plan (7 items)".
// The template newline between the icon and the label was compiled into the
// label's own text node, so the heading opened on an indent that reads as an
// icon which failed to load, next to the one that did.

// The atoms barrel and the markdown editor reach vue-radar and vue-easymde,
// whose .vue entry points are shipped untransformed and cannot be parsed here.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Vue = require('vue');
const Vuetify = require('vuetify');

const AiGoalPlanForm = require('./AiGoalPlanForm.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const entry = (index) => ({
  period: 'week',
  periodName: `Week ${index}`,
  date: `0${index}-09-2026`,
  title: `Milestone ${index}`,
  description: '',
});

const heading = (entryCount) => {
  const vm = new Vue({
    render: (h) => h(AiGoalPlanForm, {
      props: {
        searchQuery: 'ship the beta',
        selectedPeriod: 'month',
        milestoneData: {
          title: 'Ship the beta',
          description: '',
          period: 'month',
          entries: Array.from({ length: entryCount }, (unused, index) => entry(index + 1)),
        },
      },
    }),
  }).$mount();
  return vm.$el.querySelector('.v-timeline').previousElementSibling;
};

describe('AiGoalPlanForm timeline heading', () => {
  it('holds the label in its own element so nothing precedes it', () => {
    expect(heading(7).querySelector('span').textContent)
      .toBe('Generated Monthly Plan (7 items)');
  });

  it('leaves the icon separated by its own margin, not by an indent', () => {
    expect(heading(7).textContent).not.toMatch(/\s\s/);
  });
});
