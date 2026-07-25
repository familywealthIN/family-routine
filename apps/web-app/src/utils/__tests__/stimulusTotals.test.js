/* eslint-env jest */
/**
 * Unit tests for stimulusTotals — the D/K/G aggregation feeding the summary
 * circles. D/K are raw sums; G is period-scaled (×4 until the week settles).
 */
const { stimulusTotal } = require('../stimulusTotals');

const list = [
  { id: 'a', stimuli: [{ name: 'D', earned: 10 }, { name: 'K', earned: 5 }, { name: 'G', earned: 2 }] },
  { id: 'b', stimuli: [{ name: 'D', earned: 20 }, { name: 'K', earned: 8 }, { name: 'G', earned: 3 }] },
];

describe('stimulusTotals', () => {
  it('D is the raw sum of earned', () => {
    expect(stimulusTotal(list, 'D', '05-01-2026')).toBe(30);
  });

  it('K is the raw sum of earned', () => {
    expect(stimulusTotal(list, 'K', '05-01-2026')).toBe(13);
  });

  it('G is period-scaled ×4 early in the week (Mon 05-01-2026)', () => {
    // raw G = 5; weekday(Mon) < weekDays-1 → ×4
    expect(stimulusTotal(list, 'G', '05-01-2026')).toBe(20);
  });

  it('ignores tasks/stimuli that are missing or lack the name', () => {
    expect(stimulusTotal([{ id: 'x' }, { id: 'y', stimuli: [] }], 'D', '05-01-2026')).toBe(0);
    expect(stimulusTotal([{ id: 'x', stimuli: [{ name: 'K', earned: 9 }] }], 'D', '05-01-2026')).toBe(0);
  });

  it('returns 0 for empty / non-array input', () => {
    expect(stimulusTotal([], 'D', '05-01-2026')).toBe(0);
    expect(stimulusTotal(null, 'G', '05-01-2026')).toBe(0);
    expect(stimulusTotal(undefined, 'K', '05-01-2026')).toBe(0);
  });

  it('a G with no earned scales 0 → 0', () => {
    expect(stimulusTotal([{ id: 'a', stimuli: [{ name: 'G', earned: 0 }] }], 'G', '05-01-2026')).toBe(0);
  });
});
