/* eslint-env jest */
/**
 * D-10 follow-up: /agents must paint the shared LoadErrorState — not Vuetify's
 * "No data available" — when the agents query fails and nothing is cached.
 *
 * Unlike the other suites here this one really renders: the defect lived in
 * slot plumbing (AtomDataTable re-forwards every slot as a SCOPED slot, while
 * the Vuetify 1.5 table reads its empty content from `$slots['no-data']`), and
 * only a render can prove the states are distinct. @vue/test-utils is v2 and
 * cannot mount a Vue 2 component, so we mount with plain Vue + Vuetify.
 */
// The page pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the error handling.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Vue = require('vue');
const Vuetify = require('vuetify');

const Agents = require('../Agents.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

// The agent-edit modal mounts closed; without this Vuetify's detachable mixin
// warns it cannot find [data-app] for the routine select's menu.
beforeAll(() => document.body.setAttribute('data-app', 'true'));

const render = ({ error = null, agents = [], loading = false } = {}) => {
  const fetchAll = jest.fn();
  Vue.prototype.$agent = {
    agents, error, loading, fetchAll,
  };
  const vm = new Vue({ render: (h) => h(Agents) }).$mount();
  return { el: vm.$el, fetchAll };
};

// Scope every assertion to the table card: the (closed) agent-edit modal is
// rendered too and its routine v-select carries its own "No data available".
const text = (el) => el.querySelector('.image-card-page').textContent.replace(/\s+/g, ' ');

describe('Agents load error state', () => {
  it('renders the error state, not an empty table, when the query failed', () => {
    const { el } = render({ error: new Error('Failed to fetch') });
    expect(el.querySelector('.load-error-state')).not.toBeNull();
    expect(text(el)).toContain('Nothing has been deleted');
    expect(text(el)).not.toContain('No data available');
    expect(text(el)).not.toContain('No agents yet');
  });

  it('offers a retry that refetches the agents', () => {
    const { el, fetchAll } = render({ error: new Error('Failed to fetch') });
    const retry = el.querySelector('.load-error-state__retry');
    expect(retry).not.toBeNull();
    retry.click();
    expect(fetchAll).toHaveBeenCalled();
  });

  it('renders the empty copy — never the error state — when there is simply nothing', () => {
    const { el } = render();
    expect(el.querySelector('.load-error-state')).toBeNull();
    expect(text(el)).toContain('No agents yet');
    expect(text(el)).not.toContain('No data available');
  });

  it('keeps showing cached agents when a refetch fails', () => {
    const { el } = render({
      error: new Error('boom'),
      agents: [{ id: 'a1', name: 'Morning brief', taskRef: 'r1' }],
    });
    expect(el.querySelector('.load-error-state')).toBeNull();
    expect(text(el)).toContain('Morning brief');
  });
});
