/**
 * cacheHygiene — sanitize the persisted Apollo cache before it is restored.
 *
 * WHY
 * ---
 * `apollo-cache-persist` snapshots the whole normalized store to IndexedDB and
 * restores it verbatim on the next open. It has no schema version and no purge,
 * so **one bad write is permanent**: a corrupt slice survives every restart,
 * every new day, and every app update, and is only ever healed by a network
 * response that happens to overwrite the exact same fields.
 *
 * Two kinds of rot were found in this app's persisted cache after a few days of
 * normal use:
 *
 *   - `Goal:temp-1784926878068-day` and friends — optimistic placeholder
 *     entities minted by `addGoalItemToCache` when it can't find the period
 *     goal. Nothing evicts them, so four-day-old placeholders were still
 *     shadowing the real goals for those dates.
 *   - `RoutineItemRef:<id>` — a phantom minted by a wrong `__typename`. Apollo
 *     will happily GC it later, and the entity referencing it then reverts to
 *     its base state (this is how a green tick silently flips back to white).
 *
 * Neither can be repaired at read time, so we drop them at boot. Everything
 * removed here is re-fetchable — every display query is `cache-and-network`.
 *
 * See docs/cache/02-corrected-flow.md (F6).
 */

/** Bump to invalidate every persisted cache — e.g. after a schema change. */
export const CACHE_SCHEMA_VERSION = 2;

export const CACHE_VERSION_KEY = 'apollo-cache-schema-version';
export const PERSIST_KEY = 'apollo-cache-persist';

/**
 * Every `__typename` this app legitimately normalizes. Anything else in the
 * store is a phantom from a mistyped write.
 */
export const KNOWN_TYPES = [
  'Goal', 'GoalItem', 'SubTaskItem', 'Routine', 'RoutineItem', 'StimuliItem',
  'StepItem', 'DayStimuli', 'XpBalance', 'UserItem', 'MottoItem', 'Agent',
  'AgentEvent', 'AgentExecution', 'ProgressItem', 'GoalMilestone', 'Milestone',
  'TimelineEntry', 'SearchResult', 'AiGoalPlan', 'Referral', 'XpTransaction',
];

const isTempEntity = (key) => /:temp-/.test(key);

function typeOf(key) {
  // Apollo 2 generated ids look like `ProgressItem:radar-chart.values.0`.
  return key.split(':')[0].split('.')[0];
}

/**
 * Remove entities that can never be made correct, plus any ROOT_QUERY field
 * that points at one.
 *
 * @param {Object} store  a `cache.extract()`-shaped object
 * @returns {{ store: Object, removed: string[] }}
 */
export function sanitizeStore(store) {
  if (!store || typeof store !== 'object') return { store, removed: [] };

  const removed = [];
  const clean = {};

  Object.keys(store).forEach((key) => {
    if (key === 'ROOT_QUERY' || key === 'ROOT_MUTATION' || key.startsWith('$')) {
      clean[key] = store[key];
      return;
    }
    if (isTempEntity(key)) { removed.push(key); return; }
    if (!KNOWN_TYPES.includes(typeOf(key))) { removed.push(key); return; }
    clean[key] = store[key];
  });

  if (!removed.length) return { store, removed };

  // Drop ROOT_QUERY fields whose value references anything we just removed —
  // a dangling ref reads as `null` and can blank a whole query result.
  const gone = new Set(removed);
  const referencesRemoved = (value) => {
    if (!value) return false;
    if (Array.isArray(value)) return value.some(referencesRemoved);
    if (typeof value === 'object') {
      if (typeof value.id === 'string' && gone.has(value.id)) return true;
      return Object.keys(value).some((k) => referencesRemoved(value[k]));
    }
    return false;
  };

  ['ROOT_QUERY', 'ROOT_MUTATION'].forEach((root) => {
    if (!clean[root]) return;
    const next = {};
    Object.keys(clean[root]).forEach((field) => {
      if (referencesRemoved(clean[root][field])) removed.push(`${root}.${field}`);
      else next[field] = clean[root][field];
    });
    clean[root] = next;
  });

  return { store: clean, removed };
}

/**
 * Run before `persistCache()`. Wipes the persisted blob outright on a schema
 * version bump, otherwise strips the unrepairable entities from it in place.
 *
 * Never throws: a hygiene failure must not stop the app from booting — the
 * worst case is that we restore what we would have restored anyway.
 *
 * Returns the cleaned store alongside the report so the caller can hand it
 * straight to `cache.restore()`. `CachePersistor.restore()` is nothing but
 * `getItem` -> `JSON.parse` -> `cache.restore`, so reusing what we already
 * parsed here takes a second full read and parse of the entire store off the
 * cold-boot path — and that read blocks first paint.
 *
 * @param {Object} storage  the localforage instance used for persistence
 * @returns {Promise<{purged: boolean, removed: string[], store: Object|null}>}
 */
export async function sanitizePersistedCache(storage) {
  const result = { purged: false, removed: [], store: null };
  if (!storage || typeof storage.getItem !== 'function') return result;

  // localStorage can throw outright (Safari private mode, locked-down
  // WebViews). That must NOT be treated as "cache is corrupt" — purging on
  // every boot in those environments would silently disable offline support
  // for good. If we can't read the version, skip the version check and still
  // do the (safe, idempotent) entity sweep below.
  let storedVersion = null;
  let canWriteVersion = true;
  try {
    storedVersion = Number(window.localStorage.getItem(CACHE_VERSION_KEY));
  } catch (e) {
    canWriteVersion = false;
  }

  if (canWriteVersion && storedVersion !== CACHE_SCHEMA_VERSION) {
    try {
      await storage.removeItem(PERSIST_KEY);
      window.localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_SCHEMA_VERSION));
      result.purged = true;
      return result;
    } catch (e) {
      // Fall through to the sweep — better than restoring nothing at all.
    }
  }

  try {
    const raw = await storage.getItem(PERSIST_KEY);
    if (!raw) return result;

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const { store, removed } = sanitizeStore(parsed);
    result.store = store;
    if (removed.length) {
      await storage.setItem(PERSIST_KEY, JSON.stringify(store));
      result.removed = removed;
    }
  } catch (e) {
    // Only an unreadable/unparseable BLOB gets dropped — restoring garbage is
    // worse than starting empty, and cache-and-network refills on first paint.
    result.store = null;
    try {
      await storage.removeItem(PERSIST_KEY);
      result.purged = true;
    } catch (e2) { /* nothing more we can do; the persistor will overwrite it */ }
  }

  return result;
}

export default sanitizePersistedCache;
