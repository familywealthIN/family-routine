/* eslint-disable global-require */

// D-28: bulkAddGoalItems called setUserTag once per item. Every entry of a
// generated plan carries the same tags, so saving a plan issued the identical
// $addToSet — and, against a unique index on User.tags, the same duplicate-key
// recovery — once per milestone.

process.env.ENCRYPTION_KEY = 'bulk-add-goal-items-tags-test-key';

const mockGoalFindOne = jest.fn();
const mockGoalFindOneAndUpdate = jest.fn();
const mockUserUpdateOne = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      findOne: mockGoalFindOne,
      findOneAndUpdate: mockGoalFindOneAndUpdate,
    },
  };
});

jest.mock('../schema/UserSchema', () => {
  const actual = jest.requireActual('../schema/UserSchema');
  return {
    ...actual,
    UserModel: {
      updateOne: mockUserUpdateOne,
    },
  };
});

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };
const TAGS = ['time:morning', 'priority:plan'];

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** A generated plan: one milestone per week, all carrying the same tags. */
const planEntries = (count) => Array.from({ length: count }, (unused, index) => ({
  date: `0${index + 1}-09-2026`,
  period: 'week',
  body: `Milestone ${index + 1}`,
  isMilestone: true,
  goalRef: 'plan-goal-1',
  tags: TAGS,
}));

const savePlan = (goalItems) => {
  const { mutation } = require('./goal');
  return mutation.bulkAddGoalItems.resolve(null, { goalItems }, CONTEXT);
};

beforeEach(() => {
  mockGoalFindOne.mockReset();
  mockGoalFindOneAndUpdate.mockReset();
  mockUserUpdateOne.mockReset();
  mockGoalFindOneAndUpdate.mockReturnValue(exec(null));
  // The goal document for each date already exists, so the item is appended
  // to it and read back from the same lookup shape.
  mockGoalFindOne.mockImplementation(({ date, period }) => exec({
    date,
    period,
    goalItems: [{ id: `${date}-item`, body: 'Milestone' }],
  }));
  mockUserUpdateOne.mockResolvedValue({});
});

describe('bulkAddGoalItems tag writes', () => {
  it('writes the plan tags once, not once per milestone', async () => {
    await savePlan(planEntries(7));

    expect(mockUserUpdateOne).toHaveBeenCalledTimes(1);
    const [criteria, update] = mockUserUpdateOne.mock.calls[0];
    expect(criteria).toEqual({ email: EMAIL });
    expect(update.$addToSet.tags.$each).toEqual(TAGS);
  });

  it('still collects a tag only one item carries', async () => {
    const goalItems = planEntries(3);
    goalItems[1].tags = [...TAGS, 'project:launch'];

    await savePlan(goalItems);

    expect(mockUserUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockUserUpdateOne.mock.calls[0][1].$addToSet.tags.$each)
      .toEqual([...TAGS, 'project:launch']);
  });

  it('does not write at all when no item carries a tag', async () => {
    await savePlan(planEntries(2).map((entry) => ({ ...entry, tags: [] })));

    expect(mockUserUpdateOne).not.toHaveBeenCalled();
  });
});
