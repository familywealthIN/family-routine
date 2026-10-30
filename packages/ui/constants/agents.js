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
 * `stalled` is a sixth status here that the server never stores: it is the
 * run-level verdict `agentStore.isStalled` reaches — an end event that was due
 * and never completed — attached to the document as `stalled` by the container
 * that reads the store (D-13). Everything downstream then treats it as a
 * status, so the list pill, the lifecycle strip and LIVE NOW agree.
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
  stalled: {
    label: 'Stalled',
    icon: 'warning',
    color: '#ef6c00',
    tint: 'rgba(239,108,0,.1)',
    desc: 'The end event was due but never completed. Retry it, or cancel the run.',
  },
};

/** A timestamp as GraphQL hands it over: ms-epoch string, ISO string or Date. */
const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const raw = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
};

/**
 * Whether the agent's last recorded run happened on `now`'s local calendar day.
 * A status is only ever about today's trigger: a run that was listening (or
 * finished, or failed) yesterday is history, not state.
 */
export function ranToday(agent, now = undefined) {
  const at = toDate(agent && agent.lastRunAt);
  if (!at) return false;
  const ref = now === undefined ? new Date() : toDate(now);
  if (!ref) return false;
  return at.getFullYear() === ref.getFullYear()
    && at.getMonth() === ref.getMonth()
    && at.getDate() === ref.getDate();
}

/**
 * How long an end event that is DUE may take before its run counts as stalled.
 *
 * It is NOT "how long a run may listen": a run legitimately listens from its
 * start trigger until the routine's slot counter fills, which is hours. The
 * clock starts the moment the end rule is first due (`markEndEventDue`), so
 * nothing healthy is ever judged by it. The slowest end dispatch in the beta
 * run was 10.4s; three minutes is an order of magnitude of headroom and still
 * inside the session that produced it.
 */
export const AGENT_STALL_MS = 3 * 60 * 1000;

/**
 * An agent that has never run has no `executionStatus`, and the server is free
 * to grow the enum — both resolve to `idle` rather than rendering a blank ring.
 * So does any status whose run was not TODAY: a new day starts every agent idle
 * (the persisted `executionStatus` is never reset server-side at midnight).
 *
 * A `listening` run the store has judged stalled reads `stalled` instead, so it
 * stops counting as live (D-13). Only `listening` can stall: every other status
 * is either in flight or terminal.
 */
export function agentStatusKey(agent, now = undefined) {
  const raw = agent && agent.executionStatus;
  if (!AGENT_STATUS[raw]) return 'idle';
  if (raw !== 'idle' && !ranToday(agent, now)) return 'idle';
  if (raw === 'listening' && agent.stalled) return 'stalled';
  return raw;
}

export function agentStatusOf(agent, now = undefined) {
  return AGENT_STATUS[agentStatusKey(agent, now)];
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
  stalled: 2,
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
 * Which step a status broke on, and how that step is drawn. `failed` broke on
 * *Running*; a stalled run got as far as *Listening* and stopped there, which
 * is amber rather than red — nothing returned an error, the end event simply
 * never completed.
 */
const BAD_STEP = {
  failed: {
    index: 1, bg: STEP.bad, labelColor: STEP.badLabel, icon: 'close',
  },
  stalled: {
    index: 2, bg: AGENT_STATUS.stalled.color, labelColor: AGENT_STATUS.stalled.color, icon: 'priority_high',
  },
};

/**
 * The lifecycle strip for one status.
 *
 * The failure override is the part that is easy to get wrong: on `failed` the
 * *Running* step is the step that broke, so it renders a red circle with a
 * `close` glyph — never a blue "in progress" spinner. It is also the current
 * step, so `bad` has to win over `current` for the colour, the glyph AND the
 * breathing (a failed agent is not still working, and neither is a stalled one).
 *
 * @param {string} status an `AGENT_STATUS` key
 * @returns {Array<{key,label,icon,bg,fg,labelColor,breathing}>}
 */
export function agentLifecycle(status) {
  const key = AGENT_STATUS[status] ? status : 'idle';
  const step = AGENT_STEP_OF[key];
  const badStep = BAD_STEP[key];
  return AGENT_LIFECYCLE_STEPS.map((def, index) => {
    const done = step > index;
    const current = step === index;
    const bad = !!badStep && badStep.index === index;
    let bg = STEP.idleBg;
    if (bad) bg = badStep.bg;
    else if (done) bg = STEP.done;
    else if (current) bg = STEP.current;
    let labelColor = STEP.idleLabel;
    if (bad) labelColor = badStep.labelColor;
    else if (current) labelColor = STEP.current;
    else if (done) labelColor = STEP.doneLabel;
    let { icon } = def;
    if (bad) icon = badStep.icon;
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
export function agentTotals(agents, now = undefined) {
  const list = Array.isArray(agents) ? agents : [];
  let ok = 0;
  let fail = 0;
  let live = 0;
  list.forEach((agent) => {
    ok += Number(agent.successCount) || 0;
    fail += Number(agent.failureCount) || 0;
    const key = agentStatusKey(agent, now);
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
  AGENT_STALL_MS,
  AGENT_EVENT_KINDS,
  GOAL_ID_PLACEHOLDER,
  NO_END_EVENT_COPY,
  agentStatusKey,
  agentStatusOf,
  agentLifecycle,
  agentTotals,
  ranToday,
  successRate,
};
