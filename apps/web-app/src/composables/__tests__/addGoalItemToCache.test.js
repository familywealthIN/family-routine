/* eslint-env jest */
/**
 * addGoalItemToCache writes a new day item into DAILY_GOALS_QUERY, which
 * selects `milestonesTotal` / `milestonesComplete`. An item written without
 * them made Apollo warn "Missing field" on every add.
 */
const { InMemoryCache } = require('apollo-cache-inmemory');
const { addGoalItemToCache } = require('../useApolloCacheUpdates');
const { DAILY_GOALS_QUERY } = require('../graphql/queries');

const DATE = '03-10-2026';

const seed = () => {
  const cache = new InMemoryCache({ addTypename: true });
  cache.writeQuery({
    query: DAILY_GOALS_QUERY,
    variables: { date: DATE },
    data: {
      optimizedDailyGoals: [{
        __typename: 'Goal', id: 'day1', date: DATE, period: 'day', goalItems: [],
      }],
    },
  });
  return cache;
};

describe('addGoalItemToCache — day item', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('writes the milestone tally (null when unknown) so no field is missing', () => {
    const cache = seed();
    const ok = addGoalItemToCache(cache, {
      goalItem: {
        id: 'g-new', body: 'E2E-add item', taskRef: 'rp', tags: [],
      },
      date: DATE,
      period: 'day',
    });

    expect(ok).toBe(true);
    const missing = warn.mock.calls.filter((args) => String(args[0]).includes('Missing field'));
    expect(missing).toEqual([]);

    const { optimizedDailyGoals } = cache.readQuery({ query: DAILY_GOALS_QUERY, variables: { date: DATE } });
    const item = optimizedDailyGoals[0].goalItems[0];
    expect(item.body).toBe('E2E-add item');
    expect(item.milestonesTotal).toBeNull();
    expect(item.milestonesComplete).toBeNull();
  });

  it('keeps a tally the server did send', () => {
    const cache = seed();
    addGoalItemToCache(cache, {
      goalItem: {
        id: 'g-new', body: 'x', milestonesTotal: 3, milestonesComplete: 1,
      },
      date: DATE,
      period: 'day',
    });
    const { optimizedDailyGoals } = cache.readQuery({ query: DAILY_GOALS_QUERY, variables: { date: DATE } });
    expect(optimizedDailyGoals[0].goalItems[0]).toMatchObject({ milestonesTotal: 3, milestonesComplete: 1 });
  });
});
