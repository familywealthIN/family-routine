/**
 * tickTelemetry — Firebase Analytics events for every tick and late check-in,
 * so a tick that goes green and is never saved can be found afterwards.
 *
 * WHY
 * ---
 * On 25 Nov 2026 a routine went green on an iPhone at 8:52 and was never
 * saved: no tick reached the server, the routine was marked passed at 9:00,
 * and the evening took three taps and a 30-point late check-in. Nothing on
 * either side recorded the lost tap, so the cause could not be traced. Each
 * stage below is one event, and two detectors report the failure itself:
 *
 *   tick_tap        a tick / late check-in was asked for
 *   tick_dropped    it was turned away on this device, with the reason
 *   tick_sent       the mutation went on the wire
 *   tick_saved      the server confirmed it
 *   tick_failed     the server or the network refused it
 *   tick_hidden     the app went to the background with one still in flight
 *   tick_lost       the server's day still has the routine unticked well
 *                   after this device asked for the tick (saved or not)
 *   tick_reverted   a routine on screen went from ticked to unticked
 *
 * Every event carries `routine_id` (the day's routine document id, when
 * known), `task_id`, `date`, `kind` ('tick' | 'redeem'), `platform`, `online`
 * and `visible` — enough to find the exact document in Mongo. Never the
 * email or a routine's name: Firebase must not hold personal data.
 *
 * The ask is kept in localStorage per day, so a tick lost to an app that
 * iOS suspended or killed is still reported on the next open.
 */
import { Capacitor } from '@capacitor/core';
import analytics from './analytics';

const STORE_KEY = 'rn.tickIntents';
/** How long the server may take to show a tick before it counts as lost. */
export const LOST_AFTER_MS = 2 * 60 * 1000;
/** Intents older than this are forgotten, reported or not. */
const KEEP_MS = 36 * 60 * 60 * 1000;

const storage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (e) {
    return null;
  }
};

