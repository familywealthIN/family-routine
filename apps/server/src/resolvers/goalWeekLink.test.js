/* eslint-disable global-require */

// OWNER RULE: day goals are ALWAYS linked to the week goal of their routine.
// autoCheckTaskPeriod only counts a day goal whose goalRef is the week goal's
// id, and most creation paths (quick-add, Home add-task, Priority, AI, MCP)
// never sent one — so the server links on create, in both directions.

process.env.ENCRYPTION_KEY = 'goal-week-link-test-key';

const mockGoalFind = jest.fn();
const mockGoalFindOne = jest.fn();
const mockGoalFindOneAndUpdate = jest.fn();
const mockGoalUpdateMany = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      find: mockGoalFind,
      findOne: mockGoalFindOne,
      findOneAndUpdate: mockGoalFindOneAndUpdate,
      updateMany: mockGoalUpdateMany,
    },
  };
});

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };
// Week of Sun 04-10-2026 … Sat 10-10-2026; its week Goal doc is Friday 09-10-2026.
const WEEK_DATE = '09-10-2026';
const WEEK_DAYS = ['04-10-2026', '05-10-2026', '06-10-2026', '07-10-2026', '08-10-2026', '09-10-2026', '10-10-2026'];

const exec = (value) => ({ exec: () => Promise.resolve(value) });

const item = (overrides = {}) => ({
  _id: 'x', id: 'x', body: 'b', taskRef: '', goalRef: '', isMilestone: false, tags: [], ...overrides,
});
const doc = (date, period, goalItems) => ({ date, period, goalItems });

/** addGoalItem against an existing goal doc, so the append path is taken. */
async function addGoalItem(args, { existing, readBack }) {
  mockGoalFindOne
    .mockReturnValueOnce(exec(existing))
    .mockReturnValueOnce(exec(readBack));
  const { mutation } = require('./goal');
  return mutation.addGoalItem.resolve(null, { body: 'E2E-x', tags: [], ...args }, CONTEXT);
}

/** The goal item addGoalItem appended (the $set's last array entry). */
const appended = () => {
  const { $set } = mockGoalFindOneAndUpdate.mock.calls[0][1];
  return $set.goalItems[$set.goalItems.length - 1];
};

beforeEach(() => {
  mockGoalFind.mockReset();
  mockGoalFindOne.mockReset();
  mockGoalFindOneAndUpdate.mockReset();
  mockGoalUpdateMany.mockReset();
  mockGoalFindOneAndUpdate.mockReturnValue(exec(null));
  mockGoalUpdateMany.mockReturnValue(exec({ modifiedCount: 0 }));
});

describe('day goal → week goal of its routine (direction 1)', () => {
  it.each(['07-10-2026', '04-10-2026', '10-10-2026'])(
    'links a day goal on %s to the routine week goal in that week\'s Friday doc',
    async (dayDate) => {
      mockGoalFind.mockReturnValue(exec([doc(WEEK_DATE, 'week', [
        item({ _id: 'w-other', taskRef: 'task-2' }),
        item({ _id: 'w-1', taskRef: 'task-1' }),
        item({ _id: 'w-1b', taskRef: 'task-1' }),
      ])]));
      const day = doc(dayDate, 'day', []);

      await addGoalItem(
        { date: dayDate, period: 'day', taskRef: 'task-1' },
        { existing: day, readBack: doc(dayDate, 'day', [item()]) },
      );

      expect(mockGoalFind).toHaveBeenCalledWith({ email: EMAIL, period: 'week', date: WEEK_DATE });
      // First same-routine week item wins — the same pick as the client's itemForRoutine.
      expect(appended().goalRef).toBe('w-1');
      expect(appended().isMilestone).toBe(true);
    },
  );

  it('never overwrites an explicit goalRef', async () => {
    mockGoalFind.mockReturnValue(exec([doc(WEEK_DATE, 'week', [item({ _id: 'w-1', taskRef: 'task-1' })])]));

    await addGoalItem(
      {
        date: '07-10-2026', period: 'day', taskRef: 'task-1', goalRef: 'chosen', isMilestone: true,
      },
      { existing: doc('07-10-2026', 'day', []), readBack: doc('07-10-2026', 'day', [item()]) },
    );

    expect(mockGoalFind).not.toHaveBeenCalled();
    expect(appended().goalRef).toBe('chosen');
  });

  it('leaves the day goal unlinked when the routine has no week goal that week', async () => {
    mockGoalFind.mockReturnValue(exec([doc(WEEK_DATE, 'week', [item({ _id: 'w-other', taskRef: 'task-2' })])]));

    await addGoalItem(
      { date: '07-10-2026', period: 'day', taskRef: 'task-1' },
      { existing: doc('07-10-2026', 'day', []), readBack: doc('07-10-2026', 'day', [item()]) },
    );

    expect(appended().goalRef).toBeUndefined();
    expect(appended().isMilestone).toBeUndefined();
  });

  it('does not look anything up for a day goal with no routine', async () => {
    await addGoalItem(
      { date: '07-10-2026', period: 'day' },
      { existing: doc('07-10-2026', 'day', []), readBack: doc('07-10-2026', 'day', [item()]) },
    );

    expect(mockGoalFind).not.toHaveBeenCalled();
  });

  it('still saves the day goal when the link lookup fails', async () => {
    mockGoalFind.mockReturnValue({ exec: () => Promise.reject(new Error('boom')) });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await addGoalItem(
      { date: '07-10-2026', period: 'day', taskRef: 'task-1' },
      { existing: doc('07-10-2026', 'day', []), readBack: doc('07-10-2026', 'day', [item()]) },
    );

    expect(appended().goalRef).toBeUndefined();
    console.error.mockRestore();
  });

  it('links through bulkAddGoalItems too (AI / MCP plans)', async () => {
    mockGoalFind.mockReturnValue(exec([doc(WEEK_DATE, 'week', [item({ _id: 'w-1', taskRef: 'task-1' })])]));
    mockGoalFindOne
      .mockReturnValueOnce(exec(doc('07-10-2026', 'day', [])))
      .mockReturnValueOnce(exec(doc('07-10-2026', 'day', [item()])));
    const { mutation } = require('./goal');

    await mutation.bulkAddGoalItems.resolve(null, {
      goalItems: [{
        date: '07-10-2026', period: 'day', body: 'E2E-ai', taskRef: 'task-1', tags: [],
      }],
    }, CONTEXT);

    expect(appended().goalRef).toBe('w-1');
    expect(appended().isMilestone).toBe(true);
  });
});

