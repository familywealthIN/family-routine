/* eslint-env jest */
/**
 * AgentsListContainer — the Agents page read.
 *
 * The contract that matters is D-10's: `$agent.fetchAll` swallows a failed load
 * into the store and leaves `agents` empty, so the container has to tell "the
 * request failed" apart from "you have no agents" — otherwise the page claims
 * the user's agents are gone whenever the API is unreachable. An error must also
 * never beat agents we already have on screen.
 *
 * Hooks are exercised against a minimal vm-like context, matching the container
 * test convention (no mount — the organism is covered by its own suite).
 */
const Container = require('../AgentsListContainer.vue').default;

const ctx = (over = {}) => ({
  routineItems: [{ id: 'r1', name: 'Start Work', time: '09:00' }],
  selectedId: '',
  $agent: {
    agents: [], error: null, loading: false, fetchAll: jest.fn(),
  },
  $emit: jest.fn(),
  ...over,
});

const agents = (vm) => Container.computed.agents.call(vm);
const loadError = (vm) => Container.computed.loadError.call({
  ...vm,
  agents: agents(vm),
});

describe('AgentsListContainer — the read', () => {
  it('joins each agent to its routine', () => {
    const vm = ctx({
      $agent: { agents: [{ id: 'a1', taskRef: 'r1' }], error: null, loading: false },
    });
    expect(agents(vm)).toEqual([expect.objectContaining({
      id: 'a1', routineTime: '09:00', routineName: 'Start Work',
    })]);
  });

  it('de-dupes repeated agent ids before the organism ever sees them', () => {
    const vm = ctx({
      $agent: { agents: [{ id: 'a1', taskRef: 'r1' }, { id: 'a1', taskRef: 'r1' }], error: null },
    });
    expect(agents(vm)).toHaveLength(1);
  });

  it('maps the routineItems query result, defaulting to an empty list', () => {
    const { update } = Container.apollo.routineItems;
    expect(update({ routineItems: [{ id: 'r1' }] })).toEqual([{ id: 'r1' }]);
    expect(update(null)).toEqual([]);
    expect(update({})).toEqual([]);
  });

  it('reads the routine list cache-and-network so a stale slice self-heals', () => {
    expect(Container.apollo.routineItems.fetchPolicy).toBe('cache-and-network');
  });
});

describe('AgentsListContainer — error vs empty (D-10)', () => {
  it('reports a failed fetch as an error, not an empty list', () => {
    expect(loadError(ctx({
      $agent: { agents: [], error: new Error('Failed to fetch') },
    }))).toBe(true);
  });

  it('reports a genuinely empty list as empty', () => {
    expect(loadError(ctx())).toBe(false);
  });

  it('keeps showing agents we already have when a refetch fails', () => {
    expect(loadError(ctx({
      $agent: { agents: [{ id: 'a1', taskRef: 'r1' }], error: new Error('boom') },
    }))).toBe(false);
  });
});

describe('AgentsListContainer — the page summary', () => {
  it('reports the count, the live count and the ids the page may select', () => {
    const vm = ctx({
      $agent: {
        agents: [
          { id: 'a1', taskRef: 'r1', executionStatus: 'listening' },
          { id: 'a2', taskRef: 'r2', executionStatus: 'idle' },
        ],
        error: null,
      },
    });
    Container.methods.emitSummary.call({ ...vm, agents: agents(vm), loadError: false });
    expect(vm.$emit).toHaveBeenCalledWith('summary', {
      count: 2, live: 1, error: false, ids: ['a1', 'a2'],
    });
  });

  it('passes the error on so the header does not say "0 agents"', () => {
    const vm = ctx();
    Container.methods.emitSummary.call({ ...vm, agents: [], loadError: true });
    expect(vm.$emit).toHaveBeenCalledWith('summary', {
      count: 0, live: 0, error: true, ids: [],
    });
  });
});

describe('AgentsListContainer — loading', () => {
  it('fetches on created and on retry', () => {
    const vm = ctx();
    Container.created.call(vm);
    expect(vm.$agent.fetchAll).toHaveBeenCalledTimes(1);
    Container.methods.reload.call(vm);
    expect(vm.$agent.fetchAll).toHaveBeenCalledTimes(2);
  });
});
