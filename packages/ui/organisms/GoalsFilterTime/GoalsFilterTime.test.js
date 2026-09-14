/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const GoalsFilterTime = require('./GoalsFilterTime.vue').default;

// D-10: a failed query handed the organism an empty array, so it painted
// "You Don't have any Goals." — the same state as having genuinely none.
const ctx = (overrides = {}) => ({ goals: [], error: undefined, ...overrides });

describe('OrganismGoalsFilterTime load error', () => {
  describe('showLoadError', () => {
    it('is true when the query failed and there is nothing to show', () => {
      expect(GoalsFilterTime.computed.showLoadError.call(ctx({ error: true })))
        .toBe(true);
    });

    it('is false for a genuinely empty result', () => {
      expect(GoalsFilterTime.computed.showLoadError.call(ctx()))
        .toBe(false);
      expect(GoalsFilterTime.computed.showLoadError.call(ctx({ goals: undefined })))
        .toBe(false);
    });

    it('keeps showing goals we already have when a refetch fails', () => {
      expect(GoalsFilterTime.computed.showLoadError.call(
        ctx({ error: true, goals: [{ id: 'g1', period: 'week' }] }),
      )).toBe(false);
    });
  });

  it('accepts the error and retrying props', () => {
    expect(GoalsFilterTime.props).toEqual(expect.arrayContaining(['error', 'retrying']));
  });
});