describe('week goal → that week\'s unlinked day goals (direction 2)', () => {
  it('links the week\'s unlinked same-routine day goals, bounded to user/week/taskRef', async () => {
    const created = item({ _id: 'w-new', taskRef: 'task-1' });

    await addGoalItem(
      { date: WEEK_DATE, period: 'week', taskRef: 'task-1' },
      {
        existing: doc(WEEK_DATE, 'week', [item({ _id: 'w-other', taskRef: 'task-2' })]),
        readBack: doc(WEEK_DATE, 'week', [item({ _id: 'w-other', taskRef: 'task-2' }), created]),
      },
    );

    expect(mockGoalUpdateMany).toHaveBeenCalledTimes(1);
    const [filter, update, options] = mockGoalUpdateMany.mock.calls[0];
    expect(filter).toEqual({
      email: EMAIL,
      period: 'day',
      date: { $in: WEEK_DAYS },
      goalItems: { $elemMatch: { taskRef: 'task-1', goalRef: { $in: [null, ''] } } },
    });
    expect(update).toEqual({
      $set: { 'goalItems.$[dayItem].goalRef': 'w-new', 'goalItems.$[dayItem].isMilestone': true },
    });
    // The array filter is what keeps an explicit goalRef untouched.
    expect(options.arrayFilters).toEqual([{ 'dayItem.taskRef': 'task-1', 'dayItem.goalRef': { $in: [null, ''] } }]);
  });

  it('does not re-home day goals when the routine already has an earlier week goal', async () => {
    const created = item({ _id: 'w-new', taskRef: 'task-1' });

    await addGoalItem(
      { date: WEEK_DATE, period: 'week', taskRef: 'task-1' },
      {
        existing: doc(WEEK_DATE, 'week', [item({ _id: 'w-1', taskRef: 'task-1' })]),
        readBack: doc(WEEK_DATE, 'week', [item({ _id: 'w-1', taskRef: 'task-1' }), created]),
      },
    );

    expect(mockGoalUpdateMany).not.toHaveBeenCalled();
  });

  it('does nothing for a week goal with no routine', async () => {
    await addGoalItem(
      { date: WEEK_DATE, period: 'week' },
      { existing: doc(WEEK_DATE, 'week', []), readBack: doc(WEEK_DATE, 'week', [item({ _id: 'w-new' })]) },
    );

    expect(mockGoalUpdateMany).not.toHaveBeenCalled();
  });

  it('bulkAddGoalItems writes week goals before day goals so the days can link', async () => {
    const order = [];
    mockGoalFind.mockImplementation(() => {
      order.push('day-lookup');
      return exec([doc(WEEK_DATE, 'week', [item({ _id: 'w-1', taskRef: 'task-1' })])]);
    });
    mockGoalFindOne.mockImplementation(({ period }) => {
      order.push(`findOne-${period}`);
      return exec(doc(period === 'week' ? WEEK_DATE : '07-10-2026', period, [item({ _id: `${period}-1`, taskRef: 'task-1' })]));
    });
    const { mutation } = require('./goal');

    await mutation.bulkAddGoalItems.resolve(null, {
      goalItems: [
        {
          date: '07-10-2026', period: 'day', body: 'E2E-d', taskRef: 'task-1', tags: [],
        },
        {
          date: WEEK_DATE, period: 'week', body: 'E2E-w', taskRef: 'task-1', tags: [],
        },
      ],
    }, CONTEXT);

    expect(order.indexOf('day-lookup')).toBeGreaterThan(order.lastIndexOf('findOne-week'));
  });
});
