/**
 * The 24-hour day dial and the timeline it shares its data with.
 *
 * Both the dial and the list on the Routines screen are derived from ONE thing:
 * the routine list sorted by start time. That is why saving re-sorts the
 * timeline and redraws the dial in the same gesture — they are the same
 * derivation rendered twice. So the derivation lives here, as pure functions, and
 * the organism only maps it onto SVG and DOM.
 *
 * Geometry (packages/design/Routines.dc.html):
 *
 *   viewBox 0 0 240 240, centre (120,120), track r=96 stroke 18.
 *   pt(min, r): angle = (min / 1440) * 2PI - PI/2
 *              x = 120 + r*cos(angle), y = 120 + r*sin(angle)
 *
 * So minute 0 sits at 12 o'clock and the day runs CLOCKWISE — the `- PI/2`
 * rotates SVG's 3-o'clock zero up to the top, and SVG's y axis points down,
 * which is what turns an anticlockwise maths circle into a clockwise clock.
 * Every arc therefore uses sweep-flag 1.
 *
 * A routine's arc runs from its own start to the NEXT routine's start, because a
 * routine owns the day until the next one begins — that is the same window the
 * server slices into D/K stimulus slots (utils/routineSlotCounts.js). The last
 * routine of the day runs to `DAY_END` (23:00) rather than midnight, matching the
 * design: the final hour is wind-down, not a routine.
 *
 * The mock also computes a `ticks` getter at radius 112 that nothing reads — the
 * 0/6/12/18 labels are hardcoded `<text>` nodes. It is dead scaffolding and is
 * deliberately not ported (docs/redesign/chassis.md § "Things the mocks get
 * wrong on purpose").
 */

/** Minutes in a day. The dial's full turn. */
export const MINUTES_PER_DAY = 1440;

/** Where the last routine's arc stops: 23:00. */
export const DAY_END = 23 * 60;

/** The time stepper's increment, and the rounding the gap row's label uses. */
export const TIME_STEP = 10;

/** Points are 1..50 per routine. 0 would be a routine that is not worth ticking. */
export const POINTS_MIN = 1;
export const POINTS_MAX = 50;

/** A gap this long or longer offers an inline "+ Add routine" row. */
export const GAP_ROW_MIN = 180;

/** Dial geometry. One object so the organism never re-types a magic number. */
export const DIAL = {
  viewBox: 240,
  centre: 120,
  radius: 96,
  trackWidth: 18,
  trackColor: 'rgba(0,0,0,.05)',
  arcWidth: 18,
  arcWidthSelected: 24,
  /** 3 minutes of blank at each end of an arc, so neighbours read as separate. */
  arcGap: 3,
  /** Never shorter than this, or a back-to-back pair would vanish. */
  arcMin: 4,
  /** Past this many minutes an SVG arc needs the large-arc flag. */
  largeArcOver: 720,
  nowInnerRadius: 80,
  nowOuterRadius: 110,
  nowWidth: 3,
  nowDotRadius: 4,
  colorNow: '#FF9800',
  colorIdle: '#288bd5',
  /** A non-selected arc fades back once something else is selected. */
  dimmedOpacity: 0.35,
};

/** Per-shell dial box and the inset the centre text sits in. */
export const DIAL_SIZES = {
  phone: { size: 240, inset: 52 },
  tablet: { size: 300, inset: 66 },
  desktop: { size: 360, inset: 79 },
};

export function dialSize(shell) {
  return DIAL_SIZES[shell] || DIAL_SIZES.phone;
}

/** The four hardcoded hour labels, at the viewBox edge. */
export const DIAL_TICKS = [
  { label: '0', x: 120, y: 8 },
  { label: '6', x: 232, y: 120 },
  { label: '12', x: 120, y: 232 },
  { label: '18', x: 8, y: 120 },
];

/**
 * "HH:mm" -> minutes since midnight. Anything unparseable is 0, not NaN: a NaN
 * would propagate into every arc path and blank the whole dial.
 *
 * @param {string} time
 * @returns {number}
 */
