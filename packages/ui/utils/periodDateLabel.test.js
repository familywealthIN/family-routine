/* eslint-env jest */

// D-28: milestone rows are listed across months but were labelled with the
// day of the month alone ("08 - ...", "24 - ..."), and an item whose stored
// date could not be parsed was labelled with moment's "Invalid date".

const { getPeriodDate } = require('./getDates');

describe('getPeriodDate', () => {
  it('names the month next to the day, so rows from different months differ', () => {
    expect(getPeriodDate('day', '08-03-2026')).toBe('08 March - ');
    expect(getPeriodDate('day', '08-04-2026')).toBe('08 April - ');
  });

  it('drops the prefix for a date it cannot parse instead of saying "Invalid date"', () => {
    expect(getPeriodDate('day', 'asdsad')).toBe('');
    expect(getPeriodDate('day', '')).toBe('');
    expect(getPeriodDate('week', undefined)).toBe('');
    expect(getPeriodDate('month', 'ssddsds')).toBe('');
    expect(getPeriodDate('year', null)).toBe('');
  });

  it('leaves the other period labels as they were', () => {
    expect(getPeriodDate('week', '21-08-2026', '')).toBe('Week 34');
    expect(getPeriodDate('month', '31-03-2026', '')).toBe('March');
    expect(getPeriodDate('year', '31-12-2026', '')).toBe('2026');
    expect(getPeriodDate('lifetime', '01-01-1970')).toBe('');
  });
});