function readIntents() {
  const store = storage();
  if (!store) return {};
  try {
    const parsed = JSON.parse(store.getItem(STORE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function writeIntents(intents) {
  const store = storage();
  if (!store) return;
  const now = Date.now();
  const kept = {};
  Object.keys(intents).forEach((key) => {
    if (intents[key] && now - intents[key].at < KEEP_MS) kept[key] = intents[key];
  });
  try {
    store.setItem(STORE_KEY, JSON.stringify(kept));
  } catch (e) {
    // Storage full or blocked: the events still go out, only the next-open
    // lost-tick report is skipped.
  }
}

const intentKey = (date, taskId) => `${date}:${taskId}`;

function platform() {
  try {
    return Capacitor.getPlatform();
  } catch (e) {
    return 'web';
  }
}

function context() {
  return {
    platform: platform(),
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    visible: typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  };
}

function send(name, fields) {
  const params = { ...context() };
  Object.keys(fields || {}).forEach((key) => {
    const value = fields[key];
    if (value === undefined || value === null || value === '') return;
    params[key] = value;
  });
  try {
    analytics.trackEvent(name, params);
  } catch (e) {
    // Telemetry never breaks a tick.
  }
}

function base({
  kind = 'tick', taskId, date, routineId,
} = {}) {
  return {
    kind,
    task_id: taskId ? String(taskId) : undefined,
    date,
    routine_id: routineId && !String(routineId).startsWith('temp-') ? String(routineId) : undefined,
  };
}

/** A tick / late check-in was asked for. Starts the lost-tick watch. */
export function tickTapped(args = {}) {
  const intents = readIntents();
  const key = intentKey(args.date, args.taskId);
  intents[key] = {
    at: Date.now(), kind: args.kind || 'tick', saved: false, sent: false, reported: false,
  };
  writeIntents(intents);
  send('tick_tap', { ...base(args), placeholder: !!args.placeholder });
}

/** Turned away on this device. `reason` is a short code, e.g. 'pending'. */
export function tickDropped(args = {}) {
  const intents = readIntents();
  const key = intentKey(args.date, args.taskId);
  // A refusal the user was told about, or that is not a failure (already
  // ticked), is not a lost tick: forget the ask.
  if (intents[key] && !intents[key].sent) {
    delete intents[key];
    writeIntents(intents);
  }
  send('tick_dropped', { ...base(args), reason: args.reason, placeholder: !!args.placeholder });
}

/** The mutation is on the wire. */
export function tickSent(args = {}) {
  const intents = readIntents();
  const key = intentKey(args.date, args.taskId);
  if (!intents[key]) intents[key] = { at: Date.now(), kind: args.kind || 'tick', reported: false };
  intents[key].sent = true;
  intents[key].sentAt = Date.now();
  writeIntents(intents);
  send('tick_sent', base(args));
}

/** The server confirmed it. */
export function tickSaved(args = {}) {
  const intents = readIntents();
  const key = intentKey(args.date, args.taskId);
  const intent = intents[key];
  if (intent) {
    intent.saved = true;
    writeIntents(intents);
  }
  send('tick_saved', {
    ...base(args),
    ms: intent && intent.sentAt ? Date.now() - intent.sentAt : undefined,
  });
}

/** The server or the network refused it. The user is shown an error. */
export function tickFailed(args = {}) {
  const intents = readIntents();
  const key = intentKey(args.date, args.taskId);
  const intent = intents[key];
  if (intent) {
    delete intents[key];
    writeIntents(intents);
  }
  const message = args.error && (args.error.message || String(args.error));
  send('tick_failed', {
    ...base(args),
    error: message ? String(message).slice(0, 100) : 'unknown',
    ms: intent && intent.sentAt ? Date.now() - intent.sentAt : undefined,
  });
}

/**
 * The app is going to the background. A tick still unconfirmed now is the
 * one iOS may suspend mid-request — the suspected 25 Nov cause.
 */
export function appHidden({ date, routineId } = {}) {
  const intents = readIntents();
  Object.keys(intents).forEach((key) => {
    const intent = intents[key];
    if (!intent || intent.saved || !key.startsWith(`${date}:`)) return;
    send('tick_hidden', {
      ...base({
        kind: intent.kind, taskId: key.slice(date.length + 1), date, routineId,
      }),
      sent: !!intent.sent,
      age_s: Math.round((Date.now() - intent.at) / 1000),
    });
  });
}

/**
 * Compare the SERVER's day with what this device asked for. Called with every
 * server read of the day (never the placeholder): a routine ticked there
 * closes its ask; one still unticked `LOST_AFTER_MS` after the ask is
 * reported once as `tick_lost`.
 */
export function checkServerDay({
  date, routineId, tasklist, now = Date.now(),
} = {}) {
  if (!date || !Array.isArray(tasklist)) return;
  const intents = readIntents();
  let changed = false;
  tasklist.forEach((task) => {
    if (!task || !task.id) return;
    const key = intentKey(date, task.id);
    const intent = intents[key];
    if (!intent) return;
    if (task.ticked) {
      delete intents[key];
      changed = true;
      return;
    }
    if (intent.reported || now - intent.at < LOST_AFTER_MS) return;
    intent.reported = true;
    changed = true;
    send('tick_lost', {
      ...base({
        kind: intent.kind, taskId: task.id, date, routineId,
      }),
      sent: !!intent.sent,
      saved: !!intent.saved,
      passed: !!task.passed,
      age_s: Math.round((now - intent.at) / 1000),
    });
  });
  if (changed) writeIntents(intents);
}

/**
 * Watch the rows on screen: a routine that was ticked and now is not, on the
 * same day, is what the user sees as "it went green and then unticked".
 * Returns the next snapshot to pass back in. `prev` / `rows` are
 * `{ id, ticked }` lists; `fromPlaceholder` says the previous frame was the
 * placeholder (a device-local guess) rather than the server's day.
 */
export function watchRows({
  date, routineId, prev, rows, fromPlaceholder = false,
} = {}) {
  const next = { date, fromPlaceholder: !!fromPlaceholder, ticked: {} };
  (rows || []).forEach((row) => {
    if (row && row.id && row.ticked) next.ticked[row.id] = true;
  });
  if (!prev || prev.date !== date) return next;
  const intents = readIntents();
  (rows || []).forEach((row) => {
    if (!row || !row.id || row.ticked || !prev.ticked[row.id]) return;
    const intent = intents[intentKey(date, row.id)];
    send('tick_reverted', {
      ...base({
        kind: (intent && intent.kind) || 'tick', taskId: row.id, date, routineId,
      }),
      from_placeholder: !!prev.fromPlaceholder,
      had_ask: !!intent,
      sent: !!(intent && intent.sent),
      saved: !!(intent && intent.saved),
      age_s: intent ? Math.round((Date.now() - intent.at) / 1000) : undefined,
    });
  });
  return next;
}
