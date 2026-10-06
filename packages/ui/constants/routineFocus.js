/**
 * Design tokens for the Routine Focus home screen (design_handoff_routine_focus).
 *
 * Colours, ring geometry and per-form-factor sizing live here rather than in
 * each organism so the phone, iPad mini and desktop shells cannot drift apart.
 * The agent colours deliberately match `CurrentTaskCard.vue`'s existing badge
 * palette — the redesign moves the agent lifecycle onto the tick button, it
 * does not restyle it.
 */

export const COLORS = {
  primary: '#288bd5',
  primaryDark: '#1f6fab',
  primaryTint: 'rgba(40,139,213,.12)',
  primaryTintSoft: 'rgba(40,139,213,.08)',
  now: '#FF9800',
  nowTint: 'rgba(255,152,0,.12)',
  done: '#4CAF50',
  appBg: '#f4f4f4',
  card: '#fff',
  subtle: '#f7f7f7',
  subtler: '#fafafa',
  routineBubble: '#f1f3f5',
  drawerHeader: '#f4f8fc',
  text: 'rgba(0,0,0,.87)',
  text54: 'rgba(0,0,0,.54)',
  text45: 'rgba(0,0,0,.45)',
  text38: 'rgba(0,0,0,.38)',
  divider: 'rgba(0,0,0,.06)',
  toast: '#1a1a1a',
};

/** D/K/G — Discipline, Kinetics, Geniuses. */
export const STIMULI = {
  D: {
    key: 'D', label: 'Discipline', color: '#4CAF50', tint: 'rgba(76,175,80,.12)', hint: 'showing up on time',
  },
  K: {
    key: 'K', label: 'Kinetics', color: '#E53935', tint: 'rgba(229,57,53,.12)', hint: 'movement and energy',
  },
  G: {
    key: 'G', label: 'Geniuses', color: '#2196F3', tint: 'rgba(33,150,243,.12)', hint: 'focused output',
  },
};

export const STIMULUS_ORDER = ['D', 'K', 'G'];

export function stimulusOf(name) {
  return STIMULI[name] || STIMULI.D;
}

/**
 * Agent lifecycle as rendered on the tick button — no text badge any more.
 * `firing` is the end-event stage: same colour family as `now`, faster rings.
 */
export const AGENT_STAGES = {
  waiting: {
    glyph: 'smart_toy', color: '#78909c', ringMs: 1800, breathe: true,
  },
  running: {
    glyph: 'smart_toy', color: '#1976d2', ringMs: 1800, breathe: true,
  },
  listening: {
    glyph: 'hearing', color: '#ffb300', ringMs: 2600, breathe: false,
  },
  firing: {
    glyph: 'bolt', color: '#FF9800', ringMs: 1000, breathe: true,
  },
  finished: {
    glyph: 'check', color: '#43a047', ringMs: 0, breathe: false,
  },
  failed: {
    glyph: '', color: '#e53935', ringMs: 0, breathe: false,
  },
};

/** Stages where the agent is still doing something — the ring must not be tapped. */
export const AGENT_LIVE_STAGES = ['waiting', 'running', 'listening', 'firing'];

export function agentStageOf(stage) {
  return AGENT_STAGES[stage] || null;
}

/**
 * Per-form-factor geometry. `ringSm` is the ticked state: the phone flies the
 * ring to the header (so it has no small ring in the card), while tablet and
 * desktop shrink it in place.
 *
 * `pad` is the card's OWN padding and is deliberately vertical-only; `padX` is
 * the horizontal inset, which `RoutineFocusCard` puts on an inner wrapper
 * instead. That split is not cosmetic. On tablet and desktop the card is a flex
 * item (`.rn-home__content > .rn-focus-card { flex: 3 1 0 }`), and a
 * `box-sizing: border-box` flex item's hypothetical main size cannot fall below
 * its own padding — so 40px of horizontal padding on the card itself made its
 * flex base size 40 rather than 0, the card took that 40px off the top, and the
 * 3:2 ratio then applied only to what was left (563.2/348.8 instead of
 * 547.2/364.8 at the 980px column). The design frames do the same thing: their
 * card div carries `flex:3 1 0` and no padding, with `padding:16px 20px 0` on an
 * inner child.
 *
 * `row`/`rowText` are the checklist row's min-height and body size, read
 * straight off the design frames: phone 42/15 (turn 5a) and tablet+desktop
 * 44/15 (turns 6a/6b). The rows were built at 56/17 and 50/16 — a whole step
 * too tall on every shell, which pushed the thread below the fold. `rowText`
 * is 15 on ALL THREE because the handoff gives tablet and desktop the same type
 * as each other, and the phone checklist happens to share it.
 *
 * `tabs` is the in-card period bar: 40 on the phone (5a), 46 on tablet and
 * desktop (6a/6b), which render the tabs inline rather than stacked.
 */
