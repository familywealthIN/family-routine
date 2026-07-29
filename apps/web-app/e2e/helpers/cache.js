/* eslint-disable no-console */
/**
 * cache.js — Apollo cache introspection + invariants for the e2e suite.
 *
 * The dashboard's bugs are all *cache* bugs, and a screenshot can't see them:
 * the UI looks fine for the second the corrupt slice is on screen and then
 * self-heals off the next network response. So instead of asserting pixels we
 * assert the normalized store directly, after every activity and after every
 * app open/close cycle.
 *
 * `window.__APOLLO_CLIENT__` is exposed by main.js whenever NODE_ENV is not
 * production, which is how the dev server runs under Playwright.
 */

const { gql } = require('./api');

/** Every __typename this app is allowed to normalize. Anything else is a bug. */
const KNOWN_TYPES = [
  'Goal', 'GoalItem', 'SubTaskItem', 'Routine', 'RoutineItem', 'StimuliItem',
  'StepItem', 'DayStimuli', 'XpBalance', 'UserItem', 'MottoItem', 'Agent',
  'AgentEvent', 'AgentExecution', 'ProgressItem', 'GoalMilestone', 'Milestone',
  'TimelineEntry', 'SearchResult', 'AiGoalPlan', 'Referral', 'XpTransaction',
];

/** Raw normalized store as a plain object. */
async function extractCache(page) {
  return page.evaluate(() => {
    const c = window.__APOLLO_CLIENT__;
    if (!c) throw new Error('__APOLLO_CLIENT__ not exposed — is NODE_ENV production?');
    return c.cache.extract();
  });
}

/** The persisted (IndexedDB) copy — what the next cold open will restore. */
async function extractPersistedCache(page) {
  return page.evaluate(async () => new Promise((resolve) => {
    const req = indexedDB.open('routine-notes');
    req.onsuccess = () => {
      const db = req.result;
      if (!Array.from(db.objectStoreNames).includes('apollo_cache')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('apollo_cache', 'readonly');
      const g = tx.objectStore('apollo_cache').get('apollo-cache-persist');
      g.onsuccess = () => {
        const v = g.result;
        try {
          resolve(typeof v === 'string' ? JSON.parse(v) : v);
        } catch (e) { resolve(null); }
      };
      g.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  }));
}

/** Server truth: how many goal items each period-Goal really has for `date`. */
async function serverGoalShape(date) {
  const data = await gql(
    `query G($date: String!) {
      optimizedDailyGoals(date: $date) {
        id date period goalItems { id isComplete status }
      }
    }`,
    { date },
  );
  const shape = {};
  (data.optimizedDailyGoals || []).forEach((g) => {
    shape[`Goal:${g.id}`] = {
      period: g.period,
      date: g.date,
      count: (g.goalItems || []).length,
      items: Object.fromEntries((g.goalItems || []).map((i) => [i.id, i.isComplete])),
    };
  });
  return shape;
}

/**
 * Run every cache invariant against a store snapshot.
 * Returns an array of violation strings — empty means healthy.
 *
 * @param {Object} store      cache.extract() output
 * @param {Object} expected   serverGoalShape() output (optional)
 * @param {string} label      where this snapshot came from, for the message
 */
function checkInvariants(store, expected, label = 'cache') {
  const bad = [];
  if (!store) return [`${label}: no store`];

  // I1 — no optimistic placeholder entities left behind. `addGoalItemToCache`
  // mints `Goal:temp-<ts>-<period>` when it can't find the period goal; nothing
  // ever removes them, and cache-persist writes them to disk forever.
  Object.keys(store)
    .filter((k) => /^Goal:temp-/.test(k))
    .forEach((k) => bad.push(`${label}: leaked optimistic entity ${k}`));

  // I2 — no mistyped entities. A wrong __typename mints a phantom record that
  // the real query then references; when Apollo GCs it the parent reverts.
  Object.keys(store).forEach((k) => {
    if (k.startsWith('ROOT_') || k.startsWith('$')) return;
    const type = k.split(':')[0].split('.')[0];
    if (!KNOWN_TYPES.includes(type)) bad.push(`${label}: unknown entity type "${type}" (key ${k})`);
  });

  // I3 — no Goal's goalItems list is a *subset* of what the server holds. This
  // is the partial-list corruption: a scoped query (goalsByGoalRef) returns the
  // real Goal id with a filtered goalItems array, and Apollo replaces the whole
  // normalized list, dropping every sibling item.
  if (expected) {
    Object.entries(expected).forEach(([key, exp]) => {
      const cached = store[key];
      if (!cached || !Array.isArray(cached.goalItems)) return; // not loaded yet is fine
      if (cached.goalItems.length < exp.count) {
        bad.push(
          `${label}: ${key} (${exp.period}/${exp.date}) truncated — `
          + `cache has ${cached.goalItems.length} goalItems, server has ${exp.count}`,
        );
      }
    });
  }

  // I4 — no GoalItem carries fields the schema never defined. GoalItemList
  // writes `period`/`date` straight onto the cached goal item before opening
  // the display dialog, which pollutes the memoized read result.
  Object.entries(store).forEach(([k, v]) => {
    if (!k.startsWith('GoalItem:') || !v) return;
    ['period', 'date'].forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(v, f)) {
        bad.push(`${label}: ${k} has foreign field "${f}" written onto the cached entity`);
      }
    });
  });

  return bad;
}

/** Assert the completion state the user actually left behind survived. */
function checkTicksSurvived(store, expectedTicks, label = 'cache') {
  const bad = [];
  Object.entries(expectedTicks).forEach(([id, want]) => {
    const rec = store[`GoalItem:${id}`];
    if (!rec) { bad.push(`${label}: GoalItem:${id} missing from cache`); return; }
    if (!!rec.isComplete !== !!want) {
      bad.push(`${label}: GoalItem:${id} isComplete=${rec.isComplete}, expected ${want}`);
    }
  });
  return bad;
}

/** Count Routine documents per date server-side (duplicates = the new-day race). */
async function serverRoutineCount(date) {
  // routineDate() collapses duplicates via findOne, so ask for the id and then
  // probe weekStimuli, which is the only resolver that sees them all. Cheapest
  // reliable signal: the routine id must be stable across two reads.
  const a = await gql('query R($date:String!){ routineDate(date:$date){ id } }', { date });
  const b = await gql('query R($date:String!){ routineDate(date:$date){ id } }', { date });
  return {
    idA: a.routineDate && a.routineDate.id,
    idB: b.routineDate && b.routineDate.id,
    stable: !!a.routineDate && !!b.routineDate && a.routineDate.id === b.routineDate.id,
  };
}

module.exports = {
  KNOWN_TYPES,
  extractCache,
  extractPersistedCache,
  serverGoalShape,
  serverRoutineCount,
  checkInvariants,
  checkTicksSurvived,
};
