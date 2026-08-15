/**
 * newDay — start each day on a genuinely cold cache.
 *
 * WHY
 * ---
 * Every cache bug this app has had is a yesterday-shaped slice surviving into
 * today. Routine tasks reuse the same `_id` across days, so Apollo collapses
 * them into one normalized entity; `optimizedDailyGoals({date})` is keyed by
 * date but the GoalItem/RoutineItem entities underneath are not. Add the
 * persisted copy in IndexedDB and yesterday's state can outlive the rollover in
 * three places at once (memory, disk, localStorage badges).
 *
 * Rather than teach every one of those to expire, the rollover throws the whole
 * client-side cache away and lets `cache-and-network` refill it. A day boundary
 * is the one moment where a cold cache costs nothing: the user is not
 * mid-interaction, and everything on screen is about to change anyway.
 *
 * WHAT IS *NOT* CLEARED
 * ---------------------
 * The session (`token`/`email`/`name`/`picture`/`notification-token`) and the
 * user's settings. "Clear everything" would sign the user out at midnight and
 * drop their preferences — the intent is to drop *caches*, and credentials are
 * not a cache. Everything else in localStorage is day-scoped or derived and
 * goes, including the agent badge map (`agent-status-by-day`).
 */

import { PERSIST_KEY, CACHE_VERSION_KEY } from './cacheHygiene';

/** Keys that must survive a day rollover — credentials and preferences. */
export const PRESERVED_LOCAL_STORAGE_KEYS = [
  // Session — clearing these logs the user out.
  'token',
  'email',
  'name',
  'picture',
  'notification-token',
  // Preferences — settings, not caches.
  'USER_TAGS',
  'ONBOARDING_COMPLETE',
  'AI_SEARCH_SETTINGS',
  'PROFILE_SETTINGS',
];

/** Remembers which day the client last prepared for. */
export const LAST_PREPARED_DAY_KEY = 'last-prepared-day';

/** Read the day we last ran a rollover for ('' when never). */
export function lastPreparedDay() {
  try {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(LAST_PREPARED_DAY_KEY) || '';
  } catch (e) {
    return '';
  }
}

function markPreparedDay(date) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LAST_PREPARED_DAY_KEY, date);
  } catch (e) { /* best effort */ }
}

/**
 * Drop every localStorage key except the preserved set.
 * @returns {string[]} the keys removed
 */
export function clearDayScopedLocalStorage() {
  const removed = [];
  try {
    if (typeof localStorage === 'undefined') return removed;
    const keep = new Set([...PRESERVED_LOCAL_STORAGE_KEYS, LAST_PREPARED_DAY_KEY]);
    // Snapshot the keys first — removing while enumerating reindexes the store.
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k !== null) keys.push(k);
    }
    keys.forEach((k) => {
      if (keep.has(k)) return;
      try {
        localStorage.removeItem(k);
        removed.push(k);
      } catch (e) { /* skip the one that refused */ }
    });
  } catch (e) { /* storage unavailable (private mode) — nothing to clear */ }
  return removed;
}

/**
 * Expire this origin's cookies. Only non-HttpOnly cookies are reachable from
 * script; the auth token lives in localStorage, so nothing here can sign the
 * user out. Each cookie is expired at every parent path/domain because a
 * cookie set on `/home` is invisible to a delete issued at `/`.
 *
 * @returns {number} how many cookie names were targeted
 */
