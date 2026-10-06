/* eslint-env jest */
/**
 * D-10 residual: with the network offline, a day the app had not already
 * fetched painted the confident empty state "No Day Tasks".
 *
 * fetchRoutine's instant-display step called `routineStore.loadFromIndexedDB`,
 * a method the store has never had. The TypeError was caught and warned, so an
 * offline day got no cached fallback AND no error anyone could render — only
 * the empty state was left. These tests pin the fallback to the cache that
 * actually exists (the persisted Apollo one) and pin the error/empty
 * distinction a page needs to tell the two apart.
 */
const Vue = require('vue');
const VueCompositionAPI = require('@vue/composition-api');

Vue.use(VueCompositionAPI.default || VueCompositionAPI);

const { useRoutineQueries } = require('../useRoutineQueries');
const routineStore = require('../../store/routineStore').default;

const DATE = '18-09-2026';

const cachedRoutine = () => ({
  id: 'routine-1',
  date: DATE,
  skip: false,
  tasklist: [{ id: 'task-1', name: 'Morning Routine' }],
});

// A stand-in for the Apollo client: `query` is the network read, `cache.diff`
// is the persisted (IndexedDB-backed) store the fallback reads.
const makeClient = ({ query, diff }) => ({
  query: query || jest.fn().mockResolvedValue({ data: { routineDate: cachedRoutine() } }),
  cache: { diff: diff || jest.fn().mockReturnValue({ result: {}, complete: false }) },
});

const miss = () => jest.fn().mockReturnValue({ result: {}, complete: false });
const hit = () => jest.fn().mockReturnValue({ result: { routineDate: cachedRoutine() }, complete: true });
const offline = () => jest.fn().mockRejectedValue(new Error('Network error: Failed to fetch'));

beforeEach(() => {
  routineStore.reset();
  routineStore.clearCache();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchRoutine offline fallback', () => {
  it('reads the persisted Apollo cache instead of a store method that does not exist', async () => {
    const diff = hit();
    const client = makeClient({ diff });
    await useRoutineQueries(client).fetchRoutine(DATE);

    expect(diff).toHaveBeenCalledTimes(1);
    expect(diff.mock.calls[0][0]).toMatchObject({ variables: { date: DATE }, optimistic: true });
    expect(console.warn).not.toHaveBeenCalled();
    expect(routineStore.loadFromIndexedDB).toBeUndefined();
  });

  it('paints the cached routine for instant display before the network answers', async () => {
    let painted = null;
    const query = jest.fn().mockImplementation(() => {
      painted = routineStore.tasklist;
      return Promise.resolve({ data: { routineDate: cachedRoutine() } });
    });
    await useRoutineQueries(makeClient({ query, diff: hit() })).fetchRoutine(DATE);

    expect(painted).toHaveLength(1);
    expect(painted[0].id).toBe('task-1');
  });

  it('keeps showing the cached day when the network read fails', async () => {
    const result = await useRoutineQueries(makeClient({ query: offline(), diff: hit() }))
      .fetchRoutine(DATE);

    expect(result.tasklist).toHaveLength(1);
    expect(routineStore.tasklist).toHaveLength(1);
    // The failure is still recorded, so a page can say the day is stale.
    expect(routineStore.error).toBeInstanceOf(Error);
  });

  it('reports a network failure as an error when nothing is cached for that day', async () => {
    const fetch = useRoutineQueries(makeClient({ query: offline(), diff: miss() }))
      .fetchRoutine(DATE);

    await expect(fetch).rejects.toThrow('Network error: Failed to fetch');
    expect(routineStore.error).toBeInstanceOf(Error);
    // Nothing was invented for the day - the page must not read this as empty.
    expect(routineStore.tasklist).toEqual([]);
  });

  it('records no error for a day that genuinely has no tasks', async () => {
    const query = jest.fn().mockResolvedValue({
      data: { routineDate: { id: 'routine-1', date: DATE, tasklist: [] } },
    });
    await useRoutineQueries(makeClient({ query, diff: miss() })).fetchRoutine(DATE);

    expect(routineStore.error).toBeNull();
    expect(routineStore.tasklist).toEqual([]);
  });

  it('clears a previous day\'s failure when a date resolves from the in-memory cache', async () => {
    const client = makeClient({ diff: miss() });
    const { fetchRoutine } = useRoutineQueries(client);

    await fetchRoutine(DATE);
    routineStore.setError(new Error('Network error: Failed to fetch'));
    await fetchRoutine(DATE);

    expect(routineStore.error).toBeNull();
  });

  it('does not swallow a fault in the cache read', async () => {
    const diff = jest.fn(() => { throw new TypeError('cache.diff is not a function'); });
    const fetch = useRoutineQueries(makeClient({ diff })).fetchRoutine(DATE);

    await expect(fetch).rejects.toThrow('cache.diff is not a function');
  });

  it('reaches the cache through $apollo.getClient(), the way the plugin wires it', async () => {
    const diff = hit();
    const inner = makeClient({ diff });
    const dollarApollo = { query: inner.query, getClient: () => inner };

    await useRoutineQueries(dollarApollo).fetchRoutine(DATE);

    expect(diff).toHaveBeenCalledTimes(1);
  });

  it('skips the cache read when the caller opted out', async () => {
    const diff = hit();
    await useRoutineQueries(makeClient({ diff })).fetchRoutine(DATE, { useIndexedDB: false });

    expect(diff).not.toHaveBeenCalled();
  });
});
