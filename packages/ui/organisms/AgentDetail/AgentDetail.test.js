/* eslint-env jest */
/**
 * AgentDetail — the lifecycle, both events and the last result.
 *
 * The three contracts that are easy to break:
 *   1. the FAILED override: Running renders as a red `close` circle, not a blue
 *      spinner, and nothing breathes,
 *   2. a null end event reads "NONE" plus the sentence that explains what
 *      happens instead — not an empty black code block,
 *   3. Run test is honest: three labels, and while there is no server trigger it
 *      is disabled with the reason on screen (never a faked lifecycle).
 */
const Vue = require('vue');

const AgentDetail = require('./AgentDetail.vue').default;
const { AGENT_STATUS } = require('../../constants/agents');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const agent = (over = {}) => ({
  id: 'a1',
  name: 'PR Summarizer',
  taskRef: 'r1',
  executionStatus: 'listening',
  successCount: 18,
  failureCount: 1,
  lastRunAt: '2026-10-02T09:02:00',
  lastResultType: 'json',
  lastResultBody: '{"km":5.1}',
  lastError: null,
  startEvent: { kind: 'url', value: 'https://hooks.n8n.io/start?goal={{ goal_id }}' },
  endEvent: { kind: 'url', value: 'https://hooks.n8n.io/end?goal={{ goal_id }}' },
  ...over,
});

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(AgentDetail, {
      props: {
        agent: agent(), routineTime: '09:00', routineName: 'Start Work', now: '2026-10-02T12:00:00', ...props,
      },
    }),
  }).$mount();
  return { vm, el: vm.$el, detail: vm.$children[0] };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const dot = (el, key) => q(el, `agent-step-${key}`).querySelector('.rn-agd__dot');

describe('AgentDetail — the four-step lifecycle', () => {
  it('draws all four steps in order', () => {
    const { el } = render();
    const labels = Array.from(el.querySelectorAll('.rn-agd__step-label')).map((n) => n.textContent);
    expect(labels).toEqual(['Start event', 'Running', 'Listening', 'End event']);
  });

  it('marks everything before the current step done and breathes the current one', () => {
    const { el } = render({ agent: agent({ executionStatus: 'listening' }) });
    expect(dot(el, 'start').style.background).toBe('rgb(76, 175, 80)');
    expect(dot(el, 'running').style.background).toBe('rgb(76, 175, 80)');
    expect(dot(el, 'listening').getAttribute('data-breathing')).toBe('true');
    expect(dot(el, 'end').getAttribute('data-breathing')).toBe('false');
  });

  it('completes every step when the run finished', () => {
    const { el } = render({ agent: agent({ executionStatus: 'finished' }) });
    ['start', 'running', 'listening', 'end'].forEach((key) => {
      expect(dot(el, key).style.background).toBe('rgb(76, 175, 80)');
      expect(dot(el, key).getAttribute('data-breathing')).toBe('false');
    });
  });

  it('leaves every step cold while idle', () => {
    const { el } = render({ agent: agent({ executionStatus: 'idle' }) });
    ['start', 'running', 'listening', 'end'].forEach((key) => {
      expect(dot(el, key).style.background).toBe('rgba(0, 0, 0, 0.08)');
      expect(dot(el, key).getAttribute('data-breathing')).toBe('false');
    });
  });

  // THE override. On failure the Running step is where it broke.
  it('renders Running as a red close circle on failure, never a blue spinner', () => {
    const { el } = render({ agent: agent({ executionStatus: 'failed' }) });
    const running = dot(el, 'running');
    expect(running.style.background).toBe('rgb(229, 57, 53)');
    expect(text(running)).toBe('close');
    expect(running.getAttribute('data-breathing')).toBe('false');
    // and the step before it is still a completed start
    expect(dot(el, 'start').style.background).toBe('rgb(76, 175, 80)');
  });

  it('explains the status under the strip in the status colour', () => {
    const { el } = render({ agent: agent({ executionStatus: 'failed' }) });
    expect(text(q(el, 'agent-status-desc'))).toBe(AGENT_STATUS.failed.desc);
  });
});

