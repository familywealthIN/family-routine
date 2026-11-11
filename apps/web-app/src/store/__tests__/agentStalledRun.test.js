/* eslint-env jest */
/**
 * D-13 — a stalled listening run is surfaced and can be cleared.
 *
 * A run is open from the start event until an end event closes it, and the
 * beta run found one that never closed: the morning briefing sat in
 * 'listening' across four days and five sessions with the top bar showing
 * `hearing` and /agents counting it "live now", with no error, no retry and no
 * way out of it.
 *
 * The rule under test is deliberately NOT "listening too long" — a run
 * legitimately listens for hours while the routine's slots fill. The clock
 * starts when the end event becomes DUE (the page's end rule, `markEndEventDue`)
 * and only runs while nothing is on the wire and the server still has the run
 * open today.
 */

// The store reads the GraphQL endpoint from the gitignored blob config; only
// the Service Worker job payload uses it, and that path is off in jsdom.
jest.mock('../../blob/config', () => ({ graphQLUrl: 'http://localhost/graphql' }), { virtual: true });

const { AGENT_STALL_MS } = require('@routine-notes/ui/constants/agents');

const agentStore = require('../agentStore').default;

const makeAgent = (over = {}) => ({
  id: 'agent-1',
  name: 'Morning briefing',
  taskRef: 'task-1',
  startEvent: { kind: 'url', value: 'https://hooks.test/webhook/wake-start' },
  endEvent: { kind: 'url', value: 'https://hooks.test/webhook/wake-end' },
  executionStatus: 'listening',
  successCount: 15,
  failureCount: 0,
  // The run was opened today — a run from another day can never be closed.
  lastRunAt: String(Date.now()),
  ...over,
});

const jsonResponse = () => Promise.resolve({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: () => 'application/json' },
  text: () => Promise.resolve('{"done":true}'),
});

const seed = async (agent, mutate) => {
  const apollo = {
    query: jest.fn(() => Promise.resolve({ data: { agents: [agent] } })),
    mutate: mutate || jest.fn(() => Promise.resolve({
      data: {
        recordAgentExecution: {
          ...agent, executionStatus: 'finished', successCount: agent.successCount + 1,
        },
      },
    })),
  };
  await agentStore.fetchAll(apollo);
  return apollo;
};

/** The same reading the UI takes, a given distance past the due stamp. */
const stalledAfter = (taskRef, ms) => agentStore.isStalled(taskRef, Date.now() + ms);

describe('agentStore.isStalled', () => {
  beforeEach(() => {
    global.fetch = jest.fn(jsonResponse);
  });

  afterEach(() => {
    agentStore.reset();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('is false for a run still listening with no end event due', async () => {
    await seed(makeAgent());
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
  });

  it('is false until the bound has passed, then true', async () => {
    await seed(makeAgent());
    agentStore.markEndEventDue('task-1');

    expect(agentStore.isStalled('task-1')).toBe(false);
    expect(stalledAfter('task-1', AGENT_STALL_MS - 1000)).toBe(false);
    expect(stalledAfter('task-1', AGENT_STALL_MS)).toBe(true);
  });

  it('measures the bound from the FIRST time the end event was due', async () => {
    await seed(makeAgent());
    agentStore.markEndEventDue('task-1');
    const firstDueAt = agentStore.endDueByRoutineId['task-1'];
    // fireDueEndEvents re-runs the rule on every open and pull to refresh; if
    // each one reset the stamp the bound would never be reached.
    agentStore.markEndEventDue('task-1');
    expect(agentStore.endDueByRoutineId['task-1']).toBe(firstDueAt);
  });

  it.each(['finished', 'failed', 'idle', 'running'])(
    'is false when the server no longer has the run listening (%s)',
    async (executionStatus) => {
      await seed(makeAgent({ executionStatus }));
      agentStore.markEndEventDue('task-1');
      expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
    },
  );

  it('is false for a run opened on an earlier day — it reads idle, not stalled', async () => {
    const yesterday = Date.now() - (26 * 60 * 60 * 1000);
    await seed(makeAgent({ lastRunAt: String(yesterday) }));
    agentStore.markEndEventDue('task-1');
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
  });

  it('is false while an end-event dispatch is on the wire, however long it is due', async () => {
    let releaseWebhook;
    global.fetch = jest.fn(() => new Promise((resolve) => {
      releaseWebhook = () => resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"done":true}'),
      });
    }));
    const apollo = await seed(makeAgent());
    agentStore.markEndEventDue('task-1');

    const dispatch = agentStore.fireEndEvent({
      apollo, vm: { $notify: jest.fn() }, taskRef: 'task-1', goalId: 'goal-1',
    });
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);

    releaseWebhook();
    await dispatch;
    // ...and once it closes, the run is finished rather than stalled.
    expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe('finished');
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
  });

  it('drops the due stamp when a new run opens, so a fresh run never reads stalled', async () => {
    const agent = makeAgent({ executionStatus: 'idle' });
    const apollo = await seed(agent, jest.fn(() => Promise.resolve({
      data: { recordAgentExecution: { ...agent, executionStatus: 'listening' } },
    })));
    agentStore.markEndEventDue('task-1');

    await agentStore.fireStartEventIfPresent({
      apollo, vm: { $notify: jest.fn() }, taskRef: 'task-1', implicit: true,
    });

    expect(agentStore.endDueByRoutineId['task-1']).toBeUndefined();
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
  });

  it('keeps the due stamp across a reload — the stall must survive the session', async () => {
    await seed(makeAgent());
    agentStore.markEndEventDue('task-1');
    const stored = JSON.parse(localStorage.getItem('agent-status-by-day'));
    expect(stored.endDue['task-1']).toBe(agentStore.endDueByRoutineId['task-1']);
  });
});

