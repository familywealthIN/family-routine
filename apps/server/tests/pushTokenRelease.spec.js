// Multi-device push tokens. Each signed-in device registers its own token in
// `notificationIds`; sign-out releases only that device (no session needed —
// the JWT may be expired); a sign-in takes the token from any other account so
// a shared device never receives the previous account's reminders.
const mockUpdateMany = jest.fn(() => ({ exec: () => Promise.resolve({}) }));
const mockUpdateOne = jest.fn(() => ({ exec: () => Promise.resolve({}) }));
const mockFindOne = jest.fn();

jest.mock('../src/schema/UserSchema', () => {
  const { GraphQLObjectType, GraphQLString } = jest.requireActual('graphql');
  return {
    UserItemType: new GraphQLObjectType({ name: 'UserItem', fields: { email: { type: GraphQLString } } }),
    UserModel: {
      updateMany: (...args) => mockUpdateMany(...args),
      updateOne: (...args) => mockUpdateOne(...args),
      findOne: (...args) => ({ exec: () => mockFindOne(...args) }),
    },
  };
});
jest.mock('../src/utils/getEmailfromSession', () => jest.fn(() => 'me@example.invalid'));
jest.mock('../src/utils/validateGroupUser', () => jest.fn());
jest.mock('../src/schema/RoutineSchema', () => ({ RoutineModel: {} }));
jest.mock('../src/schema/RoutineItemSchema', () => ({ RoutineItemModel: {} }));
jest.mock('../src/schema/GoalSchema', () => ({ GoalModel: {} }));
jest.mock('../src/schema/ProgressSchema', () => ({ ProgressModel: {} }));
jest.mock('../src/schema/ReferralSchema', () => ({ ReferralModel: {} }));
jest.mock('../src/utils/xpLedger', () => ({ grantWelcomePoints: jest.fn() }));

const getEmailfromSession = require('../src/utils/getEmailfromSession');
const { mutation } = require('../src/resolvers/userItem');
const {
  registerPushToken, deviceTokens, isRealPushToken, MAX_DEVICES,
} = require('../src/passport');

const User = {
  updateMany: (...args) => mockUpdateMany(...args),
  updateOne: (...args) => mockUpdateOne(...args),
};
const release = (notificationId) => mutation.releaseNotificationToken
  .resolve(null, { notificationId }, {});
const register = (notificationId) => mutation.registerNotificationToken
  .resolve(null, { notificationId }, {});

beforeEach(() => {
  mockUpdateMany.mockClear();
  mockUpdateOne.mockClear();
  mockFindOne.mockReset();
});

describe('releaseNotificationToken', () => {
  it('removes only this device token, from the list and the legacy field', async () => {
    getEmailfromSession.mockClear();
    await expect(release('fcm-a')).resolves.toBe(true);
    expect(getEmailfromSession).not.toHaveBeenCalled();
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { notificationIds: 'fcm-a' },
      { $pull: { notificationIds: 'fcm-a' } },
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { notificationId: 'fcm-a' },
      { $unset: { notificationId: 1 } },
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { notificationActionTokens: 'fcm-a' },
      { $pull: { notificationActionTokens: 'fcm-a' } },
    );
  });

  it.each(['', 'undefined', 'null'])('ignores the placeholder token %p', async (token) => {
    await expect(release(token)).resolves.toBe(false);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});

describe('registerPushToken', () => {
  it('adds the device alongside the existing ones, newest last and capped', async () => {
    await registerPushToken(User, { _id: 'me', notificationIds: ['fcm-phone'] }, 'fcm-tablet');
    expect(mockUpdateOne).toHaveBeenLastCalledWith(
      { _id: 'me' },
      {
        $push: { notificationIds: { $each: ['fcm-tablet'], $slice: -MAX_DEVICES } },
        $set: { notificationId: 'fcm-tablet' },
      },
    );
    // The list is pushed to, never replaced: the phone stays registered.
    mockUpdateOne.mock.calls.forEach(([, update]) => expect(update.$set && update.$set.notificationIds).toBeUndefined());
  });

  it('takes the token from every other account first', async () => {
    await registerPushToken(User, { _id: 'me' }, 'fcm-a');
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { _id: { $ne: 'me' }, notificationIds: 'fcm-a' },
      { $pull: { notificationIds: 'fcm-a' } },
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { _id: { $ne: 'me' }, notificationId: 'fcm-a' },
      { $unset: { notificationId: 1 } },
    );
  });

  it('folds the legacy single token into the list instead of losing that device', async () => {
    await registerPushToken(User, { _id: 'me', notificationId: 'fcm-old' }, 'fcm-new');
    const [, update] = mockUpdateOne.mock.calls[mockUpdateOne.mock.calls.length - 1];
    expect(update.$push.notificationIds.$each).toEqual(['fcm-old', 'fcm-new']);
  });

  it('does nothing for an empty token', async () => {
    await registerPushToken(User, { _id: 'me' }, '');
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(isRealPushToken('undefined')).toBe(false);
  });
});

