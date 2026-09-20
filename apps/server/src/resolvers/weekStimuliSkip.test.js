/* eslint-disable global-require */

// D-17: the week strip's per-day totals are what the dashboard now grades a
// missed day by, and a Skip Day scores exactly the same zero as a day that got
// away. weekStimuli has to say which of the two a zero day was, or the recovery
// nudge would fire on the rest day the user deliberately claimed.

process.env.ENCRYPTION_KEY = 'week-stimuli-skip-test-key';

const mockRoutineFind = jest.fn();

jest.mock('../schema/RoutineSchema', () => {
  const actual = jest.requireActual('../schema/RoutineSchema');
  return {
    ...actual,
    RoutineModel: { find: mockRoutineFind },
  };
});

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };

// Wednesday of a Sunday-start week: 13-09-2026 .. 19-09-2026.
const WEEK_START = '13-09-2026';
const REST_DAY = '14-09-2026';
const MISSED_DAY = '15-09-2026';
const TODAY = '16-09-2026';

const exec = (value) => ({ exec: () => Promise.resolve(value) });

const earning = (date) => ({
  date,
  skip: false,
  tasklist: [{ stimuli: [{ name: 'D', splitRate: 2, earned: 20 }] }],
});

const weekStimuli = () => {
  const { query } = require('./routine');
  return query.weekStimuli.resolve(null, { date: TODAY }, CONTEXT);
};

beforeEach(() => {
  mockRoutineFind.mockReset();
});

describe('weekStimuli skipped flag', () => {
  it('marks a deliberate rest day as skipped and a zero day as not', async () => {
    mockRoutineFind.mockReturnValue(exec([
      earning(WEEK_START),
      { date: REST_DAY, skip: true, tasklist: [] },
      { date: MISSED_DAY, skip: false, tasklist: [] },
    ]));

    const days = await weekStimuli();
    const byDate = days.reduce((map, day) => ({ ...map, [day.date]: day }), {});

    expect(byDate[REST_DAY].skipped).toBe(true);
    expect(byDate[REST_DAY].D).toBe(0);
    expect(byDate[MISSED_DAY].skipped).toBe(false);
    expect(byDate[MISSED_DAY].D).toBe(0);
    expect(byDate[WEEK_START].skipped).toBe(false);
    expect(byDate[WEEK_START].D).toBe(20);
  });

  it('reports a day with no document as not skipped', async () => {
    mockRoutineFind.mockReturnValue(exec([earning(WEEK_START)]));

    const days = await weekStimuli();

    expect(days).toHaveLength(7);
    expect(days.every((day) => typeof day.skipped === 'boolean')).toBe(true);
    expect(days.find((day) => day.date === MISSED_DAY).skipped).toBe(false);
  });
});
