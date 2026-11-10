/* eslint-disable global-require */

// searchGoals behind the Search page (packages/design/Search.dc.html).
//
// The page narrows by period, and the limit used to cut the list BEFORE that
// filter could run: a user with 600 day items matching "plan" got the first 200
// of them and "No goals match" on Week, though week goals matched. The period is
// now a filter on the find, and the find runs newest first, so a cut keeps the
// goals written lately instead of the oldest ones.

process.env.ENCRYPTION_KEY = 'search-goals-test-key';

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
const CONTEXT = { decodedToken: { email: EMAIL } };

const sortSpy = jest.fn();
const found = (docs) => ({
  sort: (order) => {
    sortSpy(order);
    return { exec: () => Promise.resolve(docs) };
  },
});

const goal = (period, date, bodies) => new GoalModel({
  email: EMAIL,
  date,
  period,
  goalItems: bodies.map((body) => ({ body })),
});

const search = (args) => query.searchGoals.resolve({}, { query: 'plan', ...args }, CONTEXT);
const items = (goals) => goals.flatMap((g) => g.goalItems);

describe('searchGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks only for the period it is given', async () => {
    mockGoalFind.mockReturnValue(found([goal('week', '11-09-2026', ['Plan the meals'])]));
    await search({ period: 'week' });
    expect(mockGoalFind).toHaveBeenCalledWith({ email: EMAIL, period: 'week' });
  });

  it('ignores a period it does not know, and searches them all', async () => {
    mockGoalFind.mockReturnValue(found([]));
    await search({ period: 'decade' });
    await search({});
    expect(mockGoalFind.mock.calls).toEqual([[{ email: EMAIL }], [{ email: EMAIL }]]);
  });

  it('reads newest first, so the limit keeps the latest matches', async () => {
    mockGoalFind.mockReturnValue(found([
      goal('day', '12-09-2026', ['Plan today']),
      goal('day', '01-01-2026', ['Plan new year']),
    ]));
    const result = await search({ limit: '1' });
    expect(sortSpy).toHaveBeenCalledWith({ _id: -1 });
    expect(items(result).map((i) => i.body)).toEqual(['Plan today']);
  });

  it('caps the limit, and falls back to 50 for a limit it cannot read', async () => {
    const many = goal('day', '12-09-2026', Array.from({ length: 600 }, (_, i) => `plan ${i}`));
    mockGoalFind.mockReturnValue(found([many]));
    expect(items(await search({ limit: '100000' }))).toHaveLength(500);
    expect(items(await search({ limit: 'lots' }))).toHaveLength(50);
    expect(items(await search({ limit: '-3' }))).toHaveLength(50);
  });

  it('still needs two letters', async () => {
    expect(await search({ query: 'p' })).toEqual([]);
    expect(mockGoalFind).not.toHaveBeenCalled();
  });
});
