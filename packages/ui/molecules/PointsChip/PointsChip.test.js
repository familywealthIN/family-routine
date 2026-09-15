/* eslint-env jest */
/**
 * Unit tests for PointsChip's unknown-balance state.
 *
 * D-10: a failed xpBalance query left the header chip reading `0`, asserting a
 * balance the app does not know. (The chip only ever sees a number, so "cached
 * data still wins" is decided by the layout feeding `error` — covered in
 * apps/web-app/src/layouts/__tests__/xpBalanceErrorState.test.js.)
 *
 * Computeds are exercised against a minimal vm-like context (no mount needed),
 * matching the GoalTagsInput.test.js convention.
 */
const PointsChip = require('./PointsChip.vue').default;

const ctx = (overrides = {}) => ({
  available: 0,
  pendingToday: 0,
  entitled: false,
  loading: false,
  error: false,
  ...overrides,
});

describe('PointsChip', () => {
  describe('displayValue', () => {
    const value = (overrides) => PointsChip.computed.displayValue.call(ctx(overrides));

    it('shows a dash instead of asserting zero when the balance failed to load', () => {
      expect(value({ error: true })).toBe('—');
    });

    it('shows the real balance when the load succeeded', () => {
      expect(value({ available: 420 })).toBe('420');
    });

    it('prefers the in-flight indicator over the dash while retrying', () => {
      expect(value({ error: true, loading: true })).toBe('…');
    });
  });

  describe('tooltipText', () => {
    const tip = (overrides) => PointsChip.computed.tooltipText.call(ctx(overrides));

    it('explains the dash rather than leaving it unlabelled', () => {
      expect(tip({ error: true })).toContain("couldn't reach the server");
    });

    it('still reports the balance when the load succeeded', () => {
      expect(tip({ available: 420 })).toBe('420 points available');
    });
  });
});
