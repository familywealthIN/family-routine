/* eslint-env jest */
/**
 * D-10 follow-up, re-pointed at the rebuilt /agents (design: Agents.dc.html).
 *
 * The page must paint the shared LoadErrorState — not an empty list — when the
 * agents query fails and nothing is cached, and it must paint the *empty* copy
 * when the user genuinely has no agents. The original defect lived in the Vuetify
 * data table's slot plumbing; that table is gone, but the two states are the
 * contract, not the widget, so the regression test stays.
 *
 * This mounts the real container over the real organism: the distinction is only
 * worth anything end to end. @vue/test-utils is v2 and cannot mount a Vue 2
 * component, so we mount with plain Vue + Vuetify (LoadErrorState uses the
 * Vuetify atoms).
 *
 * vue-apollo is NOT installed here, so the container's `routineItems` smart query
 * is inert and the list simply renders with un-joined routine names — which is
 * exactly the state a failed load leaves behind anyway.
 */
const Vue = require('vue');
const Vuetify = require('vuetify');

const AgentsListContainer = require('../../containers/AgentsListContainer.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = ({ error = null, agents = [], loading = false } = {}) => {
  const fetchAll = jest.fn();
  Vue.prototype.$agent = {
    agents, error, loading, fetchAll,
  };
  const vm = new Vue({ render: (h) => h(AgentsListContainer) }).$mount();
  return { el: vm.$el, fetchAll };
};

const text = (el) => el.textContent.replace(/\s+/g, ' ');
const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('Agents load error state', () => {
  it('renders the error state, not an empty list, when the query failed', () => {
    const { el } = render({ error: new Error('Failed to fetch') });
    expect(el.querySelector('.load-error-state')).not.toBeNull();
    expect(text(el)).toContain('Nothing has been deleted');
    expect(q(el, 'agent-list-empty')).toBeNull();
    expect(text(el)).not.toContain('No agents yet');
  });

  it('offers a retry that refetches the agents', () => {
    const { el, fetchAll } = render({ error: new Error('Failed to fetch') });
    // created() already fetched once; the retry is the second call.
    expect(fetchAll).toHaveBeenCalledTimes(1);
    el.querySelector('.load-error-state__retry').click();
    expect(fetchAll).toHaveBeenCalledTimes(2);
  });

  it('renders the empty copy — never the error state — when there is simply nothing', () => {
    const { el } = render();
    expect(el.querySelector('.load-error-state')).toBeNull();
    expect(text(el)).toContain('No agents yet');
  });

  it('keeps showing cached agents when a refetch fails', () => {
    const { el } = render({
      error: new Error('boom'),
      agents: [{ id: 'a1', name: 'Morning brief', taskRef: 'r1' }],
    });
    expect(el.querySelector('.load-error-state')).toBeNull();
    expect(text(el)).toContain('Morning brief');
  });

  it('shows the totals as "—" after a failed load, never as 0', () => {
    const { el } = render({ error: new Error('Failed to fetch') });
    expect(text(q(el, 'agent-stat-runs'))).toContain('—');
    expect(text(q(el, 'agent-stat-success'))).toContain('—');
    expect(text(q(el, 'agent-stat-live'))).toContain('—');
  });

  it('shows the real totals when the load succeeded', () => {
    const { el } = render({
      agents: [{
        id: 'a1', name: 'Morning brief', taskRef: 'r1', successCount: 3, failureCount: 1,
      }],
    });
    expect(text(q(el, 'agent-stat-runs'))).toContain('4');
    expect(text(q(el, 'agent-stat-success'))).toContain('75%');
  });
});
