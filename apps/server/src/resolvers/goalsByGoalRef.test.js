/* eslint-disable global-require */

// "Related Goals (1)": a week of logged entries under one parent goal rendered
// as a single timeline row.
//
// `goalsByGoalRef` spreads `goal.toObject()`, and mongoose's toObject() drops
// the `id` virtual all the way down — the resolver mapped `_id` back onto the
// parent Goal but not onto the nested goalItems, so every related item arrived
// at the client with id:null. The timeline dedupes rows by id, so the first row
// poisoned the dedupe set and every later one was thrown away as its duplicate.
//
// These docs are REAL mongoose documents on the real schema: with plain-object
// fixtures the bug is unreproducible, because the whole defect is what
// toObject() does to a subdocument.

process.env.ENCRYPTION_KEY = 'goals-by-goal-ref-test-key';

const mockGoalFind = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: Object.assign(actual.GoalModel, { find: mockGoalFind }),
  };
});

const { GoalModel } = jest.requireActual('../schema/GoalSchema');
const { query } = require('./goal');

const EMAIL = 'me@example.com';
const WEEK_REF = '651111111111111111111111';
const CONTEXT = { decodedToken: { email: EMAIL } };

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** One day Goal carrying `bodies` items, all logged against the week goal. */
const dayGoal = (date, bodies) => new GoalModel({
  email: EMAIL,
  date,
  period: 'day',
  goalItems: bodies.map((body) => ({ body, goalRef: WEEK_REF, isComplete: true })),
});

const resolve = () => query.goalsByGoalRef.resolve({}, { goalRef: WEEK_REF }, CONTEXT);

const allItems = (goals) => goals.flatMap((goal) => goal.goalItems);

describe('goalsByGoalRef', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives every goal item its own id', async () => {
    const week = [
      dayGoal('28-09-2026', ['Plan for Citi payment']),
      dayGoal('30-09-2026', ['Trim a liability', 'Add a training sale']),
      dayGoal('02-10-2026', ['Move one number the right way']),
    ];
    mockGoalFind.mockReturnValue(exec(week));

    const items = allItems(await resolve());

    expect(items).toHaveLength(4);
    items.forEach((item) => expect(item.id).toBeTruthy());
  });

  // The symptom, stated as the consumer sees it: dedupe by id must not fold a
  // week of distinct entries onto one row.
  it('gives items distinct ids, so a dedupe by id keeps them all', async () => {
    mockGoalFind.mockReturnValue(exec([
      dayGoal('30-09-2026', ['Trim a liability', 'Add a training sale']),
      dayGoal('02-10-2026', ['Plan for Citi payment']),
    ]));

    const items = allItems(await resolve());
    const ids = new Set(items.map((item) => String(item.id)));

    expect(ids.size).toBe(items.length);
  });

  it('matches each item id to the document it came from', async () => {
    const goal = dayGoal('02-10-2026', ['Plan for Citi payment', 'Trim a liability']);
    mockGoalFind.mockReturnValue(exec([goal]));

    const [returned] = await resolve();

    expect(String(returned.id)).toBe(String(goal._id));
    expect(returned.goalItems.map((i) => String(i.id)))
      // eslint-disable-next-line no-underscore-dangle
      .toEqual(Array.from(goal.goalItems).map((i) => String(i._id)));
  });

  // The server must keep sending the COMPLETE list — these Goal ids are the
  // ids optimizedDailyGoals/agendaGoals return, so a filtered goalItems array
  // replaces the shared normalized entity and truncates the dashboard. The
  // consumers scope to the ref client-side instead.
  it('returns siblings that belong to other goal refs', async () => {
    const goal = dayGoal('02-10-2026', ['Plan for Citi payment']);
    goal.goalItems.push({ body: 'Unrelated errand', goalRef: 'other-ref' });
    mockGoalFind.mockReturnValue(exec([goal]));

    const [returned] = await resolve();

    expect(Array.from(returned.goalItems).map((i) => i.body))
      .toEqual(['Plan for Citi payment', 'Unrelated errand']);
    returned.goalItems.forEach((item) => expect(item.id).toBeTruthy());
  });

  it('carries the fields the timeline renders', async () => {
    const goal = dayGoal('02-10-2026', ['Plan for Citi payment']);
    goal.goalItems[0].taskRef = '652222222222222222222222';
    mockGoalFind.mockReturnValue(exec([goal]));

    const [item] = (await resolve())[0].goalItems;

    expect(item.body).toBe('Plan for Citi payment');
    expect(item.goalRef).toBe(WEEK_REF);
    expect(String(item.taskRef)).toBe('652222222222222222222222');
    expect(item.isComplete).toBe(true);
  });

  it('drops a Goal left with no items', async () => {
    const empty = new GoalModel({
      email: EMAIL, date: '29-09-2026', period: 'day', goalItems: [],
    });
    mockGoalFind.mockReturnValue(exec([empty, dayGoal('02-10-2026', ['Kept'])]));

    const goals = await resolve();

    expect(goals).toHaveLength(1);
    expect(goals[0].date).toBe('02-10-2026');
  });

  it('scopes the lookup to the signed-in user and the requested ref', async () => {
    mockGoalFind.mockReturnValue(exec([]));

    await resolve();

    expect(mockGoalFind).toHaveBeenCalledWith({
      email: EMAIL,
      'goalItems.goalRef': WEEK_REF,
    });
  });
});
