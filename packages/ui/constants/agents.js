/**
 * Agents page presentation tokens (`packages/design/Agents.dc.html`, the `ST` /
 * `STEPS` / `STEP_OF` tables).
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is **not** a second agent stage list. `AGENT_STAGES` / `AGENT_LIVE_STAGES`
 * in `./routineFocus` own the stage list and the liveness rule, and
 * `molecules/StatusRing` reads them directly — including "the ring breathes only
 * while running or listening". Nothing here re-decides any of that.
 *
 * What this *is*: the copy and colours for an **Agent document's
 * `executionStatus`**, which is a different vocabulary from the Home badge's
 * stages:
 *
 *   executionStatus  idle · running · listening · finished · failed   (persisted)
 *   AGENT_STAGES     waiting · running · listening · firing · finished · failed
 *                                                            (day-scoped badge)
 *
 * `idle` has no badge stage (a badge only exists once something has happened),
 * and `waiting`/`firing` never reach the server. Where the two vocabularies
 * overlap the Agents page deliberately paints a different colour: the badge
 * ring shows `listening` amber because on Home it competes with a running
 * routine, while this page shows the design's blue because here the only
 * question is "is it live". Both are authored values, so the override is
 * explicit rather than derived.
 */

/** `executionStatus` -> label, glyph, colour, 10-12% tint, one-line explanation. */
export const AGENT_STATUS = {
  idle: {
    label: 'Idle',
    icon: 'pause',
    color: 'rgba(0,0,0,.55)',
    tint: 'rgba(0,0,0,.05)',
    desc: 'Waiting for the routine to start. Ticking the routine fires the start event.',
  },
  running: {
    label: 'Running',
    icon: 'bolt',
    color: '#1976d2',
    tint: 'rgba(25,118,210,.1)',
    desc: 'Start event sent. Waiting for a 200 response.',
  },
  listening: {
    label: 'Listening',
    icon: 'hearing',
    color: '#1976d2',
    tint: 'rgba(25,118,210,.1)',
    desc: 'Start returned 200. The end event fires when every task under the routine is ticked.',
  },
  finished: {
    label: 'Finished',
    icon: 'check',
    color: '#2e7d32',
    tint: 'rgba(76,175,80,.12)',
    desc: 'End event returned 200 and the result was saved to the goal item.',
  },
  failed: {
    label: 'Failed',
    icon: 'error_outline',
    color: '#d32f2f',
    tint: 'rgba(229,57,53,.1)',
    desc: 'An event returned a non-200 response. The routine tick still counts.',
  },
};

/**
 * An agent that has never run has no `executionStatus`, and the server is free
 * to grow the enum — both resolve to `idle` rather than rendering a blank ring.
 */
export function agentStatusKey(agent) {
  const raw = agent && agent.executionStatus;
  return AGENT_STATUS[raw] ? raw : 'idle';
}

export function agentStatusOf(agent) {
  return AGENT_STATUS[agentStatusKey(agent)];
}

/** The four-step strip, in order. */
export const AGENT_LIFECYCLE_STEPS = [
  { key: 'start', label: 'Start event', icon: 'bolt' },
  { key: 'running', label: 'Running', icon: 'autorenew' },
  { key: 'listening', label: 'Listening', icon: 'hearing' },
  { key: 'end', label: 'End event', icon: 'flag' },
];

/**
 * How far down the strip each status has got. `finished` is 4 — past the last
 * index, so every step reads complete. `failed` stops at 1 (Running), which is
 * where the failure is drawn.
 */
export const AGENT_STEP_OF = {
  idle: -1,
  running: 1,
  listening: 2,
  finished: 4,
  failed: 1,
};

const STEP = {
  done: '#4CAF50',
  current: '#1976d2',
  bad: '#e53935',
  badLabel: '#d32f2f',
  doneLabel: '#2e7d32',
  idleBg: 'rgba(0,0,0,.08)',
  idleFg: 'rgba(0,0,0,.4)',
  idleLabel: 'rgba(0,0,0,.45)',
};

/**
 * The lifecycle strip for one status.
 *
 * The failure override is the part that is easy to get wrong: on `failed` the
 * *Running* step is the step that broke, so it renders a red circle with a
 * `close` glyph — never a blue "in progress" spinner. It is also the current
 * step, so `bad` has to win over `current` for the colour, the glyph AND the
 * breathing (a failed agent is not still working).
 *
 * @param {string} status an `AGENT_STATUS` key
 * @returns {Array<{key,label,icon,bg,fg,labelColor,breathing}>}
 */
export function agentLifecycle(status) {
  const key = AGENT_STATUS[status] ? status : 'idle';
  const step = AGENT_STEP_OF[key];
  const failed = key === 'failed';
  return AGENT_LIFECYCLE_STEPS.map((def, index) => {
    const done = step > index;
    const current = step === index;
    const bad = failed && index === 1;
    let bg = STEP.idleBg;
    if (bad) bg = STEP.bad;
    else if (done) bg = STEP.done;
    else if (current) bg = STEP.current;
    let labelColor = STEP.idleLabel;
    if (bad) labelColor = STEP.badLabel;
    else if (current) labelColor = STEP.current;
    else if (done) labelColor = STEP.doneLabel;
    let { icon } = def;
    if (bad) icon = 'close';
    else if (done) icon = 'check';
    return {
      key: def.key,
      label: def.label,
      icon,
      bg,
      fg: done || current || bad ? '#fff' : STEP.idleFg,
      labelColor,
      breathing: current && !bad,
    };
  });
}

/** `0` runs is 0%, not NaN% — the design's `Math.max(1, runs)` denominator. */
export function successRate(ok, fail) {
  const good = Number(ok) || 0;
  const bad = Number(fail) || 0;
  return Math.round((good / Math.max(1, good + bad)) * 100);
}

/** Page-header totals: RUNS, SUCCESS %, LIVE NOW. */
export function agentTotals(agents) {
  const list = Array.isArray(agents) ? agents : [];
  let ok = 0;
  let fail = 0;
  let live = 0;
  list.forEach((agent) => {
    ok += Number(agent.successCount) || 0;
    fail += Number(agent.failureCount) || 0;
    const key = agentStatusKey(agent);
    if (key === 'running' || key === 'listening') live += 1;
  });
  return {
    count: list.length, runs: ok + fail, ok, fail, live, rate: successRate(ok, fail),
  };
}

/** The literal placeholder an event value carries. Never interpolated here. */
export const GOAL_ID_PLACEHOLDER = '{{ goal_id }}';

/** Event-kind switch segments — the URL / cURL toggle. */
export const AGENT_EVENT_KINDS = [
  { key: 'url', label: 'URL' },
  { key: 'curl', label: 'cURL' },
];

/** Shown in place of the END EVENT body when the agent has none. */
export const NO_END_EVENT_COPY = 'No end event — the agent finishes when the start returns 200.';

export default {
  AGENT_STATUS,
  AGENT_LIFECYCLE_STEPS,
  AGENT_STEP_OF,
  AGENT_EVENT_KINDS,
  GOAL_ID_PLACEHOLDER,
  NO_END_EVENT_COPY,
  agentStatusKey,
  agentStatusOf,
  agentLifecycle,
  agentTotals,
  successRate,
};
