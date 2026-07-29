/**
 * goalRefScope — client-side scoping for `goalsByGoalRef`.
 *
 * The server used to filter `goalItems` down to the requested goalRef. It can't:
 * those Goal ids are the same ids `optimizedDailyGoals` / `agendaGoals` return,
 * so Apollo normalizes them into the SAME entity and a filtered list REPLACED
 * the real one — a 14-item day goal collapsed to 2 and the dashboard rendered
 * "No goal or activity logged." until the next refetch (or forever, if the app
 * was closed while the truncated slice was in the cache).
 *
 * So the server now returns the complete list and the scoping happens here, in
 * each smart query's `update()`. `update()` only shapes what the component
 * sees — Apollo has already written the full, correct response to the cache —
 * which is exactly the separation we want.
 */

/**
 * Keep only the goal items belonging to `goalRef`, dropping Goals left empty.
 *
 * @param {Array}  goals    raw `data.goalsByGoalRef`
 * @param {string} goalRef  the parent goal item id being scoped to
 * @returns {Array} same Goal shape, `goalItems` narrowed to `goalRef`
 */
export function scopeGoalsToRef(goals, goalRef) {
  if (!Array.isArray(goals) || !goalRef) return [];
  return goals
    .map((goal) => ({
      ...goal,
      goalItems: (goal.goalItems || []).filter((item) => item && item.goalRef === goalRef),
    }))
    .filter((goal) => goal.goalItems.length > 0);
}

export default scopeGoalsToRef;
