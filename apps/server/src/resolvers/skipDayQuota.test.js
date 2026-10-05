/* eslint-disable global-require */

// D-29: the weekly Skip Day quota counted a MISSING routine document as a
// skipped day. A routine only exists once the user opens the app for that
// date, so holidays, illness and a mid-week sign-up silently spent the
// allowance and skipRoutine refused the one feature meant to cover them.

process.env.ENCRYPTION_KEY = 'skip-day-quota-test-key';

const moment = require('moment');

const mockRoutineFindOne = jest.fn();
const mockRoutineFindOneAndUpdate = jest.fn();

jest.mock('../schema/RoutineSchema', () => {
  const actual = jest.requireActual('../schema/RoutineSchema');
  return {
    ...actual,
    RoutineModel: {
      findOne: mockRoutineFindOne,
      findOneAndUpdate: mockRoutineFindOneAndUpdate,
    },
  };
});

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };

// Wednesday, so the week always has earlier days to be missing or skipped.
const NOW = new Date('2026-09-16T12:00:00Z').getTime();

const exec = (value) => ({ exec: () => Promise.resolve(value) });

// The dates getSkipDayCount walks: week start through today, inclusive.
const weekDates = () => {
  const today = moment().weekday();
  const dates = [];
  for (let i = 0; i <= today; i += 1) {
    dates.push(moment().weekday(i).format('DD-MM-YYYY'));
  }
  return dates;
};

// `week` maps a DD-MM-YYYY date to its stored document, or to nothing at all
// for a day the user never opened the app.
const givenWeek = (week) => {
  mockRoutineFindOne.mockImplementation(({ date }) => exec(week[date] || null));
};

const skip = (value = true) => {
  const { mutation } = require('./routine');
  return mutation.skipRoutine.resolve(null, { id: 'r-today', skip: value }, CONTEXT);
};

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockRoutineFindOne.mockReset();
  mockRoutineFindOneAndUpdate.mockReset();
  mockRoutineFindOneAndUpdate.mockReturnValue(exec({ _id: 'r-today', skip: true }));
});

afterEach(() => {
  Date.now.mockRestore();
});

describe('skipRoutine weekly quota', () => {
  it('allows a skip when every earlier day of the week is simply missing', async () => {
    const dates = weekDates();
    givenWeek({ [dates[dates.length - 1]]: { _id: 'r-today', skip: false } });

    await expect(skip()).resolves.toEqual({ _id: 'r-today', skip: true });

    const [criteria, update] = mockRoutineFindOneAndUpdate.mock.calls[0];
    expect(criteria).toEqual({ _id: 'r-today', email: EMAIL });
    expect(update).toEqual({ skip: true });
  });

  it('still refuses once two days were deliberately skipped', async () => {
    const dates = weekDates();
    givenWeek({
      [dates[0]]: { _id: 'r-0', skip: true },
      [dates[1]]: { _id: 'r-1', skip: true },
      [dates[dates.length - 1]]: { _id: 'r-today', skip: false },
    });

    await expect(skip()).rejects.toThrow('You have already skip 2 days this week.');
    expect(mockRoutineFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not let missing days top a single real skip up to the quota', async () => {
    const dates = weekDates();
    // One real skip, the rest of the week never opened.
    givenWeek({
      [dates[0]]: { _id: 'r-0', skip: true },
      [dates[dates.length - 1]]: { _id: 'r-today', skip: false },
    });

    await expect(skip()).resolves.toEqual({ _id: 'r-today', skip: true });
  });

  it('never blocks turning a skip back off', async () => {
    const dates = weekDates();
    mockRoutineFindOneAndUpdate.mockReturnValue(exec({ _id: 'r-today', skip: false }));
    givenWeek(dates.reduce((week, date) => ({ ...week, [date]: { skip: true } }), {}));

    await expect(skip(false)).resolves.toEqual({ _id: 'r-today', skip: false });
  });
});