export function clearCookies() {
  try {
    if (typeof document === 'undefined' || !document.cookie) return 0;
    const names = document.cookie
      .split(';')
      .map((c) => c.split('=')[0].trim())
      .filter(Boolean);
    const { hostname, pathname } = window.location;
    // Every ancestor path, so a path-scoped cookie is actually reached.
    const paths = ['/'];
    pathname.split('/').filter(Boolean).reduce((acc, part) => {
      const next = `${acc}/${part}`;
      paths.push(next);
      return next;
    }, '');
    // The bare host plus each parent domain (`.example.com`).
    const domains = [undefined, hostname];
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length - 1; i += 1) domains.push(`.${parts.slice(i).join('.')}`);

    names.forEach((name) => {
      paths.forEach((path) => {
        domains.forEach((domain) => {
          const suffix = domain ? `; domain=${domain}` : '';
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${suffix}`;
        });
      });
    });
    return names.length;
  } catch (e) {
    return 0;
  }
}

/**
 * Run the whole rollover: purge the persisted cache, the in-memory Apollo
 * store, day-scoped localStorage and cookies, then let the caller refetch.
 *
 * Ordering matters. The persistor is paused and its storage purged BEFORE the
 * in-memory store is reset, otherwise its write-back trigger observes the reset
 * and races a fresh empty blob against our purge. Apollo's store is cleared
 * with `resetStore()` where available so active queries refetch themselves; the
 * caller still refetches explicitly for the case where `resetStore` is absent.
 *
 * Never throws — a failed rollover must not stop the app from showing the new
 * day. The worst case is that stale-but-self-healing data is on screen, which
 * is exactly where we were before.
 *
 * @param {Object}   opts
 * @param {Object}   opts.apolloClient  the ApolloClient instance
 * @param {Object}   opts.storage       the localforage instance backing persistence
 * @param {Object}   opts.persistor     CachePersistor, when one was constructed
 * @param {string}   opts.date          the new day, DD-MM-YYYY
 * @returns {Promise<{cleared: string[], errors: string[]}>}
 */
export async function prepareNewDay({
  apolloClient, storage, persistor, date,
} = {}) {
  const cleared = [];
  const errors = [];

  // 1. Stop the persistor writing while we tear the store down.
  if (persistor && typeof persistor.pause === 'function') {
    try {
      persistor.pause();
      cleared.push('persistor:paused');
    } catch (e) { errors.push(`persistor.pause: ${e.message}`); }
  }

  // 2. The persisted blob on disk — the copy that actually survives a close.
  if (persistor && typeof persistor.purge === 'function') {
    try {
      await persistor.purge();
      cleared.push('persistor:purged');
    } catch (e) { errors.push(`persistor.purge: ${e.message}`); }
  } else if (storage && typeof storage.removeItem === 'function') {
    try {
      await storage.removeItem(PERSIST_KEY);
      cleared.push('storage:apollo-cache-persist');
    } catch (e) { errors.push(`storage.removeItem: ${e.message}`); }
  }

  // 3. localStorage and cookies.
  const removedKeys = clearDayScopedLocalStorage();
  if (removedKeys.length) cleared.push(`localStorage:${removedKeys.length}`);
  // The version stamp goes with them, so the next boot re-stamps rather than
  // treating an empty store as a schema mismatch.
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(CACHE_VERSION_KEY);
  } catch (e) { /* best effort */ }
  const cookieCount = clearCookies();
  if (cookieCount) cleared.push(`cookies:${cookieCount}`);

  // 4. The in-memory normalized store. resetStore() also refetches active
  // queries, which is what repopulates the dashboard for the new day.
  if (apolloClient) {
    try {
      if (typeof apolloClient.resetStore === 'function') {
        await apolloClient.resetStore();
        cleared.push('apollo:resetStore');
      } else if (apolloClient.cache && typeof apolloClient.cache.reset === 'function') {
        apolloClient.cache.reset();
        cleared.push('apollo:cache.reset');
      }
    } catch (e) {
      // resetStore rejects if any refetch fails (offline, for one). The store
      // is still cleared at that point, so this is not fatal.
      errors.push(`apollo.resetStore: ${e.message}`);
    }
  }

  // 5. Let the persistor write again, now tracking the new day's data.
  if (persistor && typeof persistor.resume === 'function') {
    try {
      persistor.resume();
      cleared.push('persistor:resumed');
    } catch (e) { errors.push(`persistor.resume: ${e.message}`); }
  }

  if (date) markPreparedDay(date);

  return { cleared, errors };
}

/**
 * The client, storage and persistor all live in main.js's closure, and the
 * component that detects the rollover (DashBoard) has no way to reach them.
 * main.js registers them here once at boot so `runNewDayReset(date)` can be
 * called from anywhere without threading three objects through the component
 * tree.
 */
let runtime = { apolloClient: null, storage: null, persistor: null };

export function configureNewDay(next = {}) {
  runtime = { ...runtime, ...next };
}

/** Roll the day over using whatever main.js registered. */
export function runNewDayReset(date) {
  return prepareNewDay({
    apolloClient: runtime.apolloClient,
    storage: runtime.storage,
    // Resolved lazily: the persistor is built asynchronously, after boot.
    persistor: typeof runtime.persistor === 'function' ? runtime.persistor() : runtime.persistor,
    date,
  });
}

export default prepareNewDay;
