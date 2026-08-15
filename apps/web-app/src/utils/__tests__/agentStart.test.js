import { startAgentWhenReady, pollForValue, isTempId } from '../agentStart';

const AGENT = { id: 'a1', startEvent: { kind: 'url', value: 'http://x/{{goal_id}}' } };

/** Deps with sane defaults; override per test. */
function makeDeps(overrides = {}) {
  return {
    taskRef: 'task-1',
    agent: AGENT,
    readGoalId: () => 'goal-real',
    isSettled: () => true,
    setStatus: jest.fn(),
    clearStatus: jest.fn(),
    fire: jest.fn().mockResolvedValue(undefined),
    notify: jest.fn(),
    implicit: true,
    // Fast polling so the tests don't sit around.
    pollOptions: { timeoutMs: 1000, intervalMs: 5 },
    ...overrides,
  };
}

describe('isTempId', () => {
  it('recognises Apollo optimistic ids', () => {
    expect(isTempId('temp-123-day')).toBe(true);
    expect(isTempId('66c0f1a2b3')).toBe(false);
    expect(isTempId(null)).toBe(false);
    expect(isTempId('')).toBe(false);
  });
});

describe('pollForValue', () => {
  it('resolves immediately when the value is already there', async () => {
    await expect(pollForValue(() => 'here', { timeoutMs: 50, intervalMs: 5 })).resolves.toBe('here');
  });

  it('resolves once the value appears', async () => {
    let n = 0;
    const read = () => { n += 1; return n >= 3 ? 'ready' : null; };
    await expect(pollForValue(read, { timeoutMs: 1000, intervalMs: 1 })).resolves.toBe('ready');
  });

  it("resolves '' at the deadline", async () => {
    await expect(pollForValue(() => null, { timeoutMs: 20, intervalMs: 5 })).resolves.toBe('');
  });

  it('treats a throwing read as "not ready yet" instead of exploding', async () => {
    let n = 0;
    const read = () => {
      n += 1;
      if (n < 3) throw new Error('cache not populated');
      return 'ready';
    };
    await expect(pollForValue(read, { timeoutMs: 1000, intervalMs: 1 })).resolves.toBe('ready');
  });
});

describe('startAgentWhenReady', () => {
  it('fires immediately when a real goal id is already available', async () => {
    const deps = makeDeps();
    const outcome = await startAgentWhenReady(deps);

    expect(outcome).toBe('fired');
    expect(deps.fire).toHaveBeenCalledWith({ goalId: 'goal-real', implicit: true });
    // No pause happened, so nothing should have flashed a waiting badge.
    expect(deps.setStatus).not.toHaveBeenCalled();
  });

  it('does nothing when the task has no agent', async () => {
    const deps = makeDeps({ agent: null });
    expect(await startAgentWhenReady(deps)).toBe('no-agent');
    expect(deps.setStatus).not.toHaveBeenCalled();
    expect(deps.fire).not.toHaveBeenCalled();
  });

  it('does nothing when the agent has no start event', async () => {
    const deps = makeDeps({ agent: { id: 'a2', startEvent: null } });
    expect(await startAgentWhenReady(deps)).toBe('no-agent');
    expect(deps.setStatus).not.toHaveBeenCalled();
  });

  // The reported scenario: the user ticks the routine item and the goal item
  // faster than either request completes.
  it('waits on a temp id, shows "Agent waiting", then fires with the real id', async () => {
    let goalId = 'temp-1699-day';
    const deps = makeDeps({ readGoalId: () => goalId });

    const promise = startAgentWhenReady(deps);
    // The badge must be up while we are waiting.
    await Promise.resolve();
    expect(deps.setStatus).toHaveBeenCalledWith('task-1', 'waiting');
    expect(deps.fire).not.toHaveBeenCalled();

    goalId = 'goal-real';
    expect(await promise).toBe('fired');
    expect(deps.fire).toHaveBeenCalledWith({ goalId: 'goal-real', implicit: true });
  });

  it('waits when there is no goal id at all yet', async () => {
    let goalId = null;
    const deps = makeDeps({ readGoalId: () => goalId });

    const promise = startAgentWhenReady(deps);
    await Promise.resolve();
    expect(deps.setStatus).toHaveBeenCalledWith('task-1', 'waiting');

    goalId = 'goal-real';
    expect(await promise).toBe('fired');
  });

  // "Just wait until all loading is done" — a real id whose creating mutation
  // is still in flight can still be rolled back.
  it('holds off while a mutation is still settling, even with a real id', async () => {
    let settled = false;
    const deps = makeDeps({ isSettled: () => settled });

    const promise = startAgentWhenReady(deps);
    await Promise.resolve();
    expect(deps.setStatus).toHaveBeenCalledWith('task-1', 'waiting');
    expect(deps.fire).not.toHaveBeenCalled();

    settled = true;
    expect(await promise).toBe('fired');
    expect(deps.fire).toHaveBeenCalledWith({ goalId: 'goal-real', implicit: true });
  });

  it('retires the waiting badge when the goal id never arrives', async () => {
    const deps = makeDeps({
      readGoalId: () => 'temp-forever',
      pollOptions: { timeoutMs: 30, intervalMs: 5 },
    });

    expect(await startAgentWhenReady(deps)).toBe('timeout');
    expect(deps.setStatus).toHaveBeenCalledWith('task-1', 'waiting');
    // A stuck 'waiting' badge would sit there for the rest of the day.
    expect(deps.clearStatus).toHaveBeenCalledWith('task-1');
    expect(deps.fire).not.toHaveBeenCalled();
  });

  it('stays quiet on timeout for an implicit fire', async () => {
    const deps = makeDeps({
      readGoalId: () => null,
      implicit: true,
      pollOptions: { timeoutMs: 30, intervalMs: 5 },
    });

    await startAgentWhenReady(deps);
    // The user ticked a task; they never asked for an agent.
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it('tells the user on timeout when they pressed Start Agent', async () => {
    const deps = makeDeps({
      readGoalId: () => null,
      implicit: false,
      pollOptions: { timeoutMs: 30, intervalMs: 5 },
    });

    await startAgentWhenReady(deps);
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent not started' }),
    );
  });

  it('passes the implicit flag through to the dispatch', async () => {
    const deps = makeDeps({ implicit: false });
    await startAgentWhenReady(deps);
    expect(deps.fire).toHaveBeenCalledWith({ goalId: 'goal-real', implicit: false });
  });

  it('returns no-agent without a taskRef', async () => {
    const deps = makeDeps({ taskRef: '' });
    expect(await startAgentWhenReady(deps)).toBe('no-agent');
  });

  it('survives being called with nothing', async () => {
    await expect(startAgentWhenReady()).resolves.toBe('no-agent');
  });
});
