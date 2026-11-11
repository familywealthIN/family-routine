/**
 * homeSnapshot — what Home last knew, kept on this device so it can draw at once.
 *
 * WHY
 * ---
 * Home waited for the network before it drew a single routine. The Apollo cache
 * does not cover the two opens that matter most: a new day (today's `routineDate`
 * has never been read), and any open after the day rollover wiped the cache
 * (utils/newDay.js). Both meant "Loading today…" until a server that may be cold
 * answered: 12s measured for a first open of the day.
 *
 * So Home keeps its own small record, outside Apollo, in localStorage (read
 * synchronously, before the first paint):
 *
 *   - `days[date]`: the last `routineDate` and `optimizedDailyGoals` the server
 *     returned for that date, exactly as returned. Up to MAX_DAYS dates.
 *   - `template`: the routine's shape (names, times, points, split rates),
 *     taken from the latest day. A day nobody has read yet is drawn from it.
 *   - `xpBalance`: the last balance, for the points chip.
 *
 * It is only ever a placeholder: the page draws it until the server answers,
 * and never sends a mutation on the strength of it (see RoutineFocus
 * `settledRow`). It belongs to one account: another email reads nothing.
 *
 * It survives the day rollover on purpose (PRESERVED_LOCAL_STORAGE_KEYS): it is
 * keyed by date, so yesterday's entry can never be drawn as today's, and the
 * template is the one thing a new day needs. Sign-out removes it.
 */

export const HOME_SNAPSHOT_KEY = 'rn-home-snapshot';
const VERSION = 1;
/** Dates kept: today, tomorrow's prefetch, and a couple behind for the week strip. */
export const MAX_DAYS = 4;

/** The per-day fields a template must never carry into another day. */
const DAY_FIELDS = ['ticked', 'passed', 'wait', 'redeemed', 'passedPoints', 'tickedAt'];

let memo = null;

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (e) {
    return null;
  }
}

function load() {
  if (memo) return memo;
  const store = storage();
  if (!store) return null;
  try {
    const parsed = JSON.parse(store.getItem(HOME_SNAPSHOT_KEY) || 'null');
    memo = parsed && parsed.v === VERSION ? parsed : null;
  } catch (e) {
    memo = null;
  }
  return memo;
}

function persist(snapshot) {
  memo = snapshot;
  const store = storage();
  if (!store) return;
  try {
    store.setItem(HOME_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // Full storage: keep only the newest day and try once more.
    try {
      const newest = Object.keys(snapshot.days)
        .sort((a, b) => (snapshot.days[b].savedAt || 0) - (snapshot.days[a].savedAt || 0))[0];
      const slim = { ...snapshot, days: newest ? { [newest]: snapshot.days[newest] } : {} };
      store.setItem(HOME_SNAPSHOT_KEY, JSON.stringify(slim));
      memo = slim;
    } catch (e2) { /* the page simply falls back to the network */ }
  }
}

function forAccount(email) {
  if (!email) return null;
  const snapshot = load();
  return snapshot && snapshot.email === email ? snapshot : null;
}

/** The routine's shape, stripped of everything that belongs to one day. */
export function templateFrom(routineDate) {
  const list = (routineDate && routineDate.tasklist) || [];
  return list.filter((task) => task && task.id).map((task) => {
    const shape = { ...task };
    DAY_FIELDS.forEach((field) => { delete shape[field]; });
    shape.stimuli = (task.stimuli || []).map((st) => ({ ...st, earned: 0 }));
    return shape;
  });
}

/** Keep the MAX_DAYS most recently saved dates. */
function trimmed(days) {
  const keep = Object.keys(days)
    .sort((a, b) => (days[b].savedAt || 0) - (days[a].savedAt || 0))
    .slice(0, MAX_DAYS);
  return keep.reduce((acc, date) => ({ ...acc, [date]: days[date] }), {});
}

/**
 * Record what the server returned for a date. Either part may be left out; the
 * other part already stored for that date is kept.
 *
 * @param {string} email
 * @param {string} date  DD-MM-YYYY
 * @param {{ routineDate?: Object|null, goals?: Array }} part
 */
export function saveHomeDay(email, date, { routineDate, goals } = {}) {
  if (!email || !date) return;
  const base = forAccount(email) || {
    v: VERSION, email, days: {}, template: [], xpBalance: null,
  };
  const day = { ...(base.days[date] || {}) };
  if (routineDate !== undefined) day.routineDate = routineDate;
  if (goals !== undefined) day.goals = goals;
  day.savedAt = Date.now();

  const next = { ...base, days: trimmed({ ...base.days, [date]: day }) };
  if (routineDate && routineDate.tasklist && routineDate.tasklist.length) {
    next.template = templateFrom(routineDate);
  }
  persist(next);
}

export function saveHomeXp(email, xpBalance) {
  if (!email || !xpBalance) return;
  const base = forAccount(email) || {
    v: VERSION, email, days: {}, template: [], xpBalance: null,
  };
  persist({ ...base, xpBalance });
}

/** `{ routineDate, goals, savedAt }` last saved for that date, or null. */
export function homeDay(email, date) {
  const snapshot = forAccount(email);
  return (snapshot && snapshot.days[date]) || null;
}

export function homeTemplate(email) {
  const snapshot = forAccount(email);
  return (snapshot && snapshot.template) || [];
}

export function homeXp(email) {
  const snapshot = forAccount(email);
  return (snapshot && snapshot.xpBalance) || null;
}

/** Sign-out: nothing of this account may be drawn for the next one. */
export function clearHomeSnapshot() {
  memo = null;
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(HOME_SNAPSHOT_KEY);
  } catch (e) { /* nothing to clear */ }
}

/** Tests: forget the parsed copy so the next read goes back to storage. */
export function resetHomeSnapshotMemo() {
  memo = null;
}
