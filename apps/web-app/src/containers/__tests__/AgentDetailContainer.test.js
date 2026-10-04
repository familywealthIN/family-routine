/* eslint-env jest */
/**
 * AgentDetailContainer.
 *
 * Two things to hold:
 *   1. "Run test" is STUBBED and must stay honestly off. There is no server
 *      operation that starts an agent — `apps/server/src/resolvers/agent.js`
 *      only records an execution — so `canRunTest` is false. If this test starts
 *      failing, a real trigger arrived and the reason copy should go with it.
 *   2. an HTML result is re-opened through the existing SANDBOXED viewer, never
 *      injected into the page.
 */
jest.mock(
  '@routine-notes/ui/organisms/AgentDetail/AgentDetail.vue',
  () => ({ __esModule: true, default: { name: 'AgentDetail', render() {} } }),
);

const Container = require('../AgentDetailContainer.vue').default;

const AGENT = {
  id: 'a1',
  taskRef: 'r1',
  name: 'PR Summarizer',
  lastResultType: 'html',
  lastResultBody: '<p>done</p>',
};

const ctx = (over = {}) => ({
  agentId: 'a1',
  routineItems: [{ id: 'r1', name: 'Start Work', time: '09:00' }],
  $agent: { agents: [AGENT], showSavedResult: jest.fn() },
  ...over,
});

const withAgent = (vm) => ({ ...vm, agent: Container.computed.agent.call(vm) });

describe('AgentDetailContainer — selection', () => {
  it('finds the selected agent in the store', () => {
    expect(Container.computed.agent.call(ctx())).toBe(AGENT);
  });

  it('renders nothing selected when the id is empty or unknown', () => {
    expect(Container.computed.agent.call(ctx({ agentId: '' }))).toBeNull();
    expect(Container.computed.agent.call(ctx({ agentId: 'gone' }))).toBeNull();
  });

  it('names the bound routine, falling back to the raw ref', () => {
    const vm = withAgent(ctx());
    expect(Container.computed.routineTime.call({ ...vm, routine: Container.computed.routine.call(vm) })).toBe('09:00');
    expect(Container.computed.routineName.call({ ...vm, routine: Container.computed.routine.call(vm) })).toBe('Start Work');

    const orphan = withAgent(ctx({ routineItems: [] }));
    expect(Container.computed.routineName.call({ ...orphan, routine: null })).toBe('r1');
  });

  it('reads the routine list cache-and-network with the same (no) variables as the list container', () => {
    expect(Container.apollo.routineItems.fetchPolicy).toBe('cache-and-network');
    expect(Container.apollo.routineItems.variables).toBeUndefined();
  });
});

describe('AgentDetailContainer — Run test is stubbed', () => {
  it('keeps the button off until a server trigger exists', () => {
    expect(Container.computed.canRunTest.call(withAgent(ctx()))).toBe(false);
  });
});

describe('AgentDetailContainer — the saved transcript', () => {
  it('re-opens an HTML body in the sandboxed viewer, keyed by routine', () => {
    const vm = ctx();
    Container.methods.openResult.call(withAgent(vm));
    expect(vm.$agent.showSavedResult).toHaveBeenCalledWith('r1', '<p>done</p>');
  });

  it('does nothing for a json result or an empty body', () => {
    const json = ctx({ $agent: { agents: [{ ...AGENT, lastResultType: 'json' }], showSavedResult: jest.fn() } });
    Container.methods.openResult.call(withAgent(json));
    expect(json.$agent.showSavedResult).not.toHaveBeenCalled();

    const empty = ctx({ $agent: { agents: [{ ...AGENT, lastResultBody: '' }], showSavedResult: jest.fn() } });
    Container.methods.openResult.call(withAgent(empty));
    expect(empty.$agent.showSavedResult).not.toHaveBeenCalled();
  });

  it('does nothing with no agent selected', () => {
    const vm = ctx({ agentId: '' });
    Container.methods.openResult.call(withAgent(vm));
    expect(vm.$agent.showSavedResult).not.toHaveBeenCalled();
  });
});
