/* eslint-env jest */
/**
 * agentFormat — the "Last run …" sentence.
 *
 * The mock hands the view ready-made strings ('Today 09:02'); the real field is a
 * timestamp, and the two failure modes that matter are an agent that has NEVER
 * run (which must not read as a run at the epoch) and a millisecond timestamp
 * arriving as a numeric string (which moment would otherwise read as a year).
 */
const { formatLastRun, lastRunLabel, lastResultMeta } = require('./agentFormat');

const NOW = '2026-10-02T12:00:00';

describe('formatLastRun', () => {
  it('says never for an agent that has not run', () => {
    expect(formatLastRun(null, NOW)).toBe('never');
    expect(formatLastRun(undefined, NOW)).toBe('never');
    expect(formatLastRun('', NOW)).toBe('never');
  });

  it('names today by name', () => {
    expect(formatLastRun('2026-10-02T09:02:00', NOW)).toBe('Today 09:02');
  });

  it('uses the weekday inside the last week', () => {
    expect(formatLastRun('2026-09-29T15:48:00', NOW)).toBe('Tue 15:48');
  });

  it('falls back to a date once the weekday stops identifying the day', () => {
    expect(formatLastRun('2026-09-01T07:40:00', NOW)).toBe('1 Sep 07:40');
  });

  it('reads a millisecond timestamp handed over as a string', () => {
    const ms = String(new Date('2026-10-02T09:02:00').getTime());
    expect(formatLastRun(ms, NOW)).toBe('Today 09:02');
  });

  it('hands back an unparseable value rather than "Invalid date"', () => {
    // moment warns on its non-ISO fallback; the fallback is the point here.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(formatLastRun('not a date', NOW)).toBe('not a date');
    warn.mockRestore();
  });
});

describe('lastRunLabel', () => {
  it('names the result type on a successful run', () => {
    expect(lastRunLabel({ lastRunAt: '2026-10-02T09:02:00', lastResultType: 'html' }, NOW))
      .toBe('Last run Today 09:02 · html');
  });

  it('says failed instead of naming a result type it does not have', () => {
    expect(lastRunLabel({
      lastRunAt: '2026-10-02T09:02:00', executionStatus: 'failed', lastResultType: 'html',
    }, NOW)).toBe('Last run Today 09:02 · failed');
  });

  it('reads "Never run" rather than "Last run never"', () => {
    expect(lastRunLabel({ lastRunAt: null }, NOW)).toBe('Never run');
  });

  it('dashes an unknown result type', () => {
    expect(lastRunLabel({ lastRunAt: '2026-10-02T09:02:00' }, NOW)).toBe('Last run Today 09:02 · —');
  });

  it('is empty with no agent at all', () => {
    expect(lastRunLabel(null, NOW)).toBe('');
    expect(lastResultMeta(null, NOW)).toBe('');
  });
});

describe('lastResultMeta', () => {
  it('pairs the time with the result kind', () => {
    expect(lastResultMeta({ lastRunAt: '2026-10-02T09:02:00', lastResultType: 'json' }, NOW))
      .toBe('Today 09:02 · json');
  });

  it('calls a failed run an error', () => {
    expect(lastResultMeta({
      lastRunAt: '2026-10-02T09:02:00', executionStatus: 'failed', lastResultType: 'json',
    }, NOW)).toBe('Today 09:02 · error');
  });
});
