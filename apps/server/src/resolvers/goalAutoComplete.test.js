/* eslint-disable global-require */

// D-03: a week goal used to close itself on the five-day streak threshold alone,
// so a seven-milestone week goal reported COMPLETE with a mid-week milestone
// still open. These drive autoCheckTaskPeriod directly with a mocked GoalModel.

process.env.ENCRYPTION_KEY = 'goal-autocomplete-test-key';

const mockGoalFind = jest.fn();
const mockGoalFindOneAndUpdate = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      find: mockGoalFind,
      findOneAndUpdate: mockGoalFindOneAndUpdate,
    },
  };
});

const EMAIL = 'me@example.com';
const WEEK_DATE = '10-09-2026'; // Thursday of the 06-09..12-09 week
const WEEK_FRIDAY = '11-09-2026';
const WEEK_DAYS = ['06-09-2026', '07-09-2026', '08-09-2026', '09-09-2026', '10-09-2026', '11-09-2026', '12-09-2026'];

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** One day doc per date, each hanging a single milestone off the week goal. */
function dayDocs(completeDates, milestoneDates = WEEK_DAYS) {
  return milestoneDates.map((date, i) => ({
    id: `D${i}`,
    date,
    period: 'day',
    goalItems: [{
      id: `d${i}`, goalRef: 'W1', taskRef: `t${i}`, isComplete: completeDates.includes(date),
    }],
  }));
}

function weekDoc() {
  return {
    id: 'GW',
    date: WEEK_FRIDAY,
    period: 'week',
    goalItems: [{ id: 'W1', body: 'Ship the beta', isComplete: false }],
  };
}

/** Routes the two find() calls autoCheckTaskPeriod makes. */
function primeFind(weekGoals, dayGoals) {
  mockGoalFind.mockImplementation((criteria) => (
    criteria.period === 'week' ? exec(weekGoals) : exec(dayGoals)
  ));
}

const runWeek = () => {
  const { autoCheckTaskPeriod } = require('./goal');
  return autoCheckTaskPeriod({
    currentPeriod: 'week',
    stepDownPeriod: 'day',
    cleanGoals: [],
    completionThreshold: 5,
    date: WEEK_DATE,
    email: EMAIL,
  });
};

beforeEach(() => {
  mockGoalFind.mockReset();
  mockGoalFindOneAndUpdate.mockReset();
  mockGoalFindOneAndUpdate.mockReturnValue(exec(null));
});

describe('autoCheckTaskPeriod week auto-complete', () => {
  it('leaves the goal open while one of its seven milestones is unfinished', async () => {
    const complete = WEEK_DAYS.filter((d) => d !== '09-09-2026'); // six of seven
    primeFind([weekDoc()], dayDocs(complete));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].isComplete).toBe(false);
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('still counts the streak while the goal stays open', async () => {
    const complete = WEEK_DAYS.filter((d) => d !== '09-09-2026');
    primeFind([weekDoc()], dayDocs(complete));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].progress).toBe(6);
  });

  it('completes once every declared milestone is met and says which', async () => {
    primeFind([weekDoc()], dayDocs(WEEK_DAYS));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].isComplete).toBe(true);
    expect(mockGoalFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(update.$set['goalItems.$.isComplete']).toBe(true);
    expect(update.$set['goalItems.$.completionNote']).toContain('7 of 7');
    expect(update.$set['goalItems.$.completionNote']).toContain('09-09-2026');
  });

  it('keeps the threshold as a floor when fewer milestones were declared', async () => {
    // Three milestones, all met: below the five-day streak threshold, so the
    // goal stays open exactly as it did before.
    const declared = ['06-09-2026', '07-09-2026', '08-09-2026'];
    primeFind([weekDoc()], dayDocs(declared, declared));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].isComplete).toBe(false);
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('completes on the threshold when the declared milestones match it', async () => {
    const declared = WEEK_DAYS.slice(0, 5);
    primeFind([weekDoc()], dayDocs(declared, declared));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].isComplete).toBe(true);
    expect(mockGoalFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});