describe('registerNotificationToken', () => {
  it('registers the signed-in user\'s device', async () => {
    mockFindOne.mockResolvedValueOnce({ _id: 'me', notificationIds: [] });
    await expect(register('fcm-a')).resolves.toBe(true);
    expect(mockFindOne.mock.calls[0][0]).toEqual({ email: 'me@example.invalid' });
    expect(mockUpdateOne).toHaveBeenCalled();
  });

  it('requires a session', async () => {
    getEmailfromSession.mockImplementationOnce(() => { throw new Error('401:Authentication required'); });
    await expect(register('fcm-a')).rejects.toThrow('401');
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});

describe('registerNotificationActions', () => {
  const registerActions = (notificationId) => mutation.registerNotificationActions
    .resolve(null, { notificationId }, {});

  it('flags only a token this user already registered', async () => {
    await expect(registerActions('fcm-phone')).resolves.toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { email: 'me@example.invalid', notificationIds: 'fcm-phone' },
      { $addToSet: { notificationActionTokens: 'fcm-phone' } },
    );
  });

  it('ignores a placeholder token and requires a session', async () => {
    await expect(registerActions('undefined')).resolves.toBe(false);
    getEmailfromSession.mockImplementationOnce(() => { throw new Error('401:Authentication required'); });
    await expect(registerActions('fcm-phone')).rejects.toThrow('401');
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('a token moving to another account loses the flag there', async () => {
    await registerPushToken(User, { _id: 'me' }, 'fcm-a');
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { _id: { $ne: 'me' }, notificationActionTokens: 'fcm-a' },
      { $pull: { notificationActionTokens: 'fcm-a' } },
    );
  });
});

describe('registerLiveActivity', () => {
  const START = 'ab'.repeat(32);
  const registerLive = (notificationId, startToken) => mutation.registerLiveActivity
    .resolve(null, { notificationId, startToken }, {});

  it('replaces this device\'s start token, only on a device this user registered', async () => {
    await expect(registerLive('fcm-phone', START.toUpperCase())).resolves.toBe(true);
    expect(mockUpdateOne).toHaveBeenNthCalledWith(
      1,
      { email: 'me@example.invalid' },
      { $pull: { liveActivityTokens: { device: 'fcm-phone' } } },
    );
    expect(mockUpdateOne).toHaveBeenNthCalledWith(
      2,
      { email: 'me@example.invalid', notificationIds: 'fcm-phone' },
      { $push: { liveActivityTokens: { device: 'fcm-phone', start: START } } },
    );
  });

  it('no token turns it off for this device', async () => {
    await expect(registerLive('fcm-phone', null)).resolves.toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockUpdateOne.mock.calls[0][1]).toEqual({ $pull: { liveActivityTokens: { device: 'fcm-phone' } } });
  });

  it('rejects a malformed token or device, and requires a session', async () => {
    await expect(registerLive('fcm-phone', 'not-hex')).resolves.toBe(false);
    await expect(registerLive('undefined', START)).resolves.toBe(false);
    expect(mockUpdateOne).not.toHaveBeenCalled();
    getEmailfromSession.mockImplementationOnce(() => { throw new Error('401:Authentication required'); });
    await expect(registerLive('fcm-phone', START)).rejects.toThrow('401');
  });
});

describe('registerAlarmDevice', () => {
  const registerAlarms = (notificationId, through, routines) => mutation.registerAlarmDevice
    .resolve(null, { notificationId, through, routines }, {});

  it('records up to when this device rings its alarms itself', async () => {
    await expect(registerAlarms('fcm-phone', '2026-11-06T04:00:00.000Z', ['r1@07:00', 42])).resolves.toBe(true);
    expect(mockUpdateOne).toHaveBeenNthCalledWith(
      2,
      { email: 'me@example.invalid', notificationIds: 'fcm-phone' },
      {
        $push: {
          alarmDevices: { device: 'fcm-phone', through: new Date('2026-11-06T04:00:00.000Z'), routines: ['r1@07:00'] },
        },
      },
    );
  });

  it('no date turns it off; a bad date changes nothing', async () => {
    await expect(registerAlarms('fcm-phone', null)).resolves.toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    mockUpdateOne.mockClear();
    await expect(registerAlarms('fcm-phone', 'soon')).resolves.toBe(false);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('a released or moved device loses both', async () => {
    await release('fcm-a');
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { 'liveActivityTokens.device': 'fcm-a' },
      { $pull: { liveActivityTokens: { device: 'fcm-a' } } },
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { 'alarmDevices.device': 'fcm-a' },
      { $pull: { alarmDevices: { device: 'fcm-a' } } },
    );
  });
});

describe('deviceTokens', () => {
  it('lists every real device once, legacy field included', () => {
    expect(deviceTokens({ notificationIds: ['a', 'b', 'undefined'], notificationId: 'a' })).toEqual(['a', 'b']);
    expect(deviceTokens({ notificationId: 'c' })).toEqual(['c']);
    expect(deviceTokens({})).toEqual([]);
  });
});
