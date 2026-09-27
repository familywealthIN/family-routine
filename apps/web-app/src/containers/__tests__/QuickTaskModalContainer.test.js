/* eslint-env jest */
/**
 * D-22: the Home routine modal printed its description verbatim, so the
 * markdown the routine templates and the AI planner write ("**Meditation
 * (15 mins):** ...") reached the user as literal asterisks.
 *
 * The description is read-only here, so it now goes through vue-markdown —
 * the renderer YearGoalsTime and NextSteps already use — with `html` off,
 * because routine descriptions are user-supplied and AI-generated and must
 * never be able to inject markup.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Vue = require('vue');
const Vuetify = require('vuetify');

const Container = require('../QuickTaskModalContainer.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (description) => new Vue({
  render: (h) => h(Container, { props: { value: true, title: 'Meditation', description } }),
}).$mount().$el;

describe('QuickTaskModalContainer description', () => {
  it('renders bold markdown instead of printing the asterisks', () => {
    const el = render('**Meditation (15 mins):** Loving-kindness (Metta) meditation');

    expect(el.querySelector('strong')).not.toBeNull();
    expect(el.querySelector('strong').textContent).toBe('Meditation (15 mins):');
    expect(el.textContent).not.toContain('**');
  });

  it('renders a markdown bullet list as a list', () => {
    const el = render('- Sit down\n- Breathe');

    expect(el.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders nothing for a routine that carries no description', () => {
    // The server leaves description null on routine items that never had one,
    // and markdown-it throws on anything that is not a string.
    const el = render(null);

    expect(el.textContent).not.toContain('null');
  });

  it('escapes embedded HTML rather than injecting it', () => {
    const el = render('<img src=x onerror=alert(1)> **safe**');

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(el.querySelector('strong').textContent).toBe('safe');
  });
});
