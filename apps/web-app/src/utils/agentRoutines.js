/**
 * Joining agents to their routines — the one piece of shaping all three Agents
 * containers need, so it lives in one tested module instead of three copies.
 *
 * An Agent stores a `taskRef` (a RoutineItem id). Every surface on the page
 * shows the routine's time and name instead, and the New/Edit form needs the
 * routines that are still FREE — the server has a one-agent-per-routine unique
 * index (`addAgent` turns an 11000 into "An agent already exists for this
 * routine"), so offering a taken routine offers a save that cannot succeed.
 */

/** `[{id,name,time}]` -> `{ [id]: item }`. */
export function indexRoutines(routineItems) {
  const index = {};
  (Array.isArray(routineItems) ? routineItems : []).forEach((item) => {
    if (item && item.id) index[item.id] = item;
  });
  return index;
}

/**
 * Agents with `routineTime` / `routineName` attached, de-duped by id.
 *
 * De-duping is ARCHITECTURE.md §3.6: a repeated id becomes a repeated `:key`
 * and Vue then patches one card unreliably (this is what produced the
 * double agent badge on Home). Containers hand organisms de-duped lists.
 */
export function joinAgentRoutines(agents, routineItems) {
  const index = indexRoutines(routineItems);
  const seen = new Set();
  const out = [];
  (Array.isArray(agents) ? agents : []).forEach((agent) => {
    if (!agent || !agent.id || seen.has(agent.id)) return;
    seen.add(agent.id);
    const routine = index[agent.taskRef];
    out.push({
      ...agent,
      routineTime: (routine && routine.time) || '',
      // Falling back to the raw ref is deliberate: a routine deleted out from
      // under its agent must still render a row the user can delete.
      routineName: (routine && routine.name) || agent.taskRef || '',
    });
  });
  return out;
}

/**
 * Routine options for the form.
 *
 * @param {Array} routineItems  every routine
 * @param {Array} agents        every agent (to find the taken routines)
 * @param {string} [keepForId]  the agent being edited — its own routine is not
 *                              "taken" from its point of view
 */
export function routineOptionsFor(routineItems, agents, keepForId = '') {
  const taken = new Set(
    (Array.isArray(agents) ? agents : [])
      .filter((agent) => agent && agent.taskRef && agent.id !== keepForId)
      .map((agent) => agent.taskRef),
  );
  return (Array.isArray(routineItems) ? routineItems : [])
    .filter((item) => item && item.id && !taken.has(item.id))
    .map((item) => ({
      value: item.id,
      time: item.time || '',
      name: item.name || item.id,
      label: item.time ? `${item.time} — ${item.name}` : item.name,
    }));
}

export default { indexRoutines, joinAgentRoutines, routineOptionsFor };
