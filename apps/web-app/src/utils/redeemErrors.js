/**
 * Turn a redeem failure into something the user can act on.
 *
 * THE PROBLEM
 * -----------
 * `redeemRoutineItem` can refuse for six different reasons, and the dashboard
 * reported all of them as "Could not redeem this task. Please try again."
 * That is wrong twice over:
 *
 *   1. It names an action the user never pressed. Redeeming is what happens
 *      *underneath* "Start Agent" and underneath ticking a passed task's
 *      circle — nobody presses a button called "redeem".
 *   2. "Please try again" is advice that cannot work. Every one of these
 *      refusals is deterministic: retrying an out-of-window date, an
 *      already-checked task or a task that has not passed yet fails
 *      identically forever.
 *
 * So a user who pressed Start Agent on a day the server would not accept saw a
 * red toast about redeeming, retried, and got the same toast — with nothing
 * anywhere naming the real reason (the ±1 day integrity window).
 *
 * Insufficient points (402) is deliberately NOT handled here — the caller
 * intercepts it first and opens the paywall drawer instead of a toast.
 */

/** Reasons the server can refuse, most specific match first. */
const REASONS = [
  {
    // validateRedeem's day-integrity window: client date must be within ±1 day
    // of server-now in the user's timezone.
    match: (m) => m.includes('only available for today'),
    text: 'Points can only be spent on today\'s tasks. Open today to check this one off.',
  },
  {
    match: (m) => m.includes('Date does not match routine'),
    text: 'This task belongs to a different day. Reopen the day you want and try there.',
  },
  {
    match: (m) => m.includes('already checked'),
    text: 'This task is already checked off.',
  },
  {
    match: (m) => m.includes('has not passed yet'),
    text: 'This task has not passed yet — you can check it off directly, no points needed.',
  },
  {
    match: (m) => m.includes('Task not found') || m.includes('Routine not found'),
    text: 'That task is no longer on this day. Refresh and try again.',
  },
];

const GENERIC = 'Something went wrong on our side. Please try again.';

/**
 * @param {string} message              the raw GraphQL error message
 * @param {Object} [options]
 * @param {boolean} [options.startedAgent] true when the user pressed
 *   "Start Agent" rather than ticking the task
 * @returns {{ title: string, text: string }}
 */
export function describeRedeemFailure(message, { startedAgent = false } = {}) {
  const raw = String(message || '');
  const reason = REASONS.find((candidate) => candidate.match(raw));

  return {
    // Name the button the user actually pressed.
    title: startedAgent ? 'Could not start the agent' : 'Could not check off this task',
    text: reason ? reason.text : GENERIC,
  };
}

export default describeRedeemFailure;