export const FOCUS_VARIANTS = {
  phone: {
    ring: 120, ringInset: 10, ringGlyph: 32, ringSm: 0, title: 19, titleSm: 19, row: 42, rowText: 15, tabs: 40, pad: '14px 0 16px', padX: 16,
  },
  tablet: {
    ring: 104, ringInset: 11, ringGlyph: 38, ringSm: 46, title: 26, titleSm: 20, row: 44, rowText: 15, tabs: 46, pad: '16px 0 0', padX: 20,
  },
  // Desktop deliberately mirrors tablet. The handoff says "iPad mini and desktop
  // share type sizes and the 60/40 split", and its desktop frame renders the SAME
  // `tbRingSize` tokens the tablet frame does. The mock also computes a larger
  // `lgRingSize`/`lgTitleSize` pair (132px ring, 32px title) that no markup ever
  // reads — dead scaffolding. Building desktop from those is what made the
  // desktop ring and headings oversized against the design.
  //
  // Desktop differs from tablet only OUTSIDE the card: a 264px sidebar instead of
  // a 76px rail, and the content column capped at DESKTOP_CONTENT_MAX.
  desktop: {
    ring: 104, ringInset: 11, ringGlyph: 38, ringSm: 46, title: 26, titleSm: 20, row: 44, rowText: 15, tabs: 46, pad: '16px 0 0', padX: 20,
  },
};

/**
 * The desktop content column. The handoff caps Home at 980px — narrower than the
 * 1040px the other eight screens use, because Home gives its width to the
 * checklist/chat split rather than to a single scrolling column.
 */
export const DESKTOP_CONTENT_MAX = 980;

export function focusVariant(name) {
  return FOCUS_VARIANTS[name] || FOCUS_VARIANTS.phone;
}

/** Bottom tabs = the goal cascade. */
export const PERIOD_TABS = [
  { key: 'day', label: 'Today', icon: 'today' },
  { key: 'week', label: 'Week', icon: 'view_week' },
  { key: 'month', label: 'Month', icon: 'calendar_month' },
  { key: 'year', label: 'Year', icon: 'event_repeat' },
];

/** Home nav — Home · Priority · Agents · Goals. */
export const FOCUS_NAV = [
  { icon: 'home', label: 'Home', route: '/home' },
  { icon: 'dashboard', label: 'Priority', route: '/priority' },
  { icon: 'smart_toy', label: 'Agents', route: '/agents' },
  { icon: 'assignment', label: 'Goals', route: '/goals' },
];

/** Cascade unit states, shared by the week/month/year grids. */
export const CASCADE_UNIT_STYLE = {
  done: { icon: 'check_circle', color: '#4CAF50', bg: 'transparent' },
  missed: { icon: 'cancel', color: 'rgba(229,57,53,.55)', bg: 'transparent' },
  active: { icon: 'radio_button_checked', color: '#FF9800', bg: 'rgba(255,152,0,.12)' },
  none: { icon: 'radio_button_unchecked', color: 'rgba(0,0,0,.25)', bg: 'transparent' },
};

export default {
  COLORS,
  STIMULI,
  STIMULUS_ORDER,
  stimulusOf,
  AGENT_STAGES,
  AGENT_LIVE_STAGES,
  agentStageOf,
  FOCUS_VARIANTS,
  focusVariant,
  DESKTOP_CONTENT_MAX,
  PERIOD_TABS,
  FOCUS_NAV,
  CASCADE_UNIT_STYLE,
};
