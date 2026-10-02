/* eslint-env jest */
const Vue = require('vue');
const Vuetify = require('vuetify');

const TaskActionButtons = require('./TaskActionButtons.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

// D-16: "Start Agent" on a passed task pays the task's frozen redeem price,
// so the buttons that spend points must carry that price before they are hit.
const costLabelFor = (redeemCost) => TaskActionButtons.computed.costLabel.call({ redeemCost });

describe('MoleculeTaskActionButtons costLabel', () => {
  it('shows the price the task will be charged', () => {
    expect(costLabelFor(15)).toBe('15');
  });

  it('rounds a fractional price to whole points', () => {
    expect(costLabelFor(14.6)).toBe('15');
  });

  it('shows nothing when the action is free', () => {
    expect(costLabelFor(0)).toBe('');
    expect(costLabelFor(undefined)).toBe('');
  });
});

// The price used to be loose markup in a row that could not fit a phone, which
// needs a render to pin down: the grid class and the pill are both layout, and
// a typo in either is invisible to a computed-property test.
describe('MoleculeTaskActionButtons layout', () => {
  const render = (props = {}) => new Vue({
    render: (h) => h(TaskActionButtons, { props }),
  }).$mount().$el;

  it('claims a full grid row, so the buttons cannot size to their own content', () => {
    // Vuetify defines `.flex.xs12`; there is no `x12`, so that typo silently
    // dropped the width basis and let the row overflow the dialog.
    const el = render({ agentState: 'assigned', redeemCost: 15 });
    expect(el.classList.contains('xs12')).toBe(true);
    expect(el.classList.contains('x12')).toBe(false);
  });

  it('wraps the price in a single pill per spending button', () => {
    const el = render({ agentState: 'assigned', redeemCost: 15 });
    const pills = el.querySelectorAll('.task-action-buttons__cost');
    expect(pills).toHaveLength(2);
    pills.forEach((p) => {
      // Spacing is CSS, not template whitespace (compilers disagree on whether
      // the newline survives), so assert the parts, not the exact string.
      expect(p.querySelector('.v-icon')).not.toBeNull();
      expect(p.textContent.replace(/\s+/g, '')).toContain('15');
      // Loose digits beside a v-icon--right is what split the price apart.
      expect(p.querySelector('.v-icon--right')).toBeNull();
    });
  });

  it('carries no price pill when the action is free', () => {
    const el = render({ agentState: 'assigned', redeemCost: 0 });
    expect(el.querySelectorAll('.task-action-buttons__cost')).toHaveLength(0);
  });

  it('prices only the spending buttons, never Build Agent', () => {
    const el = render({ agentState: 'none', redeemCost: 15 });
    expect(el.textContent).toContain('Build Agent');
    expect(el.querySelectorAll('.task-action-buttons__cost')).toHaveLength(1);
  });
});
