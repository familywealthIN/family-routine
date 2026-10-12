/* eslint-disable global-require */

// The privacy policy promises that deleting an account removes all of the
// user's data, so this pins every user-keyed collection deleteAccount clears.

const mockCalls = [];
function mockModel(name) {
  return {
    deleteMany: jest.fn((filter) => { mockCalls.push([name, 'deleteMany', filter]); return Promise.resolve(); }),
    deleteOne: jest.fn((filter) => { mockCalls.push([name, 'deleteOne', filter]); return Promise.resolve(); }),
  };
}

jest.mock('../schema/UserSchema', () => ({ UserModel: mockModel('User'), UserItemType: require('graphql').GraphQLString }));
jest.mock('../schema/RoutineSchema', () => ({ RoutineModel: mockModel('Routine') }));
jest.mock('../schema/RoutineItemSchema', () => ({ RoutineItemModel: mockModel('RoutineItem') }));
jest.mock('../schema/GoalSchema', () => ({ GoalModel: mockModel('Goal') }));
jest.mock('../schema/ProgressSchema', () => ({ ProgressModel: mockModel('Progress') }));
jest.mock('../schema/ReferralSchema', () => ({ ReferralModel: mockModel('Referral') }));
jest.mock('../schema/AgentSchema', () => ({ AgentModel: mockModel('Agent') }));
jest.mock('../schema/RoutineChatSchema', () => ({ RoutineChatMessageModel: mockModel('RoutineChat') }));
jest.mock('../schema/XpTransactionSchema', () => ({ XpTransactionModel: mockModel('XpTransaction') }));
jest.mock('../passport', () => ({ authenticateGoogle: jest.fn(), authenticateApple: jest.fn() }));
jest.mock('../utils/xpLedger', () => ({ grantWelcomePoints: jest.fn() }));
jest.mock('../utils/getEmailfromSession', () => jest.fn(() => 'user@example.com'));

const { mutation } = require('./userItem');

describe('deleteAccount', () => {
  beforeEach(() => { mockCalls.length = 0; });

  it('deletes every collection keyed by the user', async () => {
    const result = await mutation.deleteAccount.resolve({}, {}, {});

    expect(result.success).toBe('true');
    const email = 'user@example.com';
    expect(mockCalls).toEqual(expect.arrayContaining([
      ['Routine', 'deleteMany', { email }],
      ['RoutineItem', 'deleteMany', { email }],
      ['Goal', 'deleteMany', { email }],
      ['Progress', 'deleteMany', { email }],
      ['Agent', 'deleteMany', { email }],
      ['RoutineChat', 'deleteMany', { email }],
      ['XpTransaction', 'deleteMany', { email }],
      ['Referral', 'deleteMany', { $or: [{ inviterEmail: email }, { inviteeEmail: email }] }],
      ['User', 'deleteOne', { email }],
    ]));
    expect(mockCalls).toHaveLength(9);
  });
});
