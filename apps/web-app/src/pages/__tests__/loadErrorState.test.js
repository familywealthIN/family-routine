/* eslint-env jest */
/**
 * D-10: an unreachable API rendered as "you have no data".
 *
 * The three surfaces named in the report (/goals, /goals/milestones, /agents)
 * must each be able to tell a failed load apart from a genuinely empty one, so
 * the shared LoadErrorState can be shown instead of an empty state.
 *
 * Hooks are exercised against a minimal vm-like context (no mount), matching
 * the container test convention.
 */
// These pages pull the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the error handling.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const GoalsTime = require('../GoalsTime.vue').default;
const MilestonesTime = require('../MilestonesTime.vue').default;
const Agents = require('../../views/Agents.vue').default;

describe('GoalsTime load error', () => {
  const ctx = () => ({ firstLoadDone: false, isNavigating: true, loadError: false });

  it('flags the failure and stops the page spinning', () => {
    const vm = ctx();
    GoalsTime.apollo.goals.error.call(vm, new Error('Failed to fetch'));
    expect(vm.loadError).toBe(true);
    expect(vm.firstLoadDone).toBe(true);
    expect(vm.isNavigating).toBe(false);
  });

  it('flags a failure of the past-goals query too', () => {
    const vm = ctx();
    GoalsTime.apollo.pastGoals.error.call(vm, new Error('Failed to fetch'));
    expect(vm.loadError).toBe(true);
  });

  it('clears the failure once a result arrives', () => {
    const vm = { ...ctx(), loadError: true };
    GoalsTime.apollo.goals.result.call(vm, { data: { goalsOptimized: [] } });
    expect(vm.loadError).toBe(false);
    expect(vm.firstLoadDone).toBe(true);
  });

  it('keeps the failure when a result carries no data', () => {
    const vm = { ...ctx(), loadError: true };
    GoalsTime.apollo.goals.result.call(vm, { data: undefined });
    expect(vm.loadError).toBe(true);
  });

  describe('statCount', () => {
    it('shows a dash instead of asserting zero after a failed load', () => {
      expect(GoalsTime.methods.statCount.call({ loadError: true, allGoals: [] }, 0))
        .toBe('—');
    });

    it('shows the real total when the load succeeded', () => {
      expect(GoalsTime.methods.statCount.call({ loadError: false, allGoals: [] }, 0))
        .toBe(0);
    });

    it('shows cached totals when a refetch fails', () => {
      expect(GoalsTime.methods.statCount.call({ loadError: true, allGoals: [{ id: 'g1' }] }, 3))
        .toBe(3);
    });
  });
});

describe('MilestonesTime load error', () => {
  it('flags the failure', () => {
    const vm = { loadError: false };
    MilestonesTime.apollo.goalMilestones.error.call(vm, new Error('Failed to fetch'));
    expect(vm.loadError).toBe(true);
  });

  it('clears the failure once a result arrives', () => {
    const vm = { loadError: true };
    MilestonesTime.apollo.goalMilestones.result.call(vm, { data: { goalMilestones: {} } });
    expect(vm.loadError).toBe(false);
  });
});

describe('Agents load error', () => {
  const ctx = (error, agents = []) => ({ $agent: { error, agents }, agents });

  it('reports a failed fetch as an error, not an empty list', () => {
    expect(Agents.computed.loadError.call(ctx(new Error('Failed to fetch')))).toBe(true);
  });

  it('reports a genuinely empty list as empty', () => {
    expect(Agents.computed.loadError.call(ctx(null))).toBe(false);
  });

  it('keeps showing agents we already have when a refetch fails', () => {
    expect(Agents.computed.loadError.call(ctx(new Error('boom'), [{ id: 'a1' }]))).toBe(false);
  });

  describe('statCount', () => {
    it('shows a dash instead of asserting zero after a failed load', () => {
      expect(Agents.methods.statCount.call({ loadError: true }, 0)).toBe('—');
    });

    it('shows the real total when the load succeeded', () => {
      expect(Agents.methods.statCount.call({ loadError: false }, 2)).toBe(2);
    });
  });
});
