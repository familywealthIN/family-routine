// "Cancel invite" is real: cancelInvite clears the invitee's inviterEmail only
// when the caller sent it, and pendingInvites (the caller's open sent invites)
// comes from the server so a declined invite stops holding a member slot.
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../src/schema/UserSchema', () => {
  const { GraphQLObjectType, GraphQLString } = jest.requireActual('graphql');
  return {
    UserItemType: new GraphQLObjectType({ name: 'UserItem', fields: { email: { type: GraphQLString } } }),
    UserModel: {
      findOne: (...args) => ({ exec: () => mockFindOne(...args) }),
      find: (...args) => ({ exec: () => mockFind(...args) }),
      findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
    },
  };
});
jest.mock('../src/passport', () => ({ authenticateGoogle: jest.fn(), authenticateApple: jest.fn() }));
jest.mock('../src/utils/getEmailfromSession', () => () => 'Me@Example.invalid');
jest.mock('../src/utils/validateGroupUser', () => jest.fn());
jest.mock('../src/schema/RoutineSchema', () => ({ RoutineModel: {} }));
jest.mock('../src/schema/RoutineItemSchema', () => ({ RoutineItemModel: {} }));
jest.mock('../src/schema/GoalSchema', () => ({ GoalModel: {} }));
jest.mock('../src/schema/ProgressSchema', () => ({ ProgressModel: {} }));
jest.mock('../src/schema/ReferralSchema', () => ({ ReferralModel: {} }));
jest.mock('../src/utils/xpLedger', () => ({ grantWelcomePoints: jest.fn() }));

const ApiError = require('../src/utils/ApiError');
const { query, mutation } = require('../src/resolvers/userItem');

const cancel = (invitedEmail) => mutation.cancelInvite.resolve(null, { invitedEmail }, {});

beforeEach(() => {
  mockFindOne.mockReset();
  mockFind.mockReset();
  mockFindOneAndUpdate.mockReset();
});

describe('cancelInvite', () => {
  it('clears inviterEmail on an invite the caller sent (case-insensitive) and returns only the row fields', async () => {
    mockFindOne.mockResolvedValueOnce({
      _id: 'u2', email: 'jo@x.com', inviterEmail: 'me@example.invalid', groupId: 'theirs', apiKey: 'secret',
    });
    mockFindOneAndUpdate.mockResolvedValueOnce({
      _id: 'u2', email: 'jo@x.com', name: 'Jo', picture: 'p.png', inviterEmail: '', groupId: 'theirs', apiKey: 'secret',
    });

    const result = await cancel('JO@x.com');

    const [lookup] = mockFindOne.mock.calls[0];
    expect(lookup.email).toBeInstanceOf(RegExp);
    expect(lookup.email.test('jo@x.com')).toBe(true);
    expect(lookup.email.test('xjo@x.com')).toBe(false);

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u2', inviterEmail: 'me@example.invalid' },
      { inviterEmail: '' },
      { new: true },
    );
    // Group membership is never part of the write.
    expect(mockFindOneAndUpdate.mock.calls[0][1]).not.toHaveProperty('groupId');
    expect(result).toEqual({
      email: 'jo@x.com', name: 'Jo', picture: 'p.png', inviterEmail: '',
    });
  });

  it("refuses someone else's invite with a 403 and writes nothing", async () => {
    mockFindOne.mockResolvedValueOnce({ _id: 'u2', email: 'jo@x.com', inviterEmail: 'other@x.com' });

    const err = await cancel('jo@x.com').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.networkStatus).toBe(403);
    expect(err.message).toBe('403:Invite Not Found');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses an unknown address with a 403', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const err = await cancel('nobody@x.com').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.networkStatus).toBe(403);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses an invite that is no longer open (already accepted/declined)', async () => {
    mockFindOne.mockResolvedValueOnce({ _id: 'u2', email: 'jo@x.com', inviterEmail: '' });

    const err = await cancel('jo@x.com').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('403s when the invite changed between the read and the write', async () => {
    mockFindOne.mockResolvedValueOnce({ _id: 'u2', email: 'jo@x.com', inviterEmail: 'me@example.invalid' });
    mockFindOneAndUpdate.mockResolvedValueOnce(null);

    const err = await cancel('jo@x.com').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.networkStatus).toBe(403);
  });

  it('treats regex characters in the address literally', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    await cancel('.*@x.com').catch(() => {});

    const [lookup] = mockFindOne.mock.calls[0];
    expect(lookup.email.test('anyone@x.com')).toBe(false);
    expect(lookup.email.test('.*@x.com')).toBe(true);
  });
});

describe('pendingInvites', () => {
  it("lists only open invites the caller sent, excluding anyone already in the caller's group", async () => {
    mockFindOne.mockResolvedValueOnce({ email: 'me@example.invalid', groupId: 'g1' });
    mockFind.mockResolvedValueOnce([
      {
        email: 'open@x.com', name: 'Open', picture: 'o.png', inviterEmail: 'me@example.invalid', groupId: '', apiKey: 'k',
      },
      {
        email: 'elsewhere@x.com', name: 'Else', inviterEmail: 'ME@example.invalid', groupId: 'g9',
      },
      {
        email: 'joined@x.com', name: 'Joined', inviterEmail: 'me@example.invalid', groupId: 'g1',
      },
    ]);

    const result = await query.pendingInvites.resolve(null, {}, {});

    const [filter, projection] = mockFind.mock.calls[0];
    expect(filter.inviterEmail.test('me@example.invalid')).toBe(true);
    expect(projection).not.toMatch(/apiKey|token|oauth|notificationId/);
    expect(result).toEqual([
      { email: 'open@x.com', name: 'Open', picture: 'o.png' },
      { email: 'elsewhere@x.com', name: 'Else', picture: '' },
    ]);
  });

  it('drops a declined invite (declineInvite cleared inviterEmail, so the query no longer matches it)', async () => {
    mockFindOne.mockResolvedValueOnce({ email: 'me@example.invalid', groupId: 'g1' });
    // The DB filter is what excludes a declined invite; a stale row that
    // slipped through with a cleared inviterEmail is filtered as well.
    mockFind.mockResolvedValueOnce([{ email: 'declined@x.com', inviterEmail: '', groupId: '' }]);

    expect(await query.pendingInvites.resolve(null, {}, {})).toEqual([]);
  });

  it('works for a caller with no group yet', async () => {
    mockFindOne.mockResolvedValueOnce({ email: 'me@example.invalid', groupId: '' });
    mockFind.mockResolvedValueOnce([{ email: 'a@x.com', inviterEmail: 'me@example.invalid', groupId: '' }]);

    expect(await query.pendingInvites.resolve(null, {}, {})).toEqual([
      { email: 'a@x.com', name: '', picture: '' },
    ]);
  });
});
