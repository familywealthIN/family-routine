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
// MilestonesTime is on the chassis now, so it imports utils/signOut for the
// drawer's Log out — which reaches the Google Auth plugin, shipped as ESM.
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const { agentTotals } = require('@routine-notes/ui/constants/agents');

// /goals was rebuilt (design: Goals.dc.html): the page is now a composition of
// containers, so the error-vs-empty decision lives in the two read containers and
// the em-dashed ladder tallies in `utils/goalCascade`.
const GoalsCascadeContainer = require('../../containers/GoalsCascadeContainer.vue').default;
const GoalCalendarContainer = require('../../containers/GoalCalendarContainer.vue').default;
const { buildCascade } = require('../../utils/goalCascade');

const MilestonesTime = require('../MilestonesTime.vue').default;
// /agents was rebuilt (design: Agents.dc.html): the page is now a composition
// of containers, so the error-vs-empty decision lives in AgentsListContainer and
// the unknown-vs-zero totals in the AgentList organism.
const AgentsListContainer = require('../../containers/AgentsListContainer.vue').default;

describe('Goals load error', () => {
  const cascade = (overrides = {}) => ({ readFailed: false, goals: [], ...overrides });
  const calendar = (overrides = {}) => ({ readFailed: false, monthGoals: [], ...overrides });

  it('flags a failed cascade read', () => {
    const vm = cascade();
    GoalsCascadeContainer.apollo.goals.error.call(vm, new Error('Failed to fetch'));
    expect(vm.readFailed).toBe(true);
    expect(GoalsCascadeContainer.computed.loadError.call(vm)).toBe(true);
  });

  it('flags a failed month read too, so the calendar does not claim an empty month', () => {
    const vm = calendar();
    GoalCalendarContainer.apollo.monthGoals.error.call(vm, new Error('Failed to fetch'));
    expect(GoalCalendarContainer.computed.loadError.call(vm)).toBe(true);
  });

  it('clears the failure once a result arrives', () => {
    const vm = cascade({ readFailed: true });
    GoalsCascadeContainer.apollo.goals.result.call(vm, { data: { agendaGoals: [] } });
    expect(vm.readFailed).toBe(false);
  });

  it('keeps the failure when a result carries no data', () => {
    const vm = cascade({ readFailed: true });
    GoalsCascadeContainer.apollo.goals.result.call(vm, { data: undefined });
    expect(vm.readFailed).toBe(true);
  });

  it('keeps showing the goals we already have when a REFETCH fails', () => {
    const withData = cascade({ readFailed: true, goals: [{ id: 'g1', period: 'day', goalItems: [] }] });
    expect(GoalsCascadeContainer.computed.loadError.call(withData)).toBe(false);
    expect(GoalCalendarContainer.computed.loadError.call(calendar({ readFailed: true, monthGoals: [{ id: 'g1' }] }))).toBe(false);
  });

  it('never lets the retry spinner stand in for a loading flag on the goals', () => {
    const loading = { loadError: true, $apollo: { queries: { goals: { loading: true } } } };
    expect(GoalsCascadeContainer.computed.retrying.call(loading)).toBe(true);
    const healthy = { loadError: false, $apollo: { queries: { goals: { loading: true } } } };
    expect(GoalsCascadeContainer.computed.retrying.call(healthy)).toBe(false);
  });

  describe('the ladder tallies', () => {
    const built = (loadError) => buildCascade({
      tab: 'day',
      goals: [],
      routines: [],
      selectedDate: '12-09-2026',
      today: '12-09-2026',
      loadError,
    });

    it('shows a dash instead of asserting zero after a failed load', () => {
      expect(built(true).ladder.map((step) => step.num)).toEqual(['—', '—', '—', '—', '—']);
    });

    it('shows the real tallies when the load succeeded', () => {
      expect(built(false).ladder.map((step) => step.num)).toEqual(['0/0', '0/0', '0/0', '0%', '0/0']);
    });

    it('shows the error screen instead of the empty one', () => {
      expect(built(true).loadError).toBe(true);
      expect(built(true).empty).toBe(false);
      expect(built(false).empty).toBe(true);
    });
  });
});

describe('MilestonesTime load error', () => {
  // One query per period now — the combined one returned 502 because the five
  // together exceeded Lambda's response limit. So the failure is per period,
  // and a card that fails costs only itself.
  // Vue 2's `$set`, which the page uses to make a new `loadErrors` key
  // reactive. Writing through `Object.assign` rather than `obj[key] = value`
  // keeps eslint's no-param-reassign happy without disabling it.
  const ctx = (loadErrors = {}) => ({
    loadErrors,
    $set(obj, key, value) { Object.assign(obj, { [key]: value }); },
  });

  it('flags the failure for the period that failed, and only that one', () => {
    const vm = ctx();
    MilestonesTime.apollo.milestonesDay.error.call(vm, new Error('Failed to fetch'));
    expect(vm.loadErrors.day).toBe(true);
    expect(vm.loadErrors.week).toBeUndefined();
  });

  it('clears the failure once a result arrives', () => {
    const vm = ctx({ day: true });
    MilestonesTime.apollo.milestonesDay.result.call(vm, { data: { goalMilestones: { day: [] } } });
    expect(vm.loadErrors.day).toBe(false);
  });

  it('only calls the whole page broken when every period failed', () => {
    const periods = ['day', 'week', 'month', 'year', 'lifetime'];
    const some = ctx({ day: true });
    expect(MilestonesTime.computed.loadError.call(some)).toBe(false);

    const all = ctx(periods.reduce((acc, p) => ({ ...acc, [p]: true }), {}));
    expect(MilestonesTime.computed.loadError.call(all)).toBe(true);
  });

  it('still shows a failed period as a card, so the failure is visible', () => {
    const vm = {
      loadErrors: { day: true },
      milestonesDay: [],
      milestonesWeek: [],
      milestonesMonth: [],
      milestonesYear: [],
      milestonesLifetime: [],
    };
    const groups = MilestonesTime.computed.groups.call(vm);
    expect(groups.map((g) => g.period)).toEqual(['day']);
    expect(groups[0].failed).toBe(true);
  });
});

describe('Agents load error', () => {
  const ctx = (error, agents = []) => ({ $agent: { error, agents }, agents });

  it('reports a failed fetch as an error, not an empty list', () => {
    expect(AgentsListContainer.computed.loadError.call(ctx(new Error('Failed to fetch')))).toBe(true);
  });

  it('reports a genuinely empty list as empty', () => {
    expect(AgentsListContainer.computed.loadError.call(ctx(null))).toBe(false);
  });

  it('keeps showing agents we already have when a refetch fails', () => {
    expect(AgentsListContainer.computed.loadError.call(ctx(new Error('boom'), [{ id: 'a1' }]))).toBe(false);
  });

  describe('stat tiles', () => {
    // The dash itself is asserted on the rendered organism (AgentList.test.js and
    // views/__tests__/agentsLoadErrorState.test.js). What belongs here is that the
    // totals the tiles read are a real sum and never invented.
    it('sums the runs it actually has', () => {
      expect(agentTotals([{ successCount: 3, failureCount: 1 }]).runs).toBe(4);
    });

    it('reports nothing as nothing, so the error branch is the only source of a dash', () => {
      expect(agentTotals([]).runs).toBe(0);
      expect(agentTotals([]).rate).toBe(0);
    });
  });
});
