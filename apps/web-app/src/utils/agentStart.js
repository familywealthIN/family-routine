/**
 * agentStart — queue a routine task's agent behind the goal item it needs.
 *
 * THE PROBLEM
 * -----------
 * An agent's start event carries `{{goal_id}}`, substituted at dispatch time
 * with the first day-goal attached to the routine task. Ticking the routine
 * circle and creating/ticking that goal item are separate requests, and a quick
 * user beats both: the tick resolves while the goal item is still an optimistic
 * `temp-*` record that no server has ever seen.
 *
 * The old rule was `if (goalId && !goalId.startsWith('temp-')) fire()` — so in
 * exactly that case the agent silently did not run, with nothing on screen to
 * say why. Firing anyway is worse: the event would point at an id that does not
 * exist.
 *
 * THE RULE
 * --------
 * Wait, and say so. The badge shows "Agent waiting" until the real id exists
 * *and* nothing is still in flight, then the dispatch proceeds normally. If the
 * id never arrives the badge is retired rather than left hanging.
 *
 * Written against an injected set of dependencies rather than `this` so the
 * behaviour is testable without mounting the dashboard.
 */

/** An optimistic id Apollo minted locally — useless to an agent. */
export const isTempId = (id) => !!id && String(id).startsWith('temp-');

/**
 * Resolve as soon as `read()` returns a truthy value, or with '' at the
 * deadline.
 *
 * Polling rather than watching: the goal id can land through several unrelated
 * paths (the goals query resolving, an addGoalItem mutation confirming, another
 * container writing the cache), and a poll over the derived value covers all of
 * them without subscribing to each.
 *
 * @param {Function} read        () => value | falsy
 * @param {Object}   opts
 * @param {number}   opts.timeoutMs
 * @param {number}   opts.intervalMs
 * @param {Function} opts.now        injectable clock, for tests
 * @param {Function} opts.schedule   injectable setTimeout, for tests
 */
export function pollForValue(read, {
  timeoutMs = 20000,
  intervalMs = 250,
  now = () => Date.now(),
  schedule = (fn, ms) => setTimeout(fn, ms),
} = {}) {
  const deadline = now() + timeoutMs;
  return new Promise((resolve) => {
    const tick = () => {
      let value;
      try {
        value = read();
      } catch (e) {
        value = null;
      }
      if (value) { resolve(value); return; }
      if (now() >= deadline) { resolve(''); return; }
      schedule(tick, intervalMs);
    };
    tick();
  });
}

/**
 * Start a task's agent, waiting for its goal item if necessary.
 *
 * @param {Object}   deps
 * @param {string}   deps.taskRef
 * @param {Object}   deps.agent        the configured agent, or null
 * @param {Function} deps.readGoalId   () => current goal id (may be temp/null)
 * @param {Function} deps.isSettled    () => true when nothing is in flight
 * @param {Function} deps.setStatus    (taskRef, status) => void
 * @param {Function} deps.clearStatus  (taskRef) => void
 * @param {Function} deps.fire         ({ goalId, implicit }) => Promise
 * @param {Function} [deps.notify]     ({ title, text }) => void, timeout only
 * @param {boolean}  [deps.implicit]   true when the user ticked rather than
 *                                     pressing Start Agent
 * @param {Object}   [deps.pollOptions] forwarded to pollForValue
 * @returns {Promise<'no-agent'|'fired'|'timeout'>} what happened, for tests
 */
export async function startAgentWhenReady({
  taskRef,
  agent,
  readGoalId,
  isSettled = () => true,
  setStatus,
  clearStatus,
  fire,
  notify,
  implicit = true,
  pollOptions,
} = {}) {
  if (!taskRef) return 'no-agent';
  // Nothing to wait for when this task has no start event configured — do not
  // show a waiting badge for an agent that does not exist.
  if (!agent || !agent.startEvent || !agent.startEvent.value) return 'no-agent';

  const ready = () => {
    const id = readGoalId();
    if (!id || isTempId(id)) return null;
    // "Wait until all loading is done": a real id whose creating mutation is
    // still settling can still be rolled back underneath us.
    return isSettled() ? id : null;
  };

  let goalId = ready();

  if (!goalId) {
    // Shown for implicit fires too — the whole point is to explain the pause.
    // The dispatch replaces this badge the moment it runs.
    if (setStatus) setStatus(taskRef, 'waiting');
    goalId = await pollForValue(ready, pollOptions);

    if (!goalId) {
      if (clearStatus) clearStatus(taskRef);
      if (!implicit && notify) {
        notify({
          title: 'Agent not started',
          text: "This task's goal item hasn't saved yet. Try starting the agent again in a moment.",
        });
      }
      return 'timeout';
    }
  }

  if (fire) await fire({ goalId, implicit });
  return 'fired';
}

export default startAgentWhenReady;
