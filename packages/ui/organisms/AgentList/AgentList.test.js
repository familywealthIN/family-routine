/* eslint-env jest */
/**
 * AgentList — the Agents page list column.
 *
 * What is locked here:
 *   1. status -> ring colour + breathing, with the ring's breathing rule coming
 *      from StatusRing (running/listening only) and never from this organism,
 *   2. the error state and the empty state are DIFFERENT screens — D-10: a
 *      failed load must never render as "you have no agents",
 *   3. after a failed load the stat tiles show '—', not 0.
 */
const Vue = require('vue');
const Vuetify = require('vuetify');

const AgentList = require('./AgentList.vue').default;
const { AGENT_STATUS } = require('../../constants/agents');

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const agent = (over = {}) => ({
  id: 'a1',
  name: 'PR Summarizer',
  taskRef: 'r1',
  routineTime: '09:00',
  routineName: 'Start Work',
  executionStatus: 'listening',
  successCount: 18,
  failureCount: 1,
  lastRunAt: '2026-10-02T09:02:00.000Z',
  lastResultType: 'html',
  ...over,
});

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(AgentList, { props: { agents: [agent()], ...props } }),
  }).$mount();
  return { vm, el: vm.$el, list: vm.$children[0] };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('AgentList — status to ring and badge', () => {
  it('paints the ring and the pill with the status colour and glyph', () => {
    const { el } = render({ agents: [agent({ executionStatus: 'failed' })] });
    const face = el.querySelector('[data-testid="status-ring-face"]');
    expect(face.style.boxShadow).toBe(`inset 0 0 0 2px ${AGENT_STATUS.failed.color}`);
    expect(text(q(el, 'agent-status-a1'))).toBe(`${AGENT_STATUS.failed.icon}Failed`);
  });

  it('breathes the ring while listening', () => {
    const { el } = render({ agents: [agent({ executionStatus: 'listening' })] });
    expect(el.querySelector('[data-testid="status-ring-pulse"]')).not.toBeNull();
  });

  it('breathes the ring while running', () => {
    const { el } = render({ agents: [agent({ executionStatus: 'running' })] });
    expect(el.querySelector('[data-testid="status-ring-pulse"]')).not.toBeNull();
  });

  it.each(['idle', 'finished', 'failed'])('leaves the ring still when %s', (status) => {
    const { el } = render({ agents: [agent({ executionStatus: status })] });
    expect(el.querySelector('[data-testid="status-ring-pulse"]')).toBeNull();
  });

  it('treats a missing or unknown executionStatus as idle rather than blank', () => {
    const { el } = render({ agents: [agent({ executionStatus: undefined })] });
    expect(text(q(el, 'agent-status-a1'))).toContain('Idle');
  });
});

describe('AgentList — a card', () => {
  it('shows the routine time and name, the ok/fail tally and the success width', () => {
    const { el } = render();
    const card = q(el, 'agent-card-a1');
    expect(text(card)).toContain('09:00');
    expect(text(card)).toContain('Start Work');
    expect(text(card)).toContain('18 ok · 1 failed');
    expect(card.querySelector('.rn-agl__bar-ok').style.width).toBe('95%');
  });

  it('falls back to the raw taskRef when the routine is gone', () => {
    const { el } = render({ agents: [agent({ routineName: '', routineTime: '' })] });
    expect(text(q(el, 'agent-card-a1'))).toContain('r1');
  });

  it('says a failed run failed instead of naming a result type', () => {
    const { el } = render({ agents: [agent({ executionStatus: 'failed' })] });
    expect(text(q(el, 'agent-card-a1'))).toContain('failed');
  });

  it('marks the selected card with the inset rule', () => {
    const { el } = render({ selectedId: 'a1' });
    expect(q(el, 'agent-card-a1').className).toContain('rn-agl__card--on');
  });

  it('emits select with the agent id', () => {
    const { el, list } = render();
    const seen = [];
    list.$on('select', (id) => seen.push(id));
    q(el, 'agent-card-a1').click();
    expect(seen).toEqual(['a1']);
  });
});

describe('AgentList — stat tiles', () => {
  it('sums runs, derives the overall success rate and counts the live agents', () => {
    const { el } = render({
      agents: [
        agent({ id: 'a1', executionStatus: 'listening', successCount: 18 }),
        agent({
          id: 'a2', executionStatus: 'finished', successCount: 31, failureCount: 0,
        }),
        agent({
          id: 'a3', executionStatus: 'idle', successCount: 0, failureCount: 0,
        }),
      ],
    });
    expect(text(q(el, 'agent-stat-runs'))).toContain('50');
    expect(text(q(el, 'agent-stat-success'))).toContain('98%');
    expect(text(q(el, 'agent-stat-live'))).toContain('1');
  });

  it('reads 0% rather than NaN% with no runs at all', () => {
    const { el } = render({ agents: [agent({ successCount: 0, failureCount: 0 })] });
    expect(text(q(el, 'agent-stat-success'))).toContain('0%');
  });

  // D-10: the totals are UNKNOWN after a failed load, not zero.
  it('shows a dash for every tile when the load failed', () => {
    const { el } = render({ agents: [], loadError: true });
    expect(text(q(el, 'agent-stat-runs'))).toContain('—');
    expect(text(q(el, 'agent-stat-success'))).toContain('—');
    expect(text(q(el, 'agent-stat-live'))).toContain('—');
  });
});

describe('AgentList — error vs empty', () => {
  it('renders the shared error state, not the empty copy, when the load failed', () => {
    const { el } = render({ agents: [], loadError: true });
    expect(el.querySelector('.load-error-state')).not.toBeNull();
    expect(text(el)).toContain('Nothing has been deleted');
    expect(q(el, 'agent-list-empty')).toBeNull();
    expect(text(el)).not.toContain('No agents yet');
  });

  it('renders the empty copy — never the error state — when there is simply nothing', () => {
    const { el } = render({ agents: [] });
    expect(el.querySelector('.load-error-state')).toBeNull();
    expect(q(el, 'agent-list-empty')).not.toBeNull();
    expect(text(el)).toContain('No agents yet');
  });

  it('keeps the cards when a refetch fails but agents are already on screen', () => {
    // The container only raises loadError with an empty list, so this is the
    // shape it hands over: an error AND rows.
    const { el } = render({ agents: [agent()], loadError: false });
    expect(el.querySelector('.load-error-state')).toBeNull();
    expect(q(el, 'agent-card-a1')).not.toBeNull();
  });

  it('offers a retry that asks the host to reload', () => {
    const { el, list } = render({ agents: [], loadError: true });
    const seen = [];
    list.$on('retry', () => seen.push(true));
    el.querySelector('.load-error-state__retry').click();
    expect(seen).toEqual([true]);
  });
});

describe('AgentList — shell', () => {
  it('keeps the phone card radius and the bigger tablet/desktop one apart', () => {
    expect(render({ shell: 'phone' }).el.className).toContain('rn-agl--phone');
    expect(render({ shell: 'tablet' }).el.className).toContain('rn-agl--tablet');
    expect(render({ shell: 'desktop' }).el.className).toContain('rn-agl--desktop');
  });
});
