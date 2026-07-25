/**
 * useEntityCache — entity-level Apollo cache updates.
 *
 * The safe replacement for query-level cache surgery (`useApolloCacheUpdates`).
 *
 * WHY THIS EXISTS
 * ---------------
 * Apollo Client 2.x normalizes every entity under `${__typename}:${id}` (the
 * default `dataIdFromObject`, and this app uses `new InMemoryCache()` with no
 * override). When you patch that normalized record by id, EVERY query that
 * references it updates at once — `optimizedDailyGoals`, `agendaGoals`,
 * `routineDate`, week views, etc. — with zero chance of the copies drifting
 * apart.
 *
 * The old approach (`readQuery → cloneDeep → mutate → writeQuery`) edited one
 * query's copy of an entity and left the others stale, which is exactly how the
 * cache "got corrupt": the same week goal lives in both `optimizedDailyGoals`
 * and `agendaGoals`, and a `.find(g => g.period === period)` heuristic could
 * patch the wrong one. Patch by id and that entire class of bug disappears.
 *
 * SCOPE (Apollo 2.x reality)
 * --------------------------
 * - UPDATE a normalized entity's scalar fields: fully supported, safe, and the
 *   preferred path — `patchEntity` / `patchGoalItem` / `patchRoutineItem`.
 * - CREATE / DELETE of a list member still touches the parent list; AC2 has no
 *   `cache.evict`, so deletes rely on the mutation returning the parent or on
 *   the display query's `cache-and-network` refetch. Do NOT hand-clone lists.
 *
 * USAGE
 *   import { patchGoalItem } from '@/composables/useEntityCache';
 *   // inside a mutation's update(cache, ...)
 *   patchGoalItem(cache, id, { isComplete: true, status: 'done', progress: 100 });
 */
import gql from 'graphql-tag';

// Default InMemoryCache id shape. Keep in sync if a custom dataIdFromObject is
// ever added in main.js.
const cacheId = (typename, id) => `${typename}:${id}`;

// Fragments are pure functions of (typename, sorted field names); memoize so we
// parse each shape once instead of on every write.
const fragmentCache = new Map();

function patchFragment(typename, fieldNames) {
  const key = `${typename}:${fieldNames.join(',')}`;
  let fragment = fragmentCache.get(key);
  if (!fragment) {
    const body = fieldNames.join('\n  ');
    // Unique fragment name per (type, field-set) so graphql-tag's global
    // fragment registry never sees two different bodies under one name.
    const name = `${typename}CachePatch_${fieldNames.join('_')}`;
    fragment = gql(`fragment ${name} on ${typename} {\n  ${body}\n}`);
    fragmentCache.set(key, fragment);
  }
  return fragment;
}

/**
 * Merge scalar fields onto a normalized entity, in place, by id.
 *
 * Only the keys present in `fields` are written; every other field on the
 * record is left untouched (Apollo stores entities field-by-field). This is a
 * genuine partial update, not a replace.
 *
 * @param {Object} cache   Apollo cache / client with writeFragment
 * @param {Object} params
 * @param {string} params.typename  GraphQL __typename (e.g. 'GoalItem')
 * @param {string|number} params.id  Entity id
 * @param {Object} params.fields  Scalar fields to merge (no nested list fields)
 * @returns {boolean} true when the write succeeded
 */
export function patchEntity(cache, { typename, id, fields }) {
  if (!cache || typeof cache.writeFragment !== 'function') return false;
  if (!typename || id == null || !fields) return false;
  // Drop `undefined` values: a partial mutation result (e.g. completeGoalItem
  // returns no `progress`) must not overwrite an existing field with nothing.
  // `null` is kept — it's a real "clear this field" (e.g. completedAt on undo).
  const data = { __typename: typename };
  Object.keys(fields).forEach((k) => {
    if (k !== '__typename' && fields[k] !== undefined) data[k] = fields[k];
  });
  const fieldNames = Object.keys(data).filter((k) => k !== '__typename');
  if (!fieldNames.length) return false;

  try {
    cache.writeFragment({
      id: cacheId(typename, id),
      fragment: patchFragment(typename, fieldNames),
      data,
    });
    return true;
  } catch (e) {
    // A miss (entity not in cache yet) is expected and harmless — the
    // cache-and-network display query will populate it. Never throw from a
    // cache update: a mutation must not fail because of an optimistic write.
    return false;
  }
}

/**
 * Read specific scalar fields off a normalized entity by id.
 * Returns null on a cache miss.
 */
export function readEntity(cache, { typename, id, fieldNames }) {
  if (!cache || typeof cache.readFragment !== 'function') return null;
  if (!typename || id == null || !Array.isArray(fieldNames) || !fieldNames.length) return null;
  try {
    return cache.readFragment({
      id: cacheId(typename, id),
      fragment: patchFragment(typename, fieldNames),
    });
  } catch (e) {
    return null;
  }
}

/** GoalItem convenience — the entity most exposed to cache corruption. */
export function patchGoalItem(cache, id, fields) {
  return patchEntity(cache, { typename: 'GoalItem', id, fields });
}

/** RoutineItem convenience (ticking, redeeming, wait/passed flags). */
export function patchRoutineItem(cache, id, fields) {
  return patchEntity(cache, { typename: 'RoutineItem', id, fields });
}

/** SubTaskItem convenience. */
export function patchSubTaskItem(cache, id, fields) {
  return patchEntity(cache, { typename: 'SubTaskItem', id, fields });
}

export default {
  patchEntity,
  readEntity,
  patchGoalItem,
  patchRoutineItem,
  patchSubTaskItem,
};
