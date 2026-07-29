import {
  sanitizeStore, sanitizePersistedCache, KNOWN_TYPES,
  CACHE_SCHEMA_VERSION, CACHE_VERSION_KEY, PERSIST_KEY,
} from '../cacheHygiene';

describe('sanitizeStore', () => {
  it('leaves a healthy store untouched (same reference)', () => {
    const store = {
      ROOT_QUERY: { 'optimizedDailyGoals({"date":"28-07-2026"})': [{ id: 'Goal:a' }] },
      'Goal:a': { __typename: 'Goal', period: 'day', goalItems: [{ id: 'GoalItem:x' }] },
      'GoalItem:x': { __typename: 'GoalItem', isComplete: true },
    };
    const { store: out, removed } = sanitizeStore(store);
    expect(removed).toEqual([]);
    expect(out).toBe(store);
  });

  // addGoalItemToCache mints `Goal:temp-<ts>-<period>` and nothing ever evicts
  // it; cache-persist then writes it to disk, where it shadows the real goal
  // for that date indefinitely.
  it('drops leaked optimistic placeholder entities', () => {
    const store = {
      ROOT_QUERY: {},
      'Goal:temp-1784926878068-day': { __typename: 'Goal', period: 'day' },
      'Goal:real': { __typename: 'Goal', period: 'day' },
    };
    const { store: out, removed } = sanitizeStore(store);
    expect(removed).toContain('Goal:temp-1784926878068-day');
    expect(out['Goal:temp-1784926878068-day']).toBeUndefined();
    expect(out['Goal:real']).toBeDefined();
  });

  // A wrong __typename mints a phantom the real query then references; when
  // Apollo GCs it the parent reverts to its base state.
  it('drops entities whose __typename is not one this app declares', () => {
    const store = {
      ROOT_QUERY: {},
      'RoutineItemRef:69786b1f2194f43110ac1529': { __typename: 'RoutineItemRef' },
      'RoutineItem:69786b1f2194f43110ac1529': { __typename: 'RoutineItem', ticked: true },
    };
    const { store: out, removed } = sanitizeStore(store);
    expect(removed).toEqual(['RoutineItemRef:69786b1f2194f43110ac1529']);
    expect(out['RoutineItem:69786b1f2194f43110ac1529']).toBeDefined();
  });

  it('keeps Apollo generated ids for known types', () => {
    const store = {
      ROOT_QUERY: {},
      'ProgressItem:radar-chart': { __typename: 'ProgressItem' },
      'ProgressItem:radar-chart.values.0': { __typename: 'ProgressItem' },
    };
    const { removed } = sanitizeStore(store);
    expect(removed).toEqual([]);
  });

  it('drops ROOT_QUERY fields left pointing at a removed entity', () => {
    const store = {
      ROOT_QUERY: {
        good: [{ id: 'Goal:real' }],
        dangling: [{ id: 'Goal:temp-123-day' }],
        mixed: [{ id: 'Goal:real' }, { id: 'Goal:temp-123-day' }],
      },
      'Goal:real': { __typename: 'Goal' },
      'Goal:temp-123-day': { __typename: 'Goal' },
    };
    const { store: out, removed } = sanitizeStore(store);
    expect(removed).toContain('Goal:temp-123-day');
    expect(removed).toContain('ROOT_QUERY.dangling');
    expect(removed).toContain('ROOT_QUERY.mixed');
    expect(out.ROOT_QUERY.good).toBeDefined();
    expect(out.ROOT_QUERY.dangling).toBeUndefined();
  });

  it('is safe on empty or malformed input', () => {
    expect(sanitizeStore(null).removed).toEqual([]);
    expect(sanitizeStore(undefined).removed).toEqual([]);
    expect(sanitizeStore({}).removed).toEqual([]);
  });

  it('lists every type the dashboard queries actually return', () => {
    ['Goal', 'GoalItem', 'SubTaskItem', 'Routine', 'RoutineItem', 'StimuliItem', 'StepItem']
      .forEach((t) => expect(KNOWN_TYPES).toContain(t));
  });
});