describe('AgentDetail — events', () => {
  it('shows each event kind as an upper-case badge', () => {
    const { el } = render({
      agent: agent({ startEvent: { kind: 'curl', value: "curl -X POST https://x\n  -d '{}'" } }),
    });
    expect(text(q(el, 'agent-event-kind-start'))).toBe('CURL');
    expect(text(q(el, 'agent-event-value-start'))).toContain('curl -X POST');
  });

  it('keeps the {{ goal_id }} placeholder literal — it is substituted at dispatch', () => {
    const { el } = render();
    expect(q(el, 'agent-event-value-start').textContent).toContain('{{ goal_id }}');
  });

  it('reads NONE with the explaining sentence when there is no end event', () => {
    const { el } = render({ agent: agent({ endEvent: null }) });
    expect(text(q(el, 'agent-event-kind-end'))).toBe('NONE');
    expect(text(q(el, 'agent-event-value-end')))
      .toBe('No end event — the agent finishes when the start returns 200.');
    expect(q(el, 'agent-event-value-end').className).toContain('rn-agd__code--empty');
  });

  it('treats an end event with an empty value as no end event', () => {
    const { el } = render({ agent: agent({ endEvent: { kind: 'url', value: '' } }) });
    expect(text(q(el, 'agent-event-kind-end'))).toBe('NONE');
  });
});

describe('AgentDetail — stats and last result', () => {
  it('shows SUCCEEDED, FAILED and RATE', () => {
    const { el } = render();
    expect(text(q(el, 'agent-detail-succeeded'))).toContain('18');
    expect(text(q(el, 'agent-detail-failed'))).toContain('1');
    expect(text(q(el, 'agent-detail-rate'))).toContain('95%');
  });

  it('renders a json result in the light reward card, not a red error block', () => {
    const { el } = render();
    expect(q(el, 'agent-detail-error')).toBeNull();
    expect(text(q(el, 'agent-detail-result'))).toContain('"km":5.1');
  });

  it('renders the error block instead of a result when the run failed', () => {
    const { el } = render({
      agent: agent({ executionStatus: 'failed', lastError: 'POST https://x returned 500' }),
    });
    expect(q(el, 'agent-detail-result')).toBeNull();
    expect(text(q(el, 'agent-detail-error'))).toContain('returned 500');
  });

  it('offers the sandboxed transcript instead of injecting an HTML body', () => {
    const { el, detail } = render({
      agent: agent({ lastResultType: 'html', lastResultBody: '<script>alert(1)</script>' }),
    });
    expect(el.querySelector('script')).toBeNull();
    const seen = [];
    detail.$on('open-result', (id) => seen.push(id));
    q(el, 'agent-detail-view-result').click();
    expect(seen).toEqual(['a1']);
  });

  it('says so when no result has ever been saved', () => {
    const { el } = render({ agent: agent({ lastResultBody: '', lastResultType: null }) });
    expect(text(q(el, 'agent-detail-result'))).toContain('No result saved yet.');
  });

  it('dates the last result relative to today', () => {
    const { el } = render();
    expect(text(el)).toContain('Today 09:02');
  });
});

describe('AgentDetail — Run test', () => {
  it('is disabled with the reason on screen while no server trigger exists', () => {
    const { el } = render();
    expect(q(el, 'agent-run-test').disabled).toBe(true);
    expect(text(q(el, 'agent-run-test-why'))).toContain('server trigger');
  });

  it('emits nothing when tapped while disabled', () => {
    const { el, detail } = render();
    const seen = [];
    detail.$on('run-test', () => seen.push(true));
    q(el, 'agent-run-test').click();
    expect(seen).toEqual([]);
  });

  it('carries the three labels: Run test / Retry test / Running…', () => {
    expect(text(q(render().el, 'agent-run-test'))).toContain('Run test');
    const failed = render({ agent: agent({ executionStatus: 'failed' }) });
    expect(text(q(failed.el, 'agent-run-test'))).toContain('Retry test');
    const busy = render({ testing: true, canRunTest: true });
    expect(text(q(busy.el, 'agent-run-test'))).toContain('Running…');
  });

  it('emits run-test once enabled', () => {
    const { el, detail } = render({ canRunTest: true });
    const seen = [];
    detail.$on('run-test', (id) => seen.push(id));
    q(el, 'agent-run-test').click();
    expect(seen).toEqual(['a1']);
  });
});

describe('AgentDetail — header and empty state', () => {
  it('names the bound routine', () => {
    const { el } = render();
    expect(text(el)).toContain('Runs with 09:00 Start Work');
  });

  it('asks for a selection instead of rendering an empty agent', () => {
    const { el } = render({ agent: null });
    expect(q(el, 'agent-detail-empty')).not.toBeNull();
    expect(q(el, 'agent-lifecycle')).toBeNull();
  });

  it('emits edit and open-routine', () => {
    const { el, detail } = render();
    const seen = [];
    detail.$on('edit', (id) => seen.push(['edit', id]));
    detail.$on('open-routine', (ref) => seen.push(['open-routine', ref]));
    q(el, 'agent-detail-edit').click();
    q(el, 'agent-open-routine').click();
    expect(seen).toEqual([['edit', 'a1'], ['open-routine', 'r1']]);
  });
});