export function toMinutes(time) {
  const parts = String(time == null ? '' : time).split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const h = Number.isFinite(hours) ? hours : 0;
  const m = Number.isFinite(minutes) ? minutes : 0;
  return h * 60 + m;
}

/**
 * Minutes -> "HH:mm", wrapped into the day so a stepper can run off either end.
 *
 * @param {number} minutes
 * @returns {string}
 */
export function fromMinutes(minutes) {
  const n = Number.isFinite(Number(minutes)) ? Number(minutes) : 0;
  const wrapped = ((Math.round(n) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * "1h 30m" / "45m" / "2h". Negative spans read "0m" rather than "-1h": the last
 * routine of the day is measured against 23:00, so one started at 23:30 has no
 * window left and should say so instead of printing a negative duration.
 *
 * @param {number} minutes
 * @returns {string}
 */
export function durationLabel(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "3 routines" / "1 routine". */
export function countLabel(n) {
  const count = Number(n) || 0;
  return `${count} ${count === 1 ? 'routine' : 'routines'}`;
}

/** "+10 pts" / "+1 pt". */
export function pointsLabel(n) {
  const count = Number(n) || 0;
  return `+${count} ${count === 1 ? 'pt' : 'pts'}`;
}

/** "3 steps" / "1 step". */
export function stepsLabel(n) {
  const count = Number(n) || 0;
  return `${count} ${count === 1 ? 'step' : 'steps'}`;
}

/**
 * A point on the dial. Minute 0 is 12 o'clock; time runs clockwise.
 *
 * @param {number} minutes
 * @param {number} radius
 * @returns {{x: number, y: number}}
 */
export function polarPoint(minutes, radius) {
  const angle = ((Number(minutes) || 0) / MINUTES_PER_DAY) * 2 * Math.PI - Math.PI / 2;
  return {
    x: DIAL.centre + radius * Math.cos(angle),
    y: DIAL.centre + radius * Math.sin(angle),
  };
}

/** Two decimals, the way the design file writes its path data. */
const fixed = (n) => n.toFixed(2);

/**
 * An SVG arc from minute `a` to minute `b` at `radius`, always clockwise.
 *
 * @param {number} a - start minute
 * @param {number} b - end minute
 * @param {number} [radius]
 * @returns {string} the `d` attribute
 */
export function arcPath(a, b, radius = DIAL.radius) {
  const from = polarPoint(a, radius);
  const to = polarPoint(b, radius);
  const largeArc = b - a > DIAL.largeArcOver ? 1 : 0;
  return `M ${fixed(from.x)} ${fixed(from.y)} A ${radius} ${radius} 0 ${largeArc} 1 ${fixed(to.x)} ${fixed(to.y)}`;
}

/**
 * The routine list in schedule order, de-duplicated by id.
 *
 * De-duping is not defensive tidiness: a routine item's `_id` is reused across
 * days, and a duplicate id means a duplicate `:key`, which makes Vue render one
 * entity twice and patch it unreliably (ARCHITECTURE.md §3.6 — this is what
 * produced the overlapping agent badges).
 *
 * @param {Array} items
 * @returns {Array} a new array; the inputs are untouched
 */
export function sortByTime(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter((item) => {
      if (!item) return false;
      const id = item.id == null ? '' : String(item.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice()
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/**
 * Where a routine's window ends: the next routine's start, or 23:00 for the last.
 *
 * @param {Array} sorted - already schedule-ordered
 * @param {number} index
 * @returns {number} minutes
 */
export function windowEnd(sorted, index) {
  const next = sorted[index + 1];
  return next ? toMinutes(next.time) : DAY_END;
}

/**
 * Which routine contains `now`, or -1. Last match wins, so overlapping starts
 * resolve to the later routine — the one the user is actually in.
 *
 * @param {Array} sorted
 * @param {number} now - minutes since midnight
 * @returns {number} index or -1
 */
export function currentIndex(sorted, now) {
  const at = Number(now);
  if (!Number.isFinite(at)) return -1;
  return sorted.reduce((found, item, i) => {
    const start = toMinutes(item.time);
    return at >= start && at < windowEnd(sorted, i) ? i : found;
  }, -1);
}

/**
 * The gap row's suggested start: the midpoint of the gap, rounded to 10 minutes.
 *
 * @param {number} start - the routine's own start, in minutes
 * @param {number} gap - minutes to the next start
 * @returns {number} minutes
 */
export function gapMidpoint(start, gap) {
  return start + Math.round(gap / 2 / TIME_STEP) * TIME_STEP;
}

/**
 * One arc per routine, ready to bind straight onto `<path>`.
 *
 * @param {Array} sorted
 * @param {Object} [opts]
 * @param {number} [opts.now] - minutes; paints the containing arc orange
 * @param {string} [opts.selectedId] - thickens that arc and dims the others
 * @returns {Array<{id,d,color,width,opacity,selected}>}
 */
export function buildArcs(sorted, { now = null, selectedId = '' } = {}) {
  const current = currentIndex(sorted, now);
  return sorted.map((item, i) => {
    const start = toMinutes(item.time);
    const a = start + DIAL.arcGap;
    const b = Math.max(a + DIAL.arcMin, windowEnd(sorted, i) - DIAL.arcGap);
    const selected = !!selectedId && String(item.id) === String(selectedId);
    return {
      id: String(item.id),
      d: arcPath(a, b),
      color: i === current ? DIAL.colorNow : DIAL.colorIdle,
      width: selected ? DIAL.arcWidthSelected : DIAL.arcWidth,
      opacity: selectedId && !selected ? DIAL.dimmedOpacity : 1,
      selected,
    };
  });
}

/**
 * The NOW marker: a radial tick with a dot on its outer end.
 *
 * @param {number} now - minutes
 * @returns {{x1,y1,x2,y2}}
 */
export function buildNowMarker(now) {
  const inner = polarPoint(now, DIAL.nowInnerRadius);
  const outer = polarPoint(now, DIAL.nowOuterRadius);
  return {
    x1: inner.x.toFixed(1),
    y1: inner.y.toFixed(1),
    x2: outer.x.toFixed(1),
    y2: outer.y.toFixed(1),
  };
}

/**
 * One timeline row per routine, plus the inline "+ Add routine" affordance on any
 * gap of 3 hours or more.
 *
 * @param {Array} sorted
 * @param {Object} [opts]
 * @param {number} [opts.now]
 * @param {string} [opts.selectedId]
 * @param {string} [opts.flashId] - the just-saved row, which tints once
 * @returns {Array}
 */
export function buildRows(sorted, { now = null, selectedId = '', flashId = '' } = {}) {
  const current = currentIndex(sorted, now);
  const last = sorted.length - 1;
  return sorted.map((item, i) => {
    const start = toMinutes(item.time);
    const end = windowEnd(sorted, i);
    const gap = end - start;
    const isNow = i === current;
    const steps = (item.steps || []).length;
    return {
      id: String(item.id),
      name: item.name || '',
      time: fromMinutes(start),
      end: fromMinutes(end),
      duration: durationLabel(gap),
      points: Number(item.points) || 0,
      steps,
      stepsLabel: stepsLabel(steps),
      tags: item.tags || [],
      isNow,
      isFirst: i === 0,
      isLast: i === last,
      selected: !!selectedId && String(item.id) === String(selectedId),
      flash: !!flashId && String(item.id) === String(flashId),
      /** A long empty stretch is the one place a new routine is worth offering. */
      hasGap: gap >= GAP_ROW_MIN,
      gapAt: fromMinutes(gapMidpoint(start, gap)),
      gapAtMinutes: gapMidpoint(start, gap),
      gapLabel: durationLabel(gap),
    };
  });
}

/** Points earned if every routine is ticked. */
export function totalPoints(items) {
  return (Array.isArray(items) ? items : [])
    .reduce((sum, item) => sum + (Number(item && item.points) || 0), 0);
}

/**
 * What the dial's centre says. Two states: the day's total, or the selection.
 *
 * @param {Array} sorted
 * @param {Object} [opts]
 * @param {number} [opts.now]
 * @param {string} [opts.selectedId]
 * @returns {{over: string, overColor: string, title: string, sub: string}}
 */
export function centreContent(sorted, { now = null, selectedId = '' } = {}) {
  const total = totalPoints(sorted);
  const index = sorted.findIndex((item) => !!selectedId && String(item.id) === String(selectedId));
  if (index < 0) {
    const current = currentIndex(sorted, now);
    return {
      over: 'TODAY',
      overColor: 'rgba(0,0,0,.45)',
      title: `${total} points`,
      sub: current >= 0 ? `Now: ${sorted[current].name || ''}` : countLabel(sorted.length),
    };
  }
  const item = sorted[index];
  const steps = (item.steps || []).length;
  return {
    over: `${fromMinutes(toMinutes(item.time))} – ${fromMinutes(windowEnd(sorted, index))}`,
    overColor: DIAL.colorIdle,
    title: item.name || '',
    sub: `${pointsLabel(item.points)} · ${stepsLabel(steps)}`,
  };
}

/**
 * The next start strictly after `minutes`, ignoring one id (the routine being
 * edited, which is moving). 23:00 when nothing follows.
 *
 * @param {number} minutes
 * @param {Array} items - any order
 * @param {string} [excludeId]
 * @returns {number} minutes
 */
export function nextStartAfter(minutes, items, excludeId = '') {
  const at = Number(minutes) || 0;
  const later = (Array.isArray(items) ? items : [])
    .filter((item) => item && (!excludeId || String(item.id) !== String(excludeId)))
    .map((item) => toMinutes(item.time))
    .filter((start) => start > at)
    .sort((a, b) => a - b);
  return later.length ? later[0] : DAY_END;
}

/** The id the draft takes when the routine being edited is a new one. */
const DRAFT_ID = '__draft__';

/**
 * The STARTS AT caption: "Until 09:00 · 1h 30m".
 *
 * It reads the SAME window the timeline row and the dial arc print —
 * `windowEnd` over the schedule with the draft's time applied — not "the next
 * strictly later start". The two disagree when routines share a start time: the
 * schedule order gives the earlier-listed one a 0m window (which is also how the
 * server slices D/K slots, routineSlotCounts.js), whereas a strictly-later
 * lookup skipped the tie and let the editor say "Until 06:15" for a row the
 * timeline printed as "06:00 – 06:00 · 0m" (E2E BUG-8).
 *
 * The edited routine keeps its own place in the list (`sortByTime` is stable),
 * so with its time untouched the caption equals its row exactly. A new routine
 * goes after every routine already at its time.
 *
 * @param {string|number} time - "HH:mm" or minutes
 * @param {Array} items
 * @param {string} [excludeId] - the routine being edited, which is moving
 * @returns {string}
 */
export function untilCaption(time, items, excludeId = '') {
  const start = typeof time === 'number' ? time : toMinutes(time);
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  const self = { id: excludeId ? String(excludeId) : DRAFT_ID, time: fromMinutes(start) };
  const index = excludeId ? list.findIndex((item) => String(item.id) === String(excludeId)) : -1;
  const withDraft = index >= 0
    ? list.map((item, i) => (i === index ? self : item))
    : [...list, self];
  const sorted = sortByTime(withDraft);
  const next = windowEnd(sorted, sorted.indexOf(self));
  return `Until ${fromMinutes(next)} · ${durationLabel(next - start)}`;
}

/**
 * Step the start time by whole 10-minute increments, wrapping through midnight.
 *
 * @param {string|number} time
 * @param {number} steps - how many increments; negative steps back
 * @returns {string} "HH:mm"
 */
export function stepTime(time, steps = 1) {
  const start = typeof time === 'number' ? time : toMinutes(time);
  return fromMinutes(start + steps * TIME_STEP);
}

/**
 * Points, clamped into 1..50. A non-number falls back to the floor rather than
 * to NaN, which would be saved and then fail the server's Int validation.
 *
 * @param {*} points
 * @returns {number}
 */
export function clampPoints(points) {
  const n = Math.round(Number(points));
  if (!Number.isFinite(n)) return POINTS_MIN;
  return Math.min(POINTS_MAX, Math.max(POINTS_MIN, n));
}

/**
 * The second half of the points rule, and the older one: a whole DAY is worth
 * 100 points across EVERY routine. The 1..50 clamp above only bounds one
 * routine; without this, ten routines at 50 make a 500-point day.
 *
 * It matters because the XP ledger settles against these values — the budget is
 * what keeps a point worth a point.
 */
export const DAILY_POINTS_BUDGET = 100;

/**
 * How much of the day's budget is unspent, seen from the routine being edited.
 *
 * The edited routine's own points are ADDED BACK, because they are already in
 * the total: without that, re-opening a 30-point routine would see only 70 left
 * and then refuse to save it back at the 30 it already had. A new routine
 * (`editingId` '') has nothing to add back and spends from what is left.
 *
 * @param {Array} routines - every routine, the edited one included
 * @param {string} [editingId]
 * @returns {number} 0 when spent, negative when the stored day is already over
 */
export function remainingPoints(routines, editingId = '') {
  const list = Array.isArray(routines) ? routines : [];
  const editing = editingId
    ? list.find((item) => item && String(item.id) === String(editingId))
    : null;
  // `> 0 ? … : 0` in the original: a stored 0 or a negative adds nothing back.
  const own = Math.max(0, Number(editing && editing.points) || 0);
  return DAILY_POINTS_BUDGET - (totalPoints(list) - own);
}

/**
 * The ceiling one routine's stepper actually stops at — the per-routine cap AND
 * what the day has left, whichever binds first.
 *
 * It is returned raw when the budget is spent (0, or negative), NOT floored at
 * POINTS_MIN, so a caller can tell "exhausted" from "one point left" and say so
 * instead of clamping to a value the user never chose.
 *
 * @param {Array} routines
 * @param {string} [editingId]
 * @returns {number}
 */
export function maxPointsFor(routines, editingId = '') {
  return Math.min(POINTS_MAX, remainingPoints(routines, editingId));
}

/**
 * Swap a step with its neighbour. Out of range is a no-op that returns the SAME
 * array reference, so a caller can tell "nothing moved" without comparing
 * contents — which is what keeps the ↑ on the first row from flashing it.
 *
 * @param {Array} steps
 * @param {number} index
 * @param {number} direction - -1 up, +1 down
 * @returns {Array}
 */
export function moveStep(steps, index, direction) {
  const list = Array.isArray(steps) ? steps : [];
  const to = index + direction;
  if (index < 0 || index >= list.length) return list;
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  next[index] = list[to];
  next[to] = list[index];
  return next;
}

export default {
  MINUTES_PER_DAY,
  DAY_END,
  TIME_STEP,
  POINTS_MIN,
  POINTS_MAX,
  DAILY_POINTS_BUDGET,
  GAP_ROW_MIN,
  DIAL,
  DIAL_SIZES,
  DIAL_TICKS,
  dialSize,
  toMinutes,
  fromMinutes,
  durationLabel,
  countLabel,
  pointsLabel,
  stepsLabel,
  polarPoint,
  arcPath,
  sortByTime,
  windowEnd,
  currentIndex,
  gapMidpoint,
  buildArcs,
  buildNowMarker,
  buildRows,
  totalPoints,
  centreContent,
  nextStartAfter,
  untilCaption,
  stepTime,
  clampPoints,
  remainingPoints,
  maxPointsFor,
  moveStep,
};
