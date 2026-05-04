/**
 * pendingMutations — small singleton tracking in-flight optimistic
 * mutations so unrelated background refetches and timers don't stomp
 * the optimistic UI state.
 *
 * Usage:
 *   import { pendingMutations } from '@/utils/pendingMutations';
 *   pendingMutations.add('goal:abc123');
 *   try { await mutate(...) } finally { pendingMutations.remove('goal:abc123'); }
 *
 *   if (pendingMutations.empty()) refetchSomething();
 *
 * Also tracks a per-id "last desired state" so rapid clicks on the same
 * item can be coalesced into at most one in-flight mutation + one
 * corrective mutation.
 */

const inFlight = new Set();
const desiredState = new Map();
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch (_) { /* listener errors must not break tracking */ }
  }
}

export const pendingMutations = {
  add(key) {
    inFlight.add(key);
    notify();
  },
  remove(key) {
    inFlight.delete(key);
    desiredState.delete(key);
    notify();
  },
  has(key) {
    return inFlight.has(key);
  },
  empty() {
    return inFlight.size === 0;
  },
  size() {
    return inFlight.size;
  },
  // Per-item coalescing: record the latest user intent for an in-flight key
  setDesired(key, value) {
    desiredState.set(key, value);
  },
  getDesired(key) {
    return desiredState.has(key) ? desiredState.get(key) : undefined;
  },
  clearDesired(key) {
    desiredState.delete(key);
  },
  // Subscribe — returns an unsubscribe fn
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  // For tests
  _reset() {
    inFlight.clear();
    desiredState.clear();
  },
};

export default pendingMutations;
