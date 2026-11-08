/**
 * Where a notification tap or button takes the app. Pure, so it is tested
 * without Capacitor. The server sends `data.route` (lifecycle notifications)
 * or `data.routineId` + `data.action` (routine cues, see
 * apps/cron/src/cue/routineActions.js); the categories below are the button
 * sets those cues ask for.
 *
 *   no AI / AI without context → Do now · Complete
 *   AI with an agent           → Start agent
 *   AI with context, no agent  → Build agent
 *
 * Exactly these, as planned in Asana "User Experience Notification". Every
 * button opens the app: iOS stops the app as soon as a background button is
 * tapped, so one meant to work without opening it (the old Snooze) could
 * be stopped before it did anything.
 */

export const CATEGORIES = {
  ROUTINE: 'ROUTINE_ACTIONS',
  AGENT_START: 'AGENT_START_ACTIONS',
  AGENT_BUILD: 'AGENT_BUILD_ACTIONS',
};

const button = (id, title) => ({
  id, title, foreground: true, destructive: false, requiresAuthentication: false,
});

export const ACTION_TYPES = [
  {
    id: CATEGORIES.ROUTINE,
    actions: [button('DO_NOW', 'Do now'), button('COMPLETE', 'Complete')],
  },
  {
    id: CATEGORIES.AGENT_START,
    actions: [button('START_AGENT', 'Start agent')],
  },
  {
    id: CATEGORIES.AGENT_BUILD,
    actions: [button('BUILD_AGENT', 'Build agent')],
  },
];

const KNOWN = Object.values(CATEGORIES);

/** The button set a notification should show when re-posted in foreground. */
export const actionTypeFor = (data = {}) => (KNOWN.includes(data.category) ? data.category : CATEGORIES.ROUTINE);

const BUTTON_ACTION = {
  DO_NOW: 'focus',
  MARK_DONE: 'complete',
  COMPLETE: 'complete',
  START_AGENT: 'start',
  BUILD_AGENT: 'build',
};

/**
 * The Android app draws routine cues itself (display=app, from
 * apps/android/.../RoutineNotification.java), since Android has no iOS-style
 * category; the web app must not post them a second time.
 */
export const isDrawnByApp = (data = {}) => data.display === 'app';

/**
 * Which action a tap was. iOS reports the button's id; the Android app's own
 * notification reports every tap as 'tap' and names the button in the data.
 */
export const buttonOf = (actionId, data = {}) => (actionId === 'tap' && data.button ? data.button : actionId);

/**
 * Route for a tap ('tap' = the notification body) or a button. Null for a
 * dismissal, and for buttons of older builds (Snooze, Skip) that no longer
 * exist — they never opened the app.
 */
export function routeFor(actionId, data = {}) {
  const routineId = data.routineId || data.taskId;
  const routine = (action) => (routineId ? `/home/${routineId}/${action}?src=push` : '/home');
  if (BUTTON_ACTION[actionId]) return routine(BUTTON_ACTION[actionId]);
  if (actionId === 'dismiss' || actionId === 'SNOOZE' || actionId === 'REMIND_LATER' || actionId === 'SKIP') return null;
  // Body tap: the server's route, else the routine's primary action, focused
  // only — a tap opens the routine; it never ticks or starts anything.
  if (data.route) return data.route;
  return routine('focus');
}