describe('clearing a stalled run from the UI', () => {
  beforeEach(() => {
    global.fetch = jest.fn(jsonResponse);
  });

  afterEach(() => {
    agentStore.reset();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  it('retries through the SAME end-event dispatch and closes the run', async () => {
    const apollo = await seed(makeAgent());
    agentStore.markEndEventDue('task-1');

    await agentStore.retryStalledRun({
      apollo, vm: { $notify: jest.fn() }, taskRef: 'task-1', goalId: 'goal-1',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://hooks.test/webhook/wake-end', { method: 'GET' });
    expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe('finished');
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
  });

  it('refuses to retry an end event whose URL still needs the day\'s goal item', async () => {
    const apollo = await seed(makeAgent({
      endEvent: { kind: 'url', value: 'https://hooks.test/end?goal={{ goal_id }}' },
    }));
    const notify = jest.fn();

    const result = await agentStore.retryStalledRun({ apollo, vm: { $notify: notify }, taskRef: 'task-1' });

    expect(result).toBeNull();
    // Better no webhook than one called with the literal placeholder in it.
    expect(global.fetch).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Retry this one from Home' }));
  });

  it('cancels the run as idle — no success, no transcript, badge gone', async () => {
    const agent = makeAgent();
    const mutate = jest.fn(() => Promise.resolve({
      data: { recordAgentExecution: { ...agent, executionStatus: 'idle' } },
    }));
    const apollo = await seed(agent, mutate);
    agentStore.setLocalStatus('task-1', 'listening');
    agentStore.markEndEventDue('task-1');

    const ok = await agentStore.cancelRun(apollo, 'task-1');

    expect(ok).toBe(true);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({ id: 'agent-1', status: 'idle' }),
    }));
    const [[{ variables }]] = mutate.mock.calls;
    expect(variables.incrementSuccess).toBeUndefined();
    expect(variables.incrementFailure).toBeUndefined();
    expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe('idle');
    expect(agentStore.statusFor('task-1')).toBe('');
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(false);
  });

  it('leaves the run alone and says so when the cancel cannot be recorded', async () => {
    const mutate = jest.fn(() => Promise.reject(new Error('Network error')));
    const apollo = await seed(makeAgent(), mutate);
    agentStore.setLocalStatus('task-1', 'listening');
    agentStore.markEndEventDue('task-1');

    const ok = await agentStore.cancelRun(apollo, 'task-1');

    expect(ok).toBe(false);
    expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe('listening');
    expect(stalledAfter('task-1', AGENT_STALL_MS * 10)).toBe(true);
  });
});
