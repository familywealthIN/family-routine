/**
 * Routine-task display helpers — the single source of truth for how a routine
 * task renders: button icon/color/disabled, redeemability, goal-item counts,
 * and per-period goal filtering.
 *
 * Extracted from DashBoard so the dashboard containers (via the data provider)
 * and the page's own orchestration (tick/redeem/quick-goal) share identical
 * logic, and so the rules are unit-testable in isolation.
 *
 * Every function is PURE: the component state it needs (isTodaySelected,
 * xpBalance) is passed in as an argument — nothing reads from a Vue instance.
 */

/**
 * A passed, unticked task on TODAY's routine can be rescued with points.
 * Past dates stay locked (crossed button) — redemption is today-only.
 */
export function isRedeemable(task, isTodaySelected) {
  return !!task && task.passed && !task.ticked && !task.redeemed && !!isTodaySelected;
}

/**
 * Frozen redemption price (snapshotted when the task passed); falls back to
 * live points for tasks passed before the snapshot deploy.
 */
export function getRedeemCost(task) {
  if (!task) return 0;
  return typeof task.passedPoints === 'number' ? task.passedPoints : (task.points || 0);
}

/**
 * Turn a rejected redeem into a toast that names the button the user pressed
 * and the reason the server gave.
 *
 * A late check-in is reached from two very different controls — the task's own
 * check button and "Start agent" — so a single "Could not redeem this task"
 * left the user unable to tell what had failed. The server's ApiError arrives
 * as "<status>:<reason>" inside error.message; match on the reason, which is
 * unambiguous, rather than the status digits (a task id can contain those).
 *
 * 402 is deliberately absent: an unaffordable check-in opens the paywall
 * drawer instead of a toast.
 */
export function describeRedeemFailure(message, { startingAgent = false } = {}) {
  const reason = String(message || '');
  const title = startingAgent ? "Couldn't start the agent" : "Couldn't complete this task";

  let text = 'Something went wrong. Please try again.';
  if (reason.includes('Redemption is only available for today')
    || reason.includes('Date does not match routine')) {
    text = "A late check-in only works on today's routine. Move to today and try again.";
  } else if (reason.includes('Task is already checked')) {
    text = 'This task is already checked off for today.';
  } else if (reason.includes('Task has not passed yet')) {
    text = "This task hasn't passed yet — check it off the usual way.";
  } else if (reason.includes('Routine not found') || reason.includes('Task not found')) {
    text = "This task is no longer on today's routine. Refresh and try again.";
  }

  return { title, text };
}

export function canAffordRedeem(task, xpBalance) {
  // Balance still loading / entitled — let the flow proceed; the server's 402
  // check remains the authoritative backstop.
  if (!xpBalance) return true;
  if (xpBalance.entitled) return true;
  return xpBalance.available >= getRedeemCost(task);
}

/** Button color for the current-task card (redeemable = white diamond). */
export function getCurrentButtonColor(task, isTodaySelected) {
  if (!task) return '';
  if (task.ticked) return 'success';
  if (task.passed) return isRedeemable(task, isTodaySelected) ? 'white' : 'error';
  return '';
}

export function getButtonIcon(task, isTodaySelected) {
  if (task) {
    // Redeemed ticks resume the normal check icon.
    if (task.ticked) return 'check';
    if (task.passed && !task.ticked) return isRedeemable(task, isTodaySelected) ? 'diamond' : 'close';
    if (!task.passed && !task.ticked && !task.wait) return 'alarm';
  }
  return 'more_horiz';
}

export function getButtonDisabled(task, isTodaySelected) {
  if (!task) return false;
  // Redeemable-passed tasks keep an enabled (diamond) button.
  if (isRedeemable(task, isTodaySelected)) return false;
  if (!task.ticked && (task.passed || task.wait)) return true;
  return false;
}

export function getTaskStatus(task) {
  if (!task) return 'pending';
  if (task.ticked) return 'completed';
  if (task.passed) return 'passed';
  if (task.wait) return 'waiting';
  return 'pending';
}

/**
 * Goal items for a task within a period, regrouped as
 * { id, period, date, goalItems }. Pure over the goals list passed in.
 */
export function filterTaskGoalsPeriod(id, goals, period) {
  const out = [];
  if (Array.isArray(goals)) {
    goals.forEach((goal) => {
      if (goal && goal.period === period) {
        const items = (goal.goalItems || []).filter((gi) => gi.taskRef === id);
        if (items.length) {
          out.push({
            id: goal.id, period: goal.period, date: goal.date, goalItems: items,
          });
        }
      }
    });
  }
  return out;
}

/** K-earned as a percentage of the task's points (the progress ring value). */
export function countTaskPercentage(task) {
  if (!task || !Array.isArray(task.stimuli)) return 0;
  const k = task.stimuli.find((st) => st.name === 'K');
  if (!k) return 0;
  const pct = 100 * (k.earned / task.points);
  return Number.isNaN(pct) ? 0 : pct;
}

/** Completed goal-item count (K earned scaled by the D:K split rate). */
export function countTaskCompleted(task) {
  if (!task || !task.id || !Array.isArray(task.stimuli)) return 0;
  const d = task.stimuli.find((st) => st.name === 'D');
  const k = task.stimuli.find((st) => st.name === 'K');
  if (!d || !k) return 0;
  const count = Number((d.splitRate / k.splitRate).toFixed(0));
  const completed = Number((count * (Number(k.earned) / Number(task.points))).toFixed(0));
  return Number.isNaN(completed) ? 0 : completed;
}

/** Total goal-item slots for the task (the D:K split count). */
export function countTaskTotal(task) {
  if (!task || !task.id || !Array.isArray(task.stimuli)) return 0;
  const d = task.stimuli.find((st) => st.name === 'D');
  const k = task.stimuli.find((st) => st.name === 'K');
  if (!d || !k) return 0;
  return Number((d.splitRate / k.splitRate).toFixed(0));
}
