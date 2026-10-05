/* eslint-env jest */
/**
 * Contract test for agentStore.fireEndEvent.
 *
 * An end event CLOSES an agent run, so it may only be dispatched while one is
 * open — the same rule recordAgentExecution enforces server-side.
 *
 * Regression: "Start Task" completes a routine task without running its agent
 * (fireAgent:false), so ticking the goal item it creates fills the task's
 * counter with no run ever opened. The end webhook was dispatched anyway; the
 * server refused the close, and the client booked that refusal as a dispatch
 * failure — resetting an agent that had genuinely finished back to 'idle'.
 */

// The store reads the GraphQL endpoint from the gitignored blob config; only
// the Service Worker job payload uses it, and that path is off in jsdom.
jest.mock('../../blob/config', () => ({ graphQLUrl: 'http://localhost/graphql' }), { virtual: true });

const agentStore = require('../agentStore').default;

const makeAgent = (over = {}) => ({
  id: 'agent-1',
  name: 'Morning briefing',
  taskRef: 'task-1',
  startEvent: { kind: 'url', value: 'https://hooks.test/webhook/test-start-flow' },
  endEvent: { kind: 'url', value: 'https://hooks.test/webhook/test-end-flow' },
  executionStatus: 'idle',
  successCount: 3,
  failureCount: 0,
  // The run was opened today — only today's trigger can be closed.
  lastRunAt: String(Date.now()),
  ...over,
});

const jsonResponse = () => Promise.resolve({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ done: true }),
});

// Seeds the store the way the app does — through the agents query.
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

describe('agentStore.fireEndEvent', () => {
  beforeEach(() => {
    global.fetch = jest.fn(jsonResponse);
  });

  afterEach(() => {
    agentStore.reset();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  it.each(['idle', 'finished', 'failed'])(
    'dispatches nothing and records nothing when the agent is %s (no run open)',
    async (executionStatus) => {
      const agent = makeAgent({ executionStatus });
      const apollo = await seed(agent);

      const result = await agentStore.fireEndEvent({
        apollo, vm: { $notify: jest.fn() }, taskRef: 'task-1', goalId: 'goal-1',
      });

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(apollo.mutate).not.toHaveBeenCalled();
      // The record of the run that did happen is left exactly as it was.
      expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe(executionStatus);
      expect(agentStore.agentsByTaskRef['task-1'].failureCount).toBe(0);
    },
  );

  it('dispatches once and books exactly one success when a run is open', async () => {
    const agent = makeAgent({ executionStatus: 'listening' });
    const apollo = await seed(agent);
    const vm = { $notify: jest.fn() };

    await agentStore.fireEndEvent({
      apollo, vm, taskRef: 'task-1', goalId: 'goal-1',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('https://hooks.test/webhook/test-end-flow', { method: 'GET' });
    expect(apollo.mutate).toHaveBeenCalledTimes(1);
    expect(apollo.mutate.mock.calls[0][0].variables).toMatchObject({
      id: 'agent-1', status: 'finished', incrementSuccess: 1, incrementFailure: 0,
    });
    expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe('finished');
  });

  it("leaves a run opened on a previous day alone — today's ticks cannot close it", async () => {
    const yesterday = String(Date.now() - 36 * 60 * 60 * 1000);
    const agent = makeAgent({ executionStatus: 'listening', lastRunAt: yesterday });
    const apollo = await seed(agent);

    const result = await agentStore.fireEndEvent({
      apollo, vm: { $notify: jest.fn() }, taskRef: 'task-1', goalId: 'goal-1',
    });

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(apollo.mutate).not.toHaveBeenCalled();
  });

  it('never books a failure when the server refuses to record the close', async () => {
    const agent = makeAgent({ executionStatus: 'listening' });
    const refuse = jest.fn(() => Promise.reject(
      new Error('409:Agent has no run in progress (idle) - end event ignored'),
    ));
    const apollo = await seed(agent, refuse);
    const vm = { $notify: jest.fn() };
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await agentStore.fireEndEvent({
      apollo, vm, taskRef: 'task-1', goalId: 'goal-1',
    });

    expect(result).toBeNull();
    // The refused record is the only mutation — no second one booking a
    // failure and overwriting the status the refusal protects.
    expect(apollo.mutate).toHaveBeenCalledTimes(1);
    expect(agentStore.agentsByTaskRef['task-1'].executionStatus).toBe('listening');
    // ...and it says so rather than failing silently.
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
  });
});

describe("agentStore — badges are only about today's trigger", () => {
  afterEach(() => {
    agentStore.reset();
    jest.restoreAllMocks();
  });

  it('shows a badge set today', () => {
    agentStore.setLocalStatus('task-1', 'listening');
    expect(agentStore.statusFor('task-1')).toBe('listening');
  });

  it('shows nothing once the day the badges were set has passed', () => {
    agentStore.setLocalStatus('task-1', 'finished');
    agentStore.state.statusDay = '01-01-2020';
    expect(agentStore.statusFor('task-1')).toBe('');
  });

  it('drops every previous-day badge when a new one is set after midnight', () => {
    agentStore.setLocalStatus('task-1', 'listening');
    agentStore.state.statusDay = '01-01-2020';
    agentStore.setLocalStatus('task-2', 'running');
    expect(agentStore.statusByRoutineId['task-1']).toBeUndefined();
    expect(agentStore.statusFor('task-2')).toBe('running');
  });
});
