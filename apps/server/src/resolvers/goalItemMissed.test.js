/* eslint-disable global-require */

// D-07: an item could only leave a day by being completed (a lie) or deleted
// (the record gone). markGoalItemMissed records the miss on the item instead,
// and must leave isComplete alone so every progress count still sees it as
// outstanding.

process.env.ENCRYPTION_KEY = 'goal-item-missed-test-key';

const mockGoalFindOneAndUpdate = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      findOneAndUpdate: mockGoalFindOneAndUpdate,
    },
  };
});

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };

const exec = (value) => ({ exec: () => Promise.resolve(value) });

const goalDoc = (items) => ({ date: '18-08-2026', period: 'day', goalItems: items });

const markMissed = (args) => {
  const { mutation } = require('./goal');
  return mutation.markGoalItemMissed.resolve(
    null,
    { id: 'g1', isMissed: true, ...args },
    CONTEXT,
  );
};

beforeEach(() => {
  mockGoalFindOneAndUpdate.mockReset();
});

describe('markGoalItemMissed', () => {
  it('records the miss on the item, wherever the item currently lives', async () => {
    const missed = { id: 'g1', isComplete: false, status: 'missed' };
    mockGoalFindOneAndUpdate.mockReturnValue(exec(goalDoc([missed])));

    const result = await markMissed();

    const [criteria, update] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(criteria).toEqual({ email: EMAIL, 'goalItems._id': 'g1' });
    expect(update.$set).toEqual({ 'goalItems.$.status': 'missed' });
    expect(result).toBe(missed);
  });

  it('never touches isComplete, so the item stays outstanding', async () => {
    mockGoalFindOneAndUpdate.mockReturnValue(exec(goalDoc([{ id: 'g1', isComplete: false }])));

    await markMissed();

    const [, update] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(Object.keys(update.$set)).toEqual(['goalItems.$.status']);
    expect(update.$set['goalItems.$.isComplete']).toBeUndefined();
  });

  it('returns the item to todo when the miss is unmarked', async () => {
    mockGoalFindOneAndUpdate.mockReturnValue(exec(goalDoc([{ id: 'g1', status: 'todo' }])));

    await markMissed({ isMissed: false });

    const [, update] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(update.$set['goalItems.$.status']).toBe('todo');
  });

  it('rejects an item that belongs to no goal document', async () => {
    mockGoalFindOneAndUpdate.mockReturnValue(exec(null));

    await expect(markMissed()).rejects.toThrow('Goal item not found');
  });
});
