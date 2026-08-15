/**
 * cacheGuard — the pending-entity guard (docs/cache/02-corrected-flow.md F9).
 *
 * THE RACE
 * --------
 * Every display query on the dashboard is `cache-and-network`. Opening the app
 * therefore issues a network read *while cached data is already on screen and
 * tappable*. If the user taps during that window:
 *
 *     T0  routineDate query leaves      (server state: ticked=false)
 *     T1  user taps -> optimistic write (cache: ticked=true)
 *     T2  mutation resolves             (cache: ticked=true, authoritative)
 *     T3  T0's response arrives         (payload says ticked=false) -> REVERT
 *
 * The tick was saved. The user still watches it turn white again, taps a second
 * time, and reports "the first check isn't saved".
 *
 * Apollo 2.x protects the window T1..T2 on its own: an `optimisticResponse`
 * creates a cache layer that wins on read until the mutation settles. What it
 * has no answer for is T2..T3 — the optimistic layer is gone, the mutation
 * result is in the base layer, and a response that left before T1 is still
 * allowed to overwrite it. This is the whole class of "the UI reverted my tap".
 *
 * THE GUARD
 * ---------
 * A response can only be trusted for a field if the request that produced it
 * left *after* we learned the truth about that field. So:
 *
 *   - every operation is stamped with a monotonic sequence number when it
 *     leaves (`beginOperation`);
 *   - a local write registers the fields it owns (`guardFields`), and the
 *     server's answer stamps them confirmed at a later sequence
 *     (`confirmFields` / `captureFromResult`);
 *   - a *query* payload is rewritten on the way back so guarded fields keep
 *     their local value, but only for payloads whose request predates the
 *     confirmation (`applyGuards`).
 *
 * A guard is dropped as soon as no in-flight request predates its confirmation
 * — usually within milliseconds — and unconditionally after `TTL_MS`, so a hung
 * or aborted request can never pin stale state.
 *
 * WHY THIS INSTEAD OF DISABLING CONTROLS
 * -------------------------------------
 * The previous fix was to disable the tick circle and every goal-item checkbox
 * while a feeding query was loading (a `busy` prop). It closed the race by
 * removing the interaction, which costs a tap on every single app-open — the
 * dashboard is at its most tappable exactly when it is also refetching. With
 * the guard, the response is what yields, not the user.
 *
 * SCOPE
 * -----
 * Scalars only. A guarded field is never a list or an object: reordering or
 * re-shaping a list from the client is how the cache got corrupted in the first
 * place (see docs/cache/01-current-flow-broken.md B5). Lists always come from
 * the server as-is.
 */

/**
 * Hard expiry for a guard. Long enough to cover a slow mutation on a bad
 * connection, short enough that a genuinely stuck one heals on the next read.
 */
export const TTL_MS = 20000;

/** Safety valve — a runaway registry must never grow without bound. */
export const MAX_GUARDS = 500;

let seq = 0;
/** seq -> ms, for every request currently on the wire. */
const inFlight = new Map();
/** "Typename:id" -> { fields: Map<string, scalar>, confirmedAt: number|null, expiresAt: number } */
const guards = new Map();

const nowMs = () => Date.now();
const keyOf = (typename, id) => `${typename}:${id}`;
const nextSeq = () => {
  seq += 1;
  return seq;
};

/** A field is guardable only if it is a scalar — see SCOPE above. */
const isGuardable = (name, value) => name !== '__typename'
  && name !== 'id'
  && value !== undefined
  && (value === null || typeof value !== 'object');

/** Lowest sequence still on the wire; Infinity when nothing is in flight. */
function oldestInFlight() {
  let min = Infinity;
  inFlight.forEach((_, s) => { if (s < min) min = s; });
  return min;
}

/**
 * Retire guards that are expired, or confirmed and no longer shadowed by any
 * older in-flight request. Cheap enough to run on every request completion.
 */
function sweep() {
  const t = nowMs();
  const floor = oldestInFlight();
  guards.forEach((guard, key) => {
    if (guard.expiresAt <= t) { guards.delete(key); return; }
    if (guard.confirmedAt !== null && floor > guard.confirmedAt) guards.delete(key);
  });
}

/** Drop the oldest entries once the registry exceeds MAX_GUARDS. */
function enforceCap() {
  if (guards.size <= MAX_GUARDS) return;
  const overflow = guards.size - MAX_GUARDS;
  const keys = Array.from(guards.keys()).slice(0, overflow);
  keys.forEach((k) => guards.delete(k));
}

/** Stamp a request as it leaves. Returns the sequence to pass to applyGuards. */
export function beginOperation() {
  const s = nextSeq();
  inFlight.set(s, nowMs());
  return s;
}

/** Release a request. Idempotent — the link may call it from both paths. */
export function endOperation(s) {
  if (!inFlight.has(s)) return;
  inFlight.delete(s);
  sweep();
}

