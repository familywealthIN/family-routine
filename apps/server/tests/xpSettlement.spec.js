const {
  DAILY_STIMULUS_CAP,
  computeDaySettleAmount,
  pickBestRoutineForDate,
  enumerateDayCursors,
  dayKeyToCursor,
  cursorToDayKey,
} = require('../src/utils/xpLedger');
const { aggregateStimuliForRoutine } = require('../src/resolvers/routine');

function makeTask({
  D = 0, K = 0, G = 0, redeemed = false,
} = {}) {
  return {
    redeemed,
    stimuli: [
      { name: 'D', splitRate: 2, earned: D },
      { name: 'K', splitRate: 2, earned: K },
      { name: 'G', splitRate: 4, earned: G },
    ],
  };
}

// 06-07-2026 is a Monday: early in the week, so the G multiplier is x4.
const EARLY_WEEK_DATE = '06-07-2026';

function makeRoutine(date, tasks) {
  return { date, tasklist: tasks };
}

describe('computeDaySettleAmount', () => {
  const agg = aggregateStimuliForRoutine;

  it('returns 0 for a missing routine (skipped or absent day)', () => {
    expect(computeDaySettleAmount(null, agg)).toBe(0);
    expect(computeDaySettleAmount(undefined, agg)).toBe(0);
  });

  it('returns 0 for an empty tasklist', () => {
    expect(computeDaySettleAmount(makeRoutine(EARLY_WEEK_DATE, []), agg)).toBe(0);
  });

  it('sums uncapped per-stimulus earnings below the cap', () => {
    const routine = makeRoutine(EARLY_WEEK_DATE, [
      makeTask({ D: 30, K: 20 }),
      makeTask({ D: 25 }),
    ]);
    // D = 55, K = 20, G = 0
    expect(computeDaySettleAmount(routine, agg)).toBe(75);
  });

  it('caps each stimulus at 100 independently (D=150 -> 100)', () => {
    const routine = makeRoutine(EARLY_WEEK_DATE, [
      makeTask({ D: 150, K: 50 }),
    ]);
    expect(computeDaySettleAmount(routine, agg)).toBe(DAILY_STIMULUS_CAP + 50);
  });

  it('caps at 300 total on a maxed day', () => {
    const routine = makeRoutine(EARLY_WEEK_DATE, [
      makeTask({ D: 500, K: 500, G: 500 }),
    ]);
    expect(computeDaySettleAmount(routine, agg)).toBe(300);
  });

  it('applies the cap AFTER the G period-scaling multiplier (raw 30 -> x4 = 120 -> 100)', () => {
    const routine = makeRoutine(EARLY_WEEK_DATE, [
      makeTask({ G: 30 }),
    ]);
    // Sanity: the aggregate really scales early-week G by 4.
    expect(aggregateStimuliForRoutine(routine).G).toBe(120);
    expect(computeDaySettleAmount(routine, agg)).toBe(DAILY_STIMULUS_CAP);
  });

  it('counts redeemed ticks like normal ticks (overnight settlement prevents same-day loops)', () => {
    const routine = makeRoutine(EARLY_WEEK_DATE, [
      makeTask({ D: 40 }),
      makeTask({ D: 60, K: 30, redeemed: true }),
    ]);
    // D = 100, K = 30 — the redeemed task's earnings are included.
    expect(computeDaySettleAmount(routine, agg)).toBe(130);
    expect(aggregateStimuliForRoutine(routine).D).toBe(100);
  });
});

describe('pickBestRoutineForDate', () => {
  const agg = aggregateStimuliForRoutine;

  it('returns null for empty input', () => {
    expect(pickBestRoutineForDate([], agg)).toBeNull();
    expect(pickBestRoutineForDate(null, agg)).toBeNull();
  });

  it('keeps the duplicate doc with the highest earned total', () => {
    const stale = makeRoutine(EARLY_WEEK_DATE, [makeTask({ D: 0 })]);
    const real = makeRoutine(EARLY_WEEK_DATE, [makeTask({ D: 80, K: 20 })]);
    expect(pickBestRoutineForDate([stale, real], agg)).toBe(real);
    expect(pickBestRoutineForDate([real, stale], agg)).toBe(real);
  });
});

describe('day cursor iteration (DD-MM-YYYY keys must never be string-sorted)', () => {
  it('crosses a month boundary correctly', () => {
    // Lexicographic trap: as strings, '30-06-2026' > '02-07-2026'.
    expect(enumerateDayCursors('2026-06-29', '2026-07-02', 60)).toEqual([
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
    ]);
  });

  it('maps cursors back to app day keys across the boundary', () => {
    const keys = enumerateDayCursors('2026-06-29', '2026-07-01', 60).map(cursorToDayKey);
    expect(keys).toEqual(['30-06-2026', '01-07-2026']);
  });

  it('round-trips day keys and cursors', () => {
    expect(dayKeyToCursor('30-06-2026')).toBe('2026-06-30');
    expect(cursorToDayKey('2026-06-30')).toBe('30-06-2026');
  });

  it('respects the per-call lookback cap, oldest first', () => {
    expect(enumerateDayCursors('2026-06-01', '2026-06-30', 2)).toEqual([
      '2026-06-02',
      '2026-06-03',
    ]);
  });

  it('returns nothing when already settled through the end date', () => {
    expect(enumerateDayCursors('2026-07-02', '2026-07-02', 60)).toEqual([]);
    expect(enumerateDayCursors('2026-07-03', '2026-07-02', 60)).toEqual([]);
  });
});
