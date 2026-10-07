/**
 * agentPointsGuard — refuse an agent its routine could never finish.
 *
 * The end event fires when the SLOT counter fills, and `countTaskCompleted`
 * scales `K.earned` by the routine's own points — so a 0-point routine reads
 * 0 slots for ever and strands its agent in `listening` (D-03).
 *
 * 0 points is legacy data: `assertMinPoints` (apps/server/src/resolvers/
 * routineItem.js) refuses anything below 1 but grandfathers a stored 0.
 *
 * Every path that can start an agent must ask this first — the Routine Focus
 * page's tick/redeem/Start Agent paths AND the Start sheet's typed-task path
 * (QuickGoalCreationContainer), which fires the start event itself. One owner
 * for the rule and its copy, so the two paths cannot drift again.
 *
 * The message goes through `$notify`, the app's one notification system
 * (deliberate departure #2), and names the repair rather than just the failure.
 *
 * @param {Function} notify  the component's `$notify`
 * @param {Object}   task    the routine task (needs `points`)
 * @returns {boolean} true when the start was refused
 */
export default function refuseAgentWithoutPoints(notify, task) {
  if (!task || Number(task.points) > 0) return false;
  notify({
    title: 'This routine is worth 0 points',
    text: 'An agent here could never finish — it waits on points the routine '
      + 'cannot earn. Give it at least 1 point in Routines, then start the agent.',
    group: 'notify',
    type: 'warning',
    duration: 5000,
  });
  return true;
}
