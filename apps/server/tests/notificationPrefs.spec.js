const { withDefaults, sanitizePrefs, NOTIFICATION_PREF_DEFAULTS } = require('../src/schema/NotificationPrefsSchema');

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
jest.mock('../src/schema/UserSchema', () => {
  const { GraphQLObjectType, GraphQLString } = jest.requireActual('graphql');
  return {
    UserItemType: new GraphQLObjectType({ name: 'UserItem', fields: { email: { type: GraphQLString } } }),
    UserModel: {
      findOne: (...args) => ({ exec: () => mockFindOne(...args) }),
      findOneAndUpdate: (...args) => ({ exec: () => mockFindOneAndUpdate(...args) }),
    },
  };
});
jest.mock('../src/utils/getEmailfromSession', () => () => 'me@example.invalid');
jest.mock('../src/utils/validateGroupUser', () => jest.fn());
jest.mock('../src/schema/RoutineSchema', () => ({ RoutineModel: {} }));
jest.mock('../src/schema/RoutineItemSchema', () => ({ RoutineItemModel: {} }));
jest.mock('../src/schema/GoalSchema', () => ({ GoalModel: {} }));
jest.mock('../src/schema/ProgressSchema', () => ({ ProgressModel: {} }));
jest.mock('../src/schema/ReferralSchema', () => ({ ReferralModel: {} }));
jest.mock('../src/utils/xpLedger', () => ({ grantWelcomePoints: jest.fn() }));

const { query, mutation } = require('../src/resolvers/userItem');

beforeEach(() => {
  mockFindOne.mockReset();
  mockFindOneAndUpdate.mockReset();
});

describe('notification prefs', () => {
  it('fills defaults for a user who never set any', async () => {
    mockFindOne.mockResolvedValueOnce({});
    await expect(query.notificationPrefs.resolve(null, {}, {})).resolves.toEqual(NOTIFICATION_PREF_DEFAULTS);
    expect(withDefaults({ morning: false }).morning).toBe(false);
  });

  it('updates only the fields sent, as dotted paths', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ notificationPrefs: { evening: false, eveningTime: '20:30' } });
    const out = await mutation.updateNotificationPrefs.resolve(null, { prefs: { evening: false, eveningTime: '20:30' } }, {});
    expect(mockFindOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: { 'notificationPrefs.evening': false, 'notificationPrefs.eveningTime': '20:30' },
    });
    expect(out).toMatchObject({ evening: false, eveningTime: '20:30', morning: true });
  });

  it('rejects a malformed time and ignores unknown keys', () => {
    expect(() => sanitizePrefs({ morningTime: '7am' })).toThrow('HH:mm');
    expect(sanitizePrefs({ hack: true, streak: 0 })).toEqual({ streak: false });
  });
});
