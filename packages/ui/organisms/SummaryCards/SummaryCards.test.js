/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const Vue = require('vue');
const Vuetify = require('vuetify');

const SummaryCards = require('./SummaryCards.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => new Vue({
  render: (h) => h(SummaryCards, { props }),
}).$mount().$el;

// D-22: the AI writes this card's text as markdown, and it was printed raw.
describe('OrganismSummaryCards', () => {
  it('renders the summary as markdown instead of printing the asterisks', () => {
    const el = render({ summary: '**Goal Overview:** three goals are in flight' });

    expect(el.querySelector('strong').textContent).toBe('Goal Overview:');
    expect(el.textContent).not.toContain('**');
  });

  it('escapes embedded HTML rather than injecting it', () => {
    const el = render({ summary: '<img src=x onerror=alert(1)>' });

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('still shows the error message instead of the summary', () => {
    const el = render({ summary: '**hidden**', error: 'Could not load' });

    expect(el.textContent).toContain('Could not load');
    expect(el.querySelector('strong')).toBeNull();
  });
});
