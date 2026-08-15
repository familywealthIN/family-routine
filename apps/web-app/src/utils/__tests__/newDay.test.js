import {
  prepareNewDay,
  clearDayScopedLocalStorage,
  clearCookies,
  lastPreparedDay,
  LAST_PREPARED_DAY_KEY,
  PRESERVED_LOCAL_STORAGE_KEYS,
} from '../newDay';
import { PERSIST_KEY, CACHE_VERSION_KEY } from '../cacheHygiene';

describe('newDay', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('clearDayScopedLocalStorage', () => {
    // The whole point of the preserved list: a midnight cache purge must not
    // read as "the app signed me out overnight".
    it('keeps the session keys so the user stays logged in', () => {
      localStorage.setItem('token', 'jwt-abc');
      localStorage.setItem('email', 'a@b.com');
      localStorage.setItem('name', 'Someone');
      localStorage.setItem('picture', 'http://x/y.png');
      localStorage.setItem('notification-token', 'fcm-1');

      clearDayScopedLocalStorage();

      expect(localStorage.getItem('token')).toBe('jwt-abc');
      expect(localStorage.getItem('email')).toBe('a@b.com');
      expect(localStorage.getItem('name')).toBe('Someone');
      expect(localStorage.getItem('picture')).toBe('http://x/y.png');
      expect(localStorage.getItem('notification-token')).toBe('fcm-1');
    });

    it('keeps user preferences', () => {
      localStorage.setItem('USER_TAGS', '["work"]');
      localStorage.setItem('ONBOARDING_COMPLETE', 'true');
      localStorage.setItem('AI_SEARCH_SETTINGS', '{}');
      localStorage.setItem('PROFILE_SETTINGS', '{}');

      clearDayScopedLocalStorage();

      expect(localStorage.getItem('USER_TAGS')).toBe('["work"]');
      expect(localStorage.getItem('ONBOARDING_COMPLETE')).toBe('true');
      expect(localStorage.getItem('AI_SEARCH_SETTINGS')).toBe('{}');
      expect(localStorage.getItem('PROFILE_SETTINGS')).toBe('{}');
    });

    // Guards the list itself: every declared key must actually survive, so
    // adding one to PRESERVED_LOCAL_STORAGE_KEYS without honouring it fails.
    it('preserves every key on the declared list', () => {
      PRESERVED_LOCAL_STORAGE_KEYS.forEach((key, i) => {
        localStorage.setItem(key, `value-${i}`);
      });

      clearDayScopedLocalStorage();

      PRESERVED_LOCAL_STORAGE_KEYS.forEach((key, i) => {
        expect(localStorage.getItem(key)).toBe(`value-${i}`);
      });
    });

    it('drops day-scoped state, including the agent badge map', () => {
      localStorage.setItem('agent-status-by-day', '{"day":"14-08-2026"}');
      localStorage.setItem('SAVED_GOAL_PERIODS', '["day"]');
      localStorage.setItem('pendingAction', 'something');

      const removed = clearDayScopedLocalStorage();

      expect(localStorage.getItem('agent-status-by-day')).toBeNull();
      expect(localStorage.getItem('SAVED_GOAL_PERIODS')).toBeNull();
      expect(localStorage.getItem('pendingAction')).toBeNull();
      expect(removed).toEqual(expect.arrayContaining(['agent-status-by-day']));
    });

    it('does not remove its own bookkeeping key', () => {
      localStorage.setItem(LAST_PREPARED_DAY_KEY, '14-08-2026');
      clearDayScopedLocalStorage();
      expect(localStorage.getItem(LAST_PREPARED_DAY_KEY)).toBe('14-08-2026');
    });

    // Removing while enumerating reindexes the store and silently skips keys.
    it('removes every dropped key when many are present', () => {
      for (let i = 0; i < 20; i += 1) localStorage.setItem(`junk-${i}`, String(i));
      localStorage.setItem('token', 'keep-me');

      clearDayScopedLocalStorage();

      for (let i = 0; i < 20; i += 1) {
        expect(localStorage.getItem(`junk-${i}`)).toBeNull();
      }
      expect(localStorage.getItem('token')).toBe('keep-me');
    });
  });

  describe('clearCookies', () => {
    it('does not throw when there are no cookies', () => {
      expect(() => clearCookies()).not.toThrow();
    });

    it('returns the number of cookie names it targeted', () => {
      document.cookie = 'a=1';
      document.cookie = 'b=2';
      expect(clearCookies()).toBeGreaterThan(0);
    });
  });

  describe('prepareNewDay', () => {
    const makePersistor = () => ({
      pause: jest.fn(),
      resume: jest.fn(),
      purge: jest.fn().mockResolvedValue(undefined),
    });

    const makeClient = () => ({
      resetStore: jest.fn().mockResolvedValue(undefined),
      cache: { reset: jest.fn() },
    });

    it('purges disk before resetting memory, and resumes after', async () => {
      const order = [];
      const persistor = {
        pause: jest.fn(() => order.push('pause')),
        purge: jest.fn(() => { order.push('purge'); return Promise.resolve(); }),
        resume: jest.fn(() => order.push('resume')),
      };
      const apolloClient = {
        resetStore: jest.fn(() => { order.push('reset'); return Promise.resolve(); }),
      };

      await prepareNewDay({ apolloClient, persistor, date: '15-08-2026' });

      // If the persistor were still live during resetStore its write-back
      // trigger would race a fresh empty blob against the purge.
      expect(order).toEqual(['pause', 'purge', 'reset', 'resume']);
    });

    it('falls back to storage.removeItem when there is no persistor', async () => {
      const storage = { removeItem: jest.fn().mockResolvedValue(undefined) };
      const apolloClient = makeClient();

      const result = await prepareNewDay({ apolloClient, storage, date: '15-08-2026' });

      expect(storage.removeItem).toHaveBeenCalledWith(PERSIST_KEY);
      expect(result.cleared).toEqual(expect.arrayContaining([`storage:${PERSIST_KEY}`]));
    });

    it('clears the schema version stamp so the next boot re-stamps', async () => {
      localStorage.setItem(CACHE_VERSION_KEY, '2');

      await prepareNewDay({ apolloClient: makeClient(), date: '15-08-2026' });

      expect(localStorage.getItem(CACHE_VERSION_KEY)).toBeNull();
    });

    it('records the day it prepared', async () => {
      await prepareNewDay({ apolloClient: makeClient(), date: '15-08-2026' });
      expect(lastPreparedDay()).toBe('15-08-2026');
    });

    it('uses cache.reset when the client has no resetStore', async () => {
      const apolloClient = { cache: { reset: jest.fn() } };

      const result = await prepareNewDay({ apolloClient, date: '15-08-2026' });

      expect(apolloClient.cache.reset).toHaveBeenCalled();
      expect(result.cleared).toEqual(expect.arrayContaining(['apollo:cache.reset']));
    });

    // resetStore() rejects when a refetch fails (offline is the common case).
    // The store is already cleared by then, so this must not abort the rollover.
    it('reports a resetStore failure without throwing, and still resumes', async () => {
      const persistor = makePersistor();
      const apolloClient = {
        resetStore: jest.fn().mockRejectedValue(new Error('offline')),
      };

      const result = await prepareNewDay({ apolloClient, persistor, date: '15-08-2026' });

      expect(result.errors.join(' ')).toContain('offline');
      expect(persistor.resume).toHaveBeenCalled();
    });

    it('survives a persistor whose purge rejects', async () => {
      const persistor = makePersistor();
      persistor.purge.mockRejectedValue(new Error('idb locked'));

      const result = await prepareNewDay({
        apolloClient: makeClient(), persistor, date: '15-08-2026',
      });

      expect(result.errors.join(' ')).toContain('idb locked');
      expect(persistor.resume).toHaveBeenCalled();
    });

    it('works with no arguments at all', async () => {
      await expect(prepareNewDay()).resolves.toEqual(
        expect.objectContaining({ cleared: expect.any(Array), errors: expect.any(Array) }),
      );
    });

    it('preserves the session across a full rollover', async () => {
      localStorage.setItem('token', 'jwt-xyz');
      localStorage.setItem('agent-status-by-day', '{}');

      await prepareNewDay({ apolloClient: makeClient(), date: '15-08-2026' });

      expect(localStorage.getItem('token')).toBe('jwt-xyz');
      expect(localStorage.getItem('agent-status-by-day')).toBeNull();
    });
  });
});
