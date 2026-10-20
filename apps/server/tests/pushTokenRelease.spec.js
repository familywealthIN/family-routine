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
        $unset: { notificationId: 1 },
      },
    );
    // Never $set over the list: the phone stays registered.
    mockUpdateOne.mock.calls.forEach(([, update]) => expect(update.$set).toBeUndefined());
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

describe('deviceTokens', () => {
  it('lists every real device once, legacy field included', () => {
    expect(deviceTokens({ notificationIds: ['a', 'b', 'undefined'], notificationId: 'a' })).toEqual(['a', 'b']);
    expect(deviceTokens({ notificationId: 'c' })).toEqual(['c']);
    expect(deviceTokens({})).toEqual([]);
  });
});
