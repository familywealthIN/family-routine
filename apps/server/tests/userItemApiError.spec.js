// E2E: sendInvite / acceptInvite (and the sign-in error paths) answered
// "ApiError is not a constructor" because userItem.js destructured
// `{ ApiError }` from a module whose export IS the class.
const mockFindOne = jest.fn();

jest.mock('../src/schema/UserSchema', () => {
  const { GraphQLObjectType, GraphQLString } = jest.requireActual('graphql');
  return {
    UserItemType: new GraphQLObjectType({ name: 'UserItem', fields: { email: { type: GraphQLString } } }),
    UserModel: { findOne: (...args) => ({ exec: () => mockFindOne(...args) }) },
  };
});
jest.mock('../src/passport', () => ({ authenticateGoogle: jest.fn(), authenticateApple: jest.fn() }));
jest.mock('../src/utils/getEmailfromSession', () => () => 'me@example.invalid');
jest.mock('../src/utils/validateGroupUser', () => jest.fn());
jest.mock('../src/schema/RoutineSchema', () => ({ RoutineModel: {} }));
jest.mock('../src/schema/RoutineItemSchema', () => ({ RoutineItemModel: {} }));
jest.mock('../src/schema/GoalSchema', () => ({ GoalModel: {} }));
jest.mock('../src/schema/ProgressSchema', () => ({ ProgressModel: {} }));
jest.mock('../src/schema/ReferralSchema', () => ({ ReferralModel: {} }));
jest.mock('../src/utils/xpLedger', () => ({ grantWelcomePoints: jest.fn() }));

const ApiError = require('../src/utils/ApiError');
const { mutation } = require('../src/resolvers/userItem');

describe('userItem resolvers throw a real ApiError', () => {
  beforeEach(() => mockFindOne.mockReset());

  it('sendInvite to an address with no account -> 403 User Not Found', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const err = await mutation.sendInvite.resolve(null, { invitedEmail: 'nobody@example.invalid' }, {})
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('403:User Not Found');
    expect(err.networkStatus).toBe(403);
  });

  it('acceptInvite from someone who did not invite you -> 403 Group Not Found', async () => {
    mockFindOne.mockResolvedValueOnce({ inviterEmail: 'other@example.invalid' });

    const err = await mutation.acceptInvite.resolve(null, { inviterEmail: 'x@example.invalid' }, {})
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('403:Group Not Found');
  });
});
