/* eslint-env jest */

// D-17: a missed day produced nothing — no acknowledgement, no recovery
// option — on any later day. These cover the two ways that could be made
// worse: nudging on a deliberate Skip Day, and nudging a brand-new user about
// days they were never there for.

import { findMissedDay } from '../missedDay';

// A Sunday-start week: 13-09-2026 .. 19-09-2026. Today is Wednesday the 16th.
const TODAY = '16-09-2026';

const day = (date, overrides = {}) => ({
  date, D: 0, K: 0, G: 0, skipped: false, ...overrides,
});

const week = (overrides = {}) => [
  '13-09-2026', '14-09-2026', '15-09-2026',
  '16-09-2026', '17-09-2026', '18-09-2026', '19-09-2026',
].map((date) => day(date, overrides[date] || {}));

describe('findMissedDay', () => {
  it('names the day that got away once the user was already going', () => {
    const days = week({
      '13-09-2026': { D: 40 },
      '14-09-2026': { K: 25 },
    });

    expect(findMissedDay(days, TODAY)).toEqual({ date: '15-09-2026', weekday: 'Tuesday' });
  });

  it('reports the most recent miss, not the first', () => {
    const days = week({
      '13-09-2026': { D: 40 },
      '15-09-2026': { D: 10 },
    });
    // Monday and today are blank; the miss the user hears about is Monday.
    expect(findMissedDay(days, TODAY)).toEqual({ date: '14-09-2026', weekday: 'Monday' });
  });

  it('never calls a deliberate Skip Day a missed day', () => {
    const days = week({
      '13-09-2026': { D: 40 },
      '14-09-2026': { skipped: true },
      '15-09-2026': { D: 10 },
    });

    expect(findMissedDay(days, TODAY)).toBeNull();
  });

  it('ignores the days before the user first showed up this week', () => {
    // Nothing until today — a mid-week sign-up, not three missed days.
    expect(findMissedDay(week(), TODAY)).toBeNull();
  });

  it('never grades today or a day still to come', () => {
    const days = week({ '13-09-2026': { D: 40 }, '14-09-2026': { D: 10 }, '15-09-2026': { D: 10 } });

    expect(findMissedDay(days, TODAY)).toBeNull();
  });

  it('works off calendar order however the days arrive', () => {
    const days = week({ '13-09-2026': { D: 40 } }).slice().reverse();

    expect(findMissedDay(days, TODAY)).toEqual({ date: '15-09-2026', weekday: 'Tuesday' });
  });

  it('returns null for an empty or missing week', () => {
    expect(findMissedDay([], TODAY)).toBeNull();
    expect(findMissedDay(undefined, TODAY)).toBeNull();
    expect(findMissedDay(week({ '13-09-2026': { D: 40 } }), '')).toBeNull();
  });
});