describe('sanitizePersistedCache', () => {
  const makeStorage = (initial) => {
    const mem = { ...initial };
    return {
      mem,
      getItem: jest.fn(async (k) => (k in mem ? mem[k] : null)),
      setItem: jest.fn(async (k, v) => { mem[k] = v; }),
      removeItem: jest.fn(async (k) => { delete mem[k]; }),
    };
  };

  const withLocalStorage = (impl) => {
    Object.defineProperty(window, 'localStorage', { value: impl, configurable: true });
  };

  const realLocalStorage = {
    store: {},
    getItem(k) { return k in this.store ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
  };

  beforeEach(() => {
    realLocalStorage.store = {};
    withLocalStorage(realLocalStorage);
  });

  it('purges the whole blob on a schema version bump, once', async () => {
    const storage = makeStorage({ [PERSIST_KEY]: '{"ROOT_QUERY":{}}' });
    const first = await sanitizePersistedCache(storage);
    expect(first.purged).toBe(true);
    expect(storage.mem[PERSIST_KEY]).toBeUndefined();
    expect(realLocalStorage.store[CACHE_VERSION_KEY]).toBe(String(CACHE_SCHEMA_VERSION));

    // Second boot at the same version must NOT purge again.
    const storage2 = makeStorage({ [PERSIST_KEY]: '{"ROOT_QUERY":{}}' });
    const second = await sanitizePersistedCache(storage2);
    expect(second.purged).toBe(false);
    expect(storage2.mem[PERSIST_KEY]).toBeDefined();
  });

  it('strips leaked entities without wiping the rest', async () => {
    realLocalStorage.store[CACHE_VERSION_KEY] = String(CACHE_SCHEMA_VERSION);
    const blob = JSON.stringify({
      ROOT_QUERY: {},
      'Goal:temp-1-day': { __typename: 'Goal' },
      'Goal:real': { __typename: 'Goal' },
    });
    const storage = makeStorage({ [PERSIST_KEY]: blob });
    const res = await sanitizePersistedCache(storage);
    expect(res.purged).toBe(false);
    expect(res.removed).toContain('Goal:temp-1-day');
    expect(JSON.parse(storage.mem[PERSIST_KEY])['Goal:real']).toBeDefined();
  });

  // Safari private mode / locked-down WebViews throw on localStorage access.
  // That must not be read as "cache is corrupt" — purging every boot there
  // would permanently disable offline support.
  it('does not purge when localStorage is unavailable', async () => {
    withLocalStorage({
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); },
    });
    const blob = JSON.stringify({ ROOT_QUERY: {}, 'Goal:real': { __typename: 'Goal' } });
    const storage = makeStorage({ [PERSIST_KEY]: blob });
    const res = await sanitizePersistedCache(storage);
    expect(res.purged).toBe(false);
    expect(storage.mem[PERSIST_KEY]).toBeDefined();
  });

  it('drops an unparseable blob rather than restoring garbage', async () => {
    realLocalStorage.store[CACHE_VERSION_KEY] = String(CACHE_SCHEMA_VERSION);
    const storage = makeStorage({ [PERSIST_KEY]: '{not json' });
    const res = await sanitizePersistedCache(storage);
    expect(res.purged).toBe(true);
    expect(storage.mem[PERSIST_KEY]).toBeUndefined();
  });

  it('is a no-op when there is nothing persisted yet', async () => {
    realLocalStorage.store[CACHE_VERSION_KEY] = String(CACHE_SCHEMA_VERSION);
    const storage = makeStorage({});
    const res = await sanitizePersistedCache(storage);
    expect(res).toEqual({ purged: false, removed: [] });
  });

  it('never throws on a missing/!invalid storage object', async () => {
    await expect(sanitizePersistedCache(null)).resolves.toEqual({ purged: false, removed: [] });
    await expect(sanitizePersistedCache({})).resolves.toEqual({ purged: false, removed: [] });
  });
});
