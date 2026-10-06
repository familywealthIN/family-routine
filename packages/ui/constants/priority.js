/**
 * Design tokens for the Priority page (packages/design/Priority.dc.html).
 *
 * The four quadrants, their chips and the tile ring geometry live here so the
 * 2x2 map (phone), the four simultaneous quadrant cards (tablet/desktop), the
 * triage buttons and the move picker cannot drift apart — every one of them
 * draws the same four colours, icons and verbs.
 *
 * Pure data. The `priority:<key>` tag that *stores* the quadrant is a web-app
 * concern (`utils/taskPriority`, `utils/priorityBoard`); nothing here reads it.
 */

/** Reading order is the Eisenhower grid: urgent -> not urgent, important -> not. */
export const QUADRANTS = [
  {
    key: 'do',
    label: 'DO',
    title: 'Do now',
    sub: 'Important + Urgent',
    verb: 'Do it today',
    color: '#F44336',
    tint: 'rgba(244,67,54,.08)',
    icon: 'bolt',
  },
  {
    key: 'plan',
    label: 'PLAN',
    title: 'Plan',
    sub: 'Important + Not urgent',
    verb: 'Schedule a slot',
    color: '#1976D2',
    tint: 'rgba(25,118,210,.08)',
    icon: 'event',
  },
  {
    key: 'delegate',
    label: 'DELEGATE',
    title: 'Delegate',
    sub: 'Not important + Urgent',
    verb: 'Hand to someone or an agent',
    color: '#E68900',
    tint: 'rgba(255,152,0,.1)',
    icon: 'smart_toy',
  },
  {
    key: 'automate',
    label: 'AUTOMATE',
    title: 'Automate',
    sub: 'Not important + Not urgent',
    verb: 'Make it a routine',
    color: '#616161',
    tint: 'rgba(0,0,0,.05)',
    icon: 'autorenew',
  },
];

export const QUADRANT_KEYS = QUADRANTS.map((q) => q.key);

/** The phone map opens on DO — the quadrant the day is actually lived in. */
export const DEFAULT_QUADRANT = 'do';

const BY_KEY = QUADRANTS.reduce((acc, q) => Object.assign(acc, { [q.key]: q }), {});

export function quadrantOf(key) {
  return BY_KEY[key] || null;
}

/**
 * AUTOMATE's `#616161` disappears against the toast's `#1a1a1a`, so the toast
 * icon uses a lighter grey — same swap the design makes.
 */
export function quadrantToastColor(key) {
  return key === 'automate' ? '#bdbdbd' : (BY_KEY[key] && BY_KEY[key].color) || '#288bd5';
}

/**
 * The done-ring on a quadrant tile — 26px rendered in a 48-unit box, r19,
 * dasharray 119.4 (chassis.md § Rings). The tablet/desktop card draws the same
 * ring one size up.
 */
export const TILE_RING = {
  size: 26, cardSize: 30, viewBox: 48, r: 19, stroke: 6, track: 'rgba(0,0,0,.08)',
};

/**
 * DELEGATE's three-state chip. `''` draws no chip at all — an item with no
 * routine task has nothing to attach an agent to.
 *
 * `running` is deliberately not clickable: a run in flight has no second
 * gesture, and the 8px `rn-pulse` dot is the whole affordance.
 */
export const DELEGATE_CHIP = {
  ready: {
    icon: 'smart_toy',
    label: 'Hand to agent',
    bg: '#fff',
    color: '#E68900',
    border: 'rgba(255,152,0,.5)',
    pulse: false,
    clickable: true,
  },
  running: {
    icon: 'smart_toy',
    label: 'Agent running…',
    bg: 'rgba(25,118,210,.08)',
    color: '#1976d2',
    border: 'rgba(25,118,210,.3)',
    pulse: true,
    clickable: false,
  },
  done: {
    icon: 'receipt_long',
    label: 'Agent done · View result',
    bg: 'rgba(76,175,80,.1)',
    color: '#2e7d32',
    border: 'rgba(76,175,80,.35)',
    pulse: false,
    clickable: true,
  },
};

/** AUTOMATE's two-state chip. The rule is appended by the row. */
export const AUTOMATE_CHIP = {
  ready: {
    icon: 'autorenew',
    label: 'Make it a routine',
    bg: '#fff',
    color: '#424242',
    border: 'rgba(0,0,0,.2)',
    pulse: false,
    clickable: true,
  },
  done: {
    icon: 'check_circle',
    label: 'Routine task',
    bg: 'rgba(0,0,0,.04)',
    color: 'rgba(0,0,0,.6)',
    border: 'rgba(0,0,0,.12)',
    pulse: false,
    clickable: false,
  },
};

/**
 * Routines recur daily — the RoutineItem schema carries a `time`, not a
 * recurrence rule — so "Make it a routine" can only ever promise this cadence.
 * The design's per-item "every Friday" / "every 3 days" has nowhere to live yet.
 */
export const ROUTINE_RULE = 'every day';

/**
 * Which chip (if any) a row carries, and what pressing it means. Pure function
 * of the row, so the list molecule and its tests agree by construction.
 *
 * @returns {{ type: string, label: string } & Object | null}
 */
export function chipFor(item) {
  if (!item) return null;
  if (item.quadrant === 'delegate') {
    const state = item.agentState;
    if (!state) return null;
    const chip = DELEGATE_CHIP[state];
    if (!chip) return null;
    const type = state === 'done' ? 'view-result' : 'hand-to-agent';
    return { ...chip, type: chip.clickable ? type : 'none' };
  }
  if (item.quadrant === 'automate') {
    // A finished item has nothing left to automate — the design drops the chip.
    if (item.isComplete) return null;
    const chip = item.automated ? AUTOMATE_CHIP.done : AUTOMATE_CHIP.ready;
    const rule = item.rule || ROUTINE_RULE;
    return {
      ...chip,
      label: `${chip.label} · ${rule}`,
      type: chip.clickable ? 'automate' : 'none',
    };
  }
  return null;
}

export default {
  QUADRANTS,
  QUADRANT_KEYS,
  DEFAULT_QUADRANT,
  quadrantOf,
  quadrantToastColor,
  TILE_RING,
  DELEGATE_CHIP,
  AUTOMATE_CHIP,
  ROUTINE_RULE,
  chipFor,
};
