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

  // D-11: the dashboard streak needs the week laid out against the calendar,
  // not just a win count, or a missed day cannot be drawn.
  it('publishes one milestone day per calendar date, breaking on the miss', async () => {
    // Sun-Tue won, Wednesday missed, today (Thursday) won, Fri/Sat still to come.
    primeFind([weekDoc()], dayDocs(['06-09-2026', '07-09-2026', '08-09-2026', '10-09-2026']));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].milestoneDays.map((day) => day.date)).toEqual(WEEK_DAYS);
    expect(weekGoal.goalItems[0].milestoneDays.map((day) => day.status)).toEqual([
      'complete', 'complete', 'complete', 'missed', 'complete', 'upcoming', 'upcoming',
    ]);
  });

  it('completes on the threshold when the declared milestones match it', async () => {
    const declared = WEEK_DAYS.slice(0, 5);
    primeFind([weekDoc()], dayDocs(declared, declared));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].isComplete).toBe(true);
    expect(mockGoalFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});

// D-12: the week goal showed as a bare checkbox because the payload carried no
// denominator — `progress` alone cannot say how close the goal is.
describe('autoCheckTaskPeriod milestone tally', () => {
  it('reports met and declared milestones on the period goal item', async () => {
    const complete = ['06-09-2026', '07-09-2026', '08-09-2026'];
    primeFind([weekDoc()], dayDocs(complete));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].milestonesComplete).toBe(3);
    expect(weekGoal.goalItems[0].milestonesTotal).toBe(7);
  });

  it('counts only the milestones declared for the period', async () => {
    const declared = WEEK_DAYS.slice(0, 3);
    primeFind([weekDoc()], dayDocs(declared, declared));

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].milestonesComplete).toBe(3);
    expect(weekGoal.goalItems[0].milestonesTotal).toBe(3);
  });

  it('reports a zero tally when nothing was hung off the goal', async () => {
    primeFind([weekDoc()], []);

    const [weekGoal] = await runWeek();

    expect(weekGoal.goalItems[0].milestonesComplete).toBe(0);
    expect(weekGoal.goalItems[0].milestonesTotal).toBe(0);
  });
});

// D-25: the month goal "Routine Notes 1.0 live in both stores" read
// [5/5 milestones] beside an unchecked box through every reload. All five of its
// week milestones live in ONE week document, and `progress` scores one win per
// child DOCUMENT, so it stuck at 1 against a floor of three — the parent could
// never close while the tally truthfully said 5 of 5.
const MONTH_DATE = '10-09-2026';
const MONTH_END = '30-09-2026';
const SHARED_WEEK = '11-09-2026'; // the Friday the week doc is keyed by

function monthDoc() {
  return {
    id: 'GM',
    date: MONTH_END,
    period: 'month',
    goalItems: [{ id: 'M1', body: 'Routine Notes 1.0 live in both stores', isComplete: false }],
  };
}

/** A single week doc carrying every milestone the month goal declared. */
function sharedWeekDocs(completeCount, declared = 5) {
  return [{
    id: 'GWS',
    date: SHARED_WEEK,
    period: 'week',
    goalItems: Array.from({ length: declared }, (unused, i) => ({
      id: `s${i}`, goalRef: 'M1', taskRef: `t${i}`, isComplete: i < completeCount,
    })),
  }];
}

function primeMonthFind(monthGoals, weekGoals) {
  mockGoalFind.mockImplementation((criteria) => (
    criteria.period === 'month' ? exec(monthGoals) : exec(weekGoals)
  ));
}

const runMonth = () => {
  const { autoCheckTaskPeriod } = require('./goal');
  return autoCheckTaskPeriod({
    currentPeriod: 'month',
    stepDownPeriod: 'week',
    cleanGoals: [],
    completionThreshold: 3,
    date: MONTH_DATE,
    email: EMAIL,
  });
};

describe('autoCheckTaskPeriod milestones sharing one child document', () => {
  it('completes the month goal once all five shared milestones are met', async () => {
    primeMonthFind([monthDoc()], sharedWeekDocs(5));

    const [monthGoal] = await runMonth();

    expect(monthGoal.goalItems[0].isComplete).toBe(true);
    expect(mockGoalFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(update.$set['goalItems.$.completionNote']).toContain('5 of 5 week milestones met');
  });

  it('uses the same count the dashboard chip renders', async () => {
    primeMonthFind([monthDoc()], sharedWeekDocs(5));

    const [monthGoal] = await runMonth();

    expect(monthGoal.goalItems[0].milestonesComplete).toBe(5);
    expect(monthGoal.goalItems[0].milestonesTotal).toBe(5);
    // The streak itself still counts week wins, not milestones: one week doc.
    expect(monthGoal.goalItems[0].progress).toBe(1);
  });

  it('leaves the month goal open while one shared milestone is outstanding', async () => {
    primeMonthFind([monthDoc()], sharedWeekDocs(4));

    const [monthGoal] = await runMonth();

    expect(monthGoal.goalItems[0].isComplete).toBe(false);
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keeps the threshold as a floor when fewer milestones were declared', async () => {
    // Two milestones, both met, sharing the one week doc: still not a month.
    primeMonthFind([monthDoc()], sharedWeekDocs(2, 2));

    const [monthGoal] = await runMonth();

    expect(monthGoal.goalItems[0].isComplete).toBe(false);
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
