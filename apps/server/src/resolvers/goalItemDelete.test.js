/* eslint-disable global-require */

// D-20: deleting a completed day goal item was a bare $pull, so the K credit it
// had earned stayed on the routine task and the card kept counting a goal item
// that no longer existed (a routine reading 1/2 with an empty goal list).

process.env.ENCRYPTION_KEY = 'goal-item-delete-test-key';

const mockGoalFindOne = jest.fn();
const mockGoalFindOneAndUpdate = jest.fn();
const mockRoutineFindOne = jest.fn();
const mockRoutineFindOneAndUpdate = jest.fn();

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

jest.mock('../schema/RoutineSchema', () => {
  const actual = jest.requireActual('../schema/RoutineSchema');
  return {
    ...actual,
    RoutineModel: {
      findOne: mockRoutineFindOne,
      findOneAndUpdate: mockRoutineFindOneAndUpdate,
    },
  };
});

const EMAIL = 'me@example.com';
const DATE = '10-09-2026';
const CONTEXT = { decodedToken: { email: EMAIL } };

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** One goal item hanging off the 06:40 task, which holds a single K slot. */
function goalDoc(isComplete) {
  return {
    goalItems: [{
      id: 'g1', body: 'Active Recovery', taskRef: 'task-1', isComplete,
    }],
  };
}

/** The day's routine with the K already credited for that goal item. */
function routineDoc(kEarned) {
  return {
    tasklist: [{
      _id: 'task-1',
      points: 15,
      stimuli: [
        { name: 'D', splitRate: 7 / 3, earned: 0 },
        { name: 'K', splitRate: 2, earned: kEarned },
        { name: 'G', splitRate: 4, earned: 0 },
      ],
    }],
  };
}

const deleteDayItem = () => {
  const { mutation } = require('./goal');
  return mutation.deleteGoalItem.resolve(
    null,
    { id: 'g1', date: DATE, period: 'day' },
    CONTEXT,
  );
};

beforeEach(() => {
  mockGoalFindOne.mockReset();
  mockGoalFindOneAndUpdate.mockReset();
  mockRoutineFindOne.mockReset();
  mockRoutineFindOneAndUpdate.mockReset();
  mockGoalFindOneAndUpdate.mockReturnValue(exec(null));
  mockRoutineFindOneAndUpdate.mockReturnValue(exec(null));
});

describe('deleteGoalItem stimulus rollback', () => {
  it('refunds the K a completed day item had earned', async () => {
    mockGoalFindOne.mockReturnValue(exec(goalDoc(true)));
    mockRoutineFindOne.mockReturnValue(exec(routineDoc(15)));

    await deleteDayItem();

    expect(mockRoutineFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [criteria, update] = mockRoutineFindOneAndUpdate.mock.calls[0];
    expect(criteria).toMatchObject({ date: DATE, email: EMAIL, 'tasklist._id': 'task-1' });
    const kStimulus = update.$set['tasklist.$.stimuli'].find((st) => st.name === 'K');
    expect(kStimulus.earned).toBe(0);
  });

  it('leaves the routine alone when the deleted item was never completed', async () => {
    mockGoalFindOne.mockReturnValue(exec(goalDoc(false)));
    mockRoutineFindOne.mockReturnValue(exec(routineDoc(0)));

    await deleteDayItem();

    expect(mockRoutineFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('leaves the routine alone for a week goal item, which never credited K', async () => {
    mockGoalFindOne.mockReturnValue(exec(goalDoc(true)));
    mockRoutineFindOne.mockReturnValue(exec(routineDoc(15)));

    const { mutation } = require('./goal');
    await mutation.deleteGoalItem.resolve(
      null,
      { id: 'g1', date: DATE, period: 'week' },
      CONTEXT,
    );

    expect(mockRoutineFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
