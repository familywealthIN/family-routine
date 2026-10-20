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
 */

export const CATEGORIES = {
  ROUTINE: 'ROUTINE_ACTIONS',
  AGENT_START: 'AGENT_START_ACTIONS',
  AGENT_BUILD: 'AGENT_BUILD_ACTIONS',
};

const button = (id, title, foreground = true) => ({
  id, title, foreground, destructive: false, requiresAuthentication: false,
});

export const ACTION_TYPES = [
  {
    id: CATEGORIES.ROUTINE,
    actions: [button('DO_NOW', 'Do now'), button('COMPLETE', 'Complete'), button('SNOOZE', 'Snooze 10 min', false)],
  },
  {
    id: CATEGORIES.AGENT_START,
    actions: [button('START_AGENT', 'Start agent'), button('SNOOZE', 'Snooze 10 min', false)],
  },
  {
    id: CATEGORIES.AGENT_BUILD,
    actions: [button('BUILD_AGENT', 'Build agent'), button('DO_NOW', 'Do now')],
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
 * Route for a tap ('tap' = the notification body) or a button. Null when the
 * action is handled without navigating (snooze, skip).
 */
export function routeFor(actionId, data = {}) {
  const routineId = data.routineId || data.taskId;
  const routine = (action) => (routineId ? `/home/${routineId}/${action}?src=push` : '/home');
  if (BUTTON_ACTION[actionId]) return routine(BUTTON_ACTION[actionId]);
  if (actionId === 'SNOOZE' || actionId === 'REMIND_LATER' || actionId === 'SKIP') return null;
  // Body tap: the server's route, else the routine's primary action, focused
  // only — a tap opens the routine; it never ticks or starts anything.
  if (data.route) return data.route;
  return routine('focus');
}
