process.env.ENCRYPTION_KEY = 'routine-ticked-at-test-key';

jest.mock('../src/utils/getEmailfromSession', () => () => 'user@example.com');
jest.mock('../src/utils/xpLedger', () => ({
  validateRedeem: jest.fn(),
  getXpBalance: jest.fn(() => Promise.resolve({ available: 100 })),
  recordTransaction: jest.fn(() => Promise.resolve()),
}));

const { RoutineModel } = require('../src/schema/RoutineSchema');
const { RoutineItemModel } = require('../src/schema/RoutineItemSchema');
const { UserModel } = require('../src/schema/UserSchema');
const { query, resetDayState } = require('../src/resolvers/routine');
const { mutation: xpMutation } = require('../src/resolvers/xp');
const { validateRedeem } = require('../src/utils/xpLedger');

// The cue engine (apps/cron/src/cue/cueEngine.js) learns a routine's usual time
// from `tasklist[].tickedAt`. routineDate rebuilt the day's tasklist from the
// shared routineItem templates and copied back only passed / wait / ticked /
// redeemed / passedPoints, so every /home read wrote the tick time away: 1 of
// 17 probed ticks still had it.
const exec = (value) => ({ exec: () => Promise.resolve(value) });
const TICKED_AT = new Date('2026-11-01T02:41:00Z');

describe('routineDate keeps tickedAt', () => {
  let stored;

  beforeEach(() => {
    stored = {
      date: '01-11-2026',
      tasklist: [
        { _id: 'wind-down', time: '21:30', ticked: true, tickedAt: TICKED_AT },
        { _id: 'sleep', time: '23:00', ticked: false },
      ],
    };
    jest.spyOn(RoutineModel, 'findOne').mockImplementation(() => exec(stored));
    // Fresh templates on every read, as Mongo returns them.
    jest.spyOn(RoutineItemModel, 'find').mockImplementation(() => exec([
      { _id: 'wind-down', time: '21:30' },
      { _id: 'sleep', time: '23:00' },
    ]));
    // The write becomes the document the next read finds.
    jest.spyOn(RoutineModel, 'findOneAndUpdate').mockImplementation((filter, update) => {
      stored = { ...stored, tasklist: update.$set.tasklist };
      return exec(stored);
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const read = () => query.routineDate.resolve(null, { date: '01-11-2026' }, {});

  it('still has the tick time after three reloads', async () => {
    await read();
    await read();
    const day = await read();

    expect(RoutineModel.findOneAndUpdate).toHaveBeenCalledTimes(3);
    const windDown = day.tasklist.find((t) => t._id === 'wind-down');
    expect(windDown.ticked).toBe(true);
    expect(windDown.tickedAt).toEqual(TICKED_AT);
    expect(day.tasklist.find((t) => t._id === 'sleep').tickedAt).toBeUndefined();
  });
});

describe('resetDayState', () => {
  it('clears a tick time a template may carry, so a new day starts untimed', () => {
    const template = { _id: 't1', ticked: true, tickedAt: TICKED_AT };
    resetDayState(template);
    expect(template.ticked).toBe(false);
    expect(template.tickedAt).toBeUndefined();
  });
});

describe('redeemRoutineItem', () => {
  beforeEach(() => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue(exec({ timezone: 'UTC' }));
    jest.spyOn(RoutineModel, 'findOne').mockReturnValue(exec({ _id: 'r1', tasklist: [] }));
    jest.spyOn(RoutineModel, 'findOneAndUpdate').mockReturnValue(exec({ _id: 'r1', tasklist: [] }));
    validateRedeem.mockReturnValue({
      ok: true,
      cost: 15,
      task: { _id: 't1', ticked: false, stimuli: [{ name: 'D', splitRate: 2, earned: 0 }] },
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('stamps tickedAt like an on-time tick (a late check-in is a full tick)', async () => {
    const before = Date.now();
    await xpMutation.redeemRoutineItem.resolve(null, { id: 'r1', taskId: 't1', date: '01-11-2026' }, {});

    const { $set } = RoutineModel.findOneAndUpdate.mock.calls[0][1];
    expect($set['tasklist.$.ticked']).toBe(true);
    expect($set['tasklist.$.redeemed']).toBe(true);
    expect($set['tasklist.$.tickedAt']).toBeInstanceOf(Date);
    expect($set['tasklist.$.tickedAt'].getTime()).toBeGreaterThanOrEqual(before);
  });
});
