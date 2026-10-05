/* eslint-disable global-require */

// D-15: deleting a parent goal was a $pull of that one subdocument, so every
// milestone pointing at it by `goalRef` survived with a reference that no
// longer resolved — unreachable from the goal tree, still counted by "Total Day
// Tasks" and still drawn on the calendar. The delete now cascades, and
// `goalItemMilestones` lets the confirmation dialog name what will go.

process.env.ENCRYPTION_KEY = 'goal-item-cascade-delete-test-key';

const mockGoalFind = jest.fn();
const mockGoalFindOne = jest.fn();
const mockGoalFindOneAndUpdate = jest.fn();
const mockRoutineFindOne = jest.fn();
const mockRoutineFindOneAndUpdate = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      find: mockGoalFind,
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
const WEEK_DATE = '17-08-2026';
const CONTEXT = { decodedToken: { email: EMAIL } };

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** A goal item as the read middleware hands it back (decrypted subdocument). */
function item(id, body, extra = {}) {
  const goalItem = {
    id, body, isComplete: false, ...extra,
  };
  goalItem.toObject = () => ({ ...goalItem, toObject: undefined });
  return goalItem;
}

/**
 * The tree from the report: one week goal with seven day milestones, plus a
 * month goal above it so the walk has more than one level to cover.
 */
const MONTH_GOAL = { period: 'month', date: '31-08-2026', goalItems: [item('m1', 'Ship the beta')] };
const WEEK_GOAL = { period: 'week', date: WEEK_DATE, goalItems: [item('w1', 'Run every day', { goalRef: 'm1' })] };
const DAY_GOALS = [16, 17, 18, 19, 20, 21, 22].map((day) => ({
  period: 'day',
  date: `${day}-08-2026`,
  goalItems: [item(`d${day}`, `Run on the ${day}th`, { goalRef: 'w1' })],
}));

/** Stands in for the `goalItems.goalRef: { $in: [...] }` index lookup. */
function findByGoalRef(criteria) {
  const refs = criteria['goalItems.goalRef'].$in;
  return exec([MONTH_GOAL, WEEK_GOAL, ...DAY_GOALS]
    .filter((goal) => goal.goalItems.some((goalItem) => refs.includes(goalItem.goalRef))));
}

beforeEach(() => {
  mockGoalFind.mockReset();
  mockGoalFindOne.mockReset();
  mockGoalFindOneAndUpdate.mockReset();
  mockRoutineFindOne.mockReset();
  mockRoutineFindOneAndUpdate.mockReset();
  mockGoalFind.mockImplementation(findByGoalRef);
  mockGoalFindOne.mockReturnValue(exec(WEEK_GOAL));
  mockGoalFindOneAndUpdate.mockReturnValue(exec(null));
  mockRoutineFindOne.mockReturnValue(exec(null));
  mockRoutineFindOneAndUpdate.mockReturnValue(exec(null));
});

/** Every goal item id the resolver pulled, in call order. */
const pulledIds = () => mockGoalFindOneAndUpdate.mock.calls
  .map(([, update]) => update.$pull.goalItems._id);

describe('deleteGoalItem cascade', () => {
  it('pulls the seven day milestones along with their week goal', async () => {
    const { mutation } = require('./goal');

    await mutation.deleteGoalItem.resolve(
      null,
      { id: 'w1', date: WEEK_DATE, period: 'week' },
      CONTEXT,
    );

    expect(pulledIds()).toEqual([
      'w1', 'd16', 'd17', 'd18', 'd19', 'd20', 'd21', 'd22',
    ]);
  });

  it('pulls each milestone from its own goal document', async () => {
    const { mutation } = require('./goal');

    await mutation.deleteGoalItem.resolve(
      null,
      { id: 'w1', date: WEEK_DATE, period: 'week' },
      CONTEXT,
    );

    const dayCall = mockGoalFindOneAndUpdate.mock.calls
      .find(([, update]) => update.$pull.goalItems._id === 'd18');
    expect(dayCall[0]).toEqual({ date: '18-08-2026', period: 'day', email: EMAIL });
  });

  it('follows the links down every level, not just the first', async () => {
    const { mutation } = require('./goal');

    await mutation.deleteGoalItem.resolve(
      null,
      { id: 'm1', date: '31-08-2026', period: 'month' },
      CONTEXT,
    );

    expect(pulledIds()).toContain('w1');
    expect(pulledIds()).toContain('d22');
  });

  it('leaves an unreferenced goal item deleting only itself', async () => {
    const { mutation } = require('./goal');

    await mutation.deleteGoalItem.resolve(
      null,
      { id: 'd16', date: '16-08-2026', period: 'day' },
      CONTEXT,
    );

    expect(pulledIds()).toEqual(['d16']);
  });

  it('refunds the K a completed day milestone had earned', async () => {
    const completedDay = {
      period: 'day',
      date: '16-08-2026',
      goalItems: [item('d16', 'Run on the 16th', { goalRef: 'w1', isComplete: true, taskRef: 'task-1' })],
    };
    mockGoalFind.mockImplementation((criteria) => {
      const refs = criteria['goalItems.goalRef'].$in;
      return exec(refs.includes('w1') ? [completedDay] : []);
    });
    mockRoutineFindOne.mockReturnValue(exec({
      tasklist: [{
        _id: 'task-1',
        points: 15,
        stimuli: [
          { name: 'D', splitRate: 7 / 3, earned: 0 },
          { name: 'K', splitRate: 2, earned: 15 },
          { name: 'G', splitRate: 4, earned: 0 },
        ],
      }],
    }));

    const { mutation } = require('./goal');
    await mutation.deleteGoalItem.resolve(
      null,
      { id: 'w1', date: WEEK_DATE, period: 'week' },
      CONTEXT,
    );

    expect(mockRoutineFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [criteria, update] = mockRoutineFindOneAndUpdate.mock.calls[0];
    expect(criteria).toMatchObject({ date: '16-08-2026', email: EMAIL, 'tasklist._id': 'task-1' });
    const kStimulus = update.$set['tasklist.$.stimuli'].find((st) => st.name === 'K');
    expect(kStimulus.earned).toBe(0);
  });
});

describe('goalItemMilestones', () => {
  it('names every milestone the delete would take, across levels', async () => {
    const { query } = require('./goal');

    const milestones = await query.goalItemMilestones.resolve(null, { id: 'm1' }, CONTEXT);

    expect(milestones.map((milestone) => milestone.id)).toEqual([
      'w1', 'd16', 'd17', 'd18', 'd19', 'd20', 'd21', 'd22',
    ]);
    expect(milestones[0].body).toBe('Run every day');
  });

  it('returns nothing for a goal item with no milestones', async () => {
    const { query } = require('./goal');

    const milestones = await query.goalItemMilestones.resolve(null, { id: 'd22' }, CONTEXT);

    expect(milestones).toEqual([]);
  });
});
