/**
 * homeSync — keep Home's data fresh in the background, so an open never waits.
 *
 * Home draws from what it already has (the Apollo cache, then
 * utils/homeSnapshot.js) and this keeps both of those current:
 *
 *   - at start-up, BEFORE the app mounts: today's routine, goals and points go
 *     on the wire straight away. Home's own queries are the same documents and
 *     variables, so Apollo folds them into these requests instead of sending
 *     them again;
 *   - when the app comes back to the foreground or back online (at most every
 *     RESUME_GAP_MS), and every INTERVAL_MS while it is in view;
 *   - in the evening, tomorrow's goals, into the snapshot only (`no-cache`):
 *     the first open of tomorrow then draws its tasks without waiting.
 *
 * Results go through Apollo, so whatever Home is showing updates in place, and
 * into the snapshot. The pending-entity guard (apollo/guardLink.js) keeps a
 * read from undoing a tap still on the wire, and a sync never starts while a
 * mutation is pending (utils/pendingMutations.js), same as the page's refresh.
 *
 * This runs while the app runs. A closed app is not refreshed: on iOS and
 * Android that needs a native background task, and the snapshot already makes
 * the next open draw at once.
 */
import moment from 'moment';
import {
  ROUTINE_DATE_QUERY, DAILY_GOALS_QUERY, XP_BALANCE_QUERY,
} from '../composables/graphql/queries';
import { saveHomeDay, saveHomeXp } from '../utils/homeSnapshot';
import { pendingMutations } from '../utils/pendingMutations';

const FORMAT = 'DD-MM-YYYY';
/** Coming back sooner than this after the last sync does not sync again. */
export const RESUME_GAP_MS = 30 * 1000;
/** While the app is in view. */
export const INTERVAL_MS = 5 * 60 * 1000;
/** From this hour, tomorrow's goals are fetched ahead. */
export const EVENING_HOUR = 18;
/** A sync that found a mutation pending tries again after this. */
export const RETRY_MS = 3000;

const state = {
  client: null,
  getEmail: () => '',
  lastSync: 0,
  inFlight: null,
  timer: null,
  retry: null,
  prefetched: '',
  onWake: null,
};

const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

function read(query, variables, fetchPolicy = 'network-only') {
  return state.client
    .query({ query, variables, fetchPolicy })
    .then((result) => (result && result.data) || null)
    .catch(() => null);
}

async function prefetchTomorrow(email, now) {
  if (now.hour() < EVENING_HOUR) return;
  const tomorrow = now.clone().add(1, 'day').format(FORMAT);
  if (state.prefetched === tomorrow) return;
  // `no-cache`: tomorrow's goals stay out of Apollo, so nothing on today's
  // screen is rewritten by them.
  const data = await read(DAILY_GOALS_QUERY, { date: tomorrow }, 'no-cache');
  if (data && Array.isArray(data.optimizedDailyGoals)) {
    saveHomeDay(email, tomorrow, { goals: data.optimizedDailyGoals });
    state.prefetched = tomorrow;
  }
}

/**
 * Read today's Home data from the server now. Concurrent calls share one run.
 * @returns {Promise<boolean|null>} true when it ran, null when it could not
 */
export function syncHome() {
  if (!state.client) return Promise.resolve(null);
  const email = state.getEmail();
  if (!email) return Promise.resolve(null);
  if (state.inFlight) return state.inFlight;

  // A tap is on the wire: never race it. Come back once it has settled.
  if (!pendingMutations.empty()) {
    if (!state.retry) {
      state.retry = setTimeout(() => {
        state.retry = null;
        syncHome();
      }, RETRY_MS);
    }
    return Promise.resolve(null);
  }

  const now = moment();
  const today = now.format(FORMAT);
  state.inFlight = Promise.all([
    read(ROUTINE_DATE_QUERY, { date: today }),
    read(DAILY_GOALS_QUERY, { date: today }),
    read(XP_BALANCE_QUERY, {}),
  ])
    .then(([routine, goals, xp]) => {
      if (routine && routine.routineDate) saveHomeDay(email, today, { routineDate: routine.routineDate });
      if (goals && Array.isArray(goals.optimizedDailyGoals)) {
        saveHomeDay(email, today, { goals: goals.optimizedDailyGoals });
      }
      if (xp && xp.xpBalance) saveHomeXp(email, xp.xpBalance);
      state.lastSync = Date.now();
      return prefetchTomorrow(email, now);
    })
    .then(() => true)
    .catch(() => null)
    .finally(() => {
      state.inFlight = null;
    });
  return state.inFlight;
}

/**
 * Start syncing. Idempotent: calling it again replaces the previous wiring.
 *
 * @param {Object}   client    the ApolloClient
 * @param {Object}   opts
 * @param {Function} opts.getEmail  the signed-in email, or '' when signed out
 */
export function startHomeSync(client, { getEmail } = {}) {
  // eslint-disable-next-line no-use-before-define
  stopHomeSync();
  state.client = client;
  state.getEmail = getEmail || (() => '');

  state.onWake = () => {
    if (!visible()) return;
    if (Date.now() - state.lastSync < RESUME_GAP_MS) return;
    syncHome();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', state.onWake);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', state.onWake);
    window.addEventListener('pageshow', state.onWake);
  }
  state.timer = setInterval(() => {
    if (visible()) syncHome();
  }, INTERVAL_MS);

  return syncHome();
}

export function stopHomeSync() {
  if (state.timer) clearInterval(state.timer);
  if (state.retry) clearTimeout(state.retry);
  if (state.onWake) {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', state.onWake);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', state.onWake);
      window.removeEventListener('pageshow', state.onWake);
    }
  }
  state.timer = null;
  state.retry = null;
  state.onWake = null;
  state.client = null;
  state.inFlight = null;
  state.lastSync = 0;
  state.prefetched = '';
}