function upsert(typename, id, fields, confirmedAt) {
  if (!typename || id == null || !fields || typeof fields !== 'object') return null;
  const key = keyOf(typename, id);
  let guard = guards.get(key);
  if (!guard) {
    guard = { fields: new Map(), confirmedAt: null, expiresAt: 0 };
    guards.set(key, guard);
  }
  Object.keys(fields).forEach((name) => {
    if (isGuardable(name, fields[name])) guard.fields.set(name, fields[name]);
  });
  if (!guard.fields.size) {
    guards.delete(key);
    return null;
  }
  guard.confirmedAt = confirmedAt;
  guard.expiresAt = nowMs() + TTL_MS;
  enforceCap();
  return guard;
}

/**
 * Claim ownership of an entity's fields for an *unconfirmed* local write —
 * call this alongside an optimistic response, before the mutation resolves.
 *
 * Until the server answers, no query payload may write these fields. Use it for
 * fields the mutation does not return (`completeGoalItem` omits `progress`, the
 * routine tick omits the week aggregate), since those cannot be picked up
 * automatically from the result.
 */
export function guardFields(typename, id, fields) {
  return !!upsert(typename, id, fields, null);
}

/**
 * Record the server's authoritative value. Requests already on the wire still
 * yield to it; anything issued from now on is trusted.
 */
export function confirmFields(typename, id, fields) {
  return !!upsert(typename, id, fields, nextSeq());
}

/**
 * Abandon a guard — for a mutation that failed. Apollo rolls its own optimistic
 * layer back; leaving the guard in place would keep pinning the rolled-back
 * value over every incoming read until the TTL expired.
 */
export function releaseEntity(typename, id) {
  return guards.delete(keyOf(typename, id));
}

/** Walk a GraphQL payload, visiting every normalizable entity node. */
function walkEntities(data, visit) {
  const seen = new Set();
  const step = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(step); return; }
    if (seen.has(node)) return;
    seen.add(node);
    if (node.__typename && node.id != null) visit(node);
    Object.keys(node).forEach((k) => {
      if (k !== '__typename') step(node[k]);
    });
  };
  step(data);
}

/**
 * Rewrite a query payload in place so guarded fields keep their local value.
 *
 * Mutates `data` deliberately: Apollo normalizes and caches whatever the link
 * chain hands back, so editing the payload here is what keeps the stale value
 * out of the store instead of merely hiding it from one component.
 *
 * @param {Object} data   the response payload (mutated)
 * @param {number} opSeq  sequence from beginOperation for THIS request
 * @returns {number} how many fields were held
 */
export function applyGuards(data, opSeq) {
  if (!guards.size || !data || typeof data !== 'object') return 0;
  let held = 0;
  walkEntities(data, (node) => {
    const guard = guards.get(keyOf(node.__typename, node.id));
    if (!guard) return;
    // Unconfirmed: the server hasn't answered our write yet, so nothing on the
    // wire can know about it. Confirmed: only requests that left before we
    // learned the truth are stale.
    if (guard.confirmedAt !== null && opSeq > guard.confirmedAt) return;
    guard.fields.forEach((value, name) => {
      if (!Object.prototype.hasOwnProperty.call(node, name)) return;
      if (node[name] === value) return;
      // eslint-disable-next-line no-param-reassign
      node[name] = value;
      held += 1;
    });
  });
  return held;
}

/**
 * Confirm every entity carried by a mutation result.
 *
 * This is the automatic half of the guard and needs no call-site changes: a
 * mutation result is by definition newer than any request that left before it,
 * so its scalars win over every response still on the wire. Explicit
 * `guardFields` is only needed for fields a mutation does not return.
 *
 * Note that this confirms EVERY entity in the payload, not just the one the
 * user touched — `tickRoutineItem` returns the whole tasklist, so one tick
 * briefly outranks older reads on all ~20 tasks. That is the rule working as
 * intended (the request that left last wins), and it is what makes
 * `passRoutineItem` / `waitRoutineItem` / the goal mutations protected for
 * free. It is also self-limiting: the guard is dropped as soon as those older
 * reads drain, so the very next read converges.
 *
 * @returns {number} entities confirmed
 */
export function captureFromResult(data) {
  if (!data || typeof data !== 'object') return 0;
  const at = nextSeq();
  let count = 0;
  walkEntities(data, (node) => {
    const fields = {};
    let any = false;
    Object.keys(node).forEach((name) => {
      if (isGuardable(name, node[name])) { fields[name] = node[name]; any = true; }
    });
    if (any && upsert(node.__typename, node.id, fields, at)) count += 1;
  });
  return count;
}

/** Introspection for tests and the e2e cache-integrity suite. */
export function guardStats() {
  return {
    guards: guards.size,
    inFlight: inFlight.size,
    seq,
    entries: Array.from(guards.entries()).map(([key, g]) => ({
      key,
      fields: Array.from(g.fields.keys()),
      confirmed: g.confirmedAt !== null,
    })),
  };
}

export function _reset() {
  seq = 0;
  inFlight.clear();
  guards.clear();
}

export default {
  beginOperation,
  endOperation,
  guardFields,
  confirmFields,
  releaseEntity,
  applyGuards,
  captureFromResult,
  guardStats,
  _reset,
};
