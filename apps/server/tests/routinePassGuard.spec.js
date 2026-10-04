process.env.ENCRYPTION_KEY = 'routine-pass-guard-test-key';

jest.mock('../src/utils/getEmailfromSession', () => () => 'user@example.com');

const { RoutineModel } = require('../src/schema/RoutineSchema');
const { UserModel } = require('../src/schema/UserSchema');
const { mutation } = require('../src/resolvers/routine');
const { hasTaskStarted } = require('../src/utils/timezone');

const NY = 'America/New_York';
// 2026-10-04T04:09:00Z = 00:09 on Sun 4 Oct in New York.
const JUST_AFTER_MIDNIGHT = new Date('2026-10-04T04:09:00Z');

describe('hasTaskStarted', () => {
  it('is false for a later time on the same day', () => {
    expect(hasTaskStarted('04-10-2026', '06:00', NY, JUST_AFTER_MIDNIGHT)).toBe(false);
  });

  it('is false for any time on a later day, even one earlier in the day than now', () => {
    const lateEvening = new Date('2026-10-04T03:50:00Z'); // 23:50 on 3 Oct in NY
    expect(hasTaskStarted('04-10-2026', '06:00', NY, lateEvening)).toBe(false);
  });

  it('is true once the time has arrived, and for earlier days', () => {
    expect(hasTaskStarted('04-10-2026', '00:05', NY, JUST_AFTER_MIDNIGHT)).toBe(true);
    expect(hasTaskStarted('03-10-2026', '23:00', NY, JUST_AFTER_MIDNIGHT)).toBe(true);
  });

  it('is false for a malformed date', () => {
    expect(hasTaskStarted('', '06:00', NY, JUST_AFTER_MIDNIGHT)).toBe(false);
  });
});

describe('passRoutineItem', () => {
  const exec = (value) => ({ exec: () => Promise.resolve(value) });
  const routine = (date) => ({
    _id: 'r1',
    date,
    tasklist: [{ id: 't1', time: '06:00', ticked: false, points: 10 }],
  });

  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(JUST_AFTER_MIDNIGHT);
    jest.spyOn(UserModel, 'findOne').mockReturnValue(exec({ timezone: NY }));
    jest.spyOn(RoutineModel, 'findOneAndUpdate').mockReturnValue(exec({ updated: true }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const pass = (args) => mutation.passRoutineItem.resolve(null, {
    id: 'r1', taskId: 't1', ticked: false, passed: true, ...args,
  }, {});

  it('refuses to mark a task passed before its start time has arrived', async () => {
    const doc = routine('04-10-2026');
    jest.spyOn(RoutineModel, 'findOne').mockReturnValue(exec(doc));
    await expect(pass()).resolves.toBe(doc);
    expect(RoutineModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('still marks a task passed once its start has gone by', async () => {
    jest.spyOn(RoutineModel, 'findOne').mockReturnValue(exec(routine('03-10-2026')));
    await expect(pass()).resolves.toEqual({ updated: true });
    expect(RoutineModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('always allows un-passing a task', async () => {
    jest.spyOn(RoutineModel, 'findOne').mockReturnValue(exec(routine('04-10-2026')));
    await expect(pass({ passed: false })).resolves.toEqual({ updated: true });
  });
});
