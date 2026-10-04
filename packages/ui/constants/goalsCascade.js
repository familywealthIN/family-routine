/**
 * The Goals screen's fixed vocabulary (packages/design/Goals.dc.html).
 *
 * The cascade ladder, its roll-up thresholds, the two ring geometries and the
 * Done/Active chips are the same five periods everywhere on the page, so they
 * live here instead of being re-typed in the organism, the container, the model
 * and the page.
 *
 * THE THRESHOLDS ARE NOT REDECLARED. `utils/getDates.threshold` is already the
 * server's `autoCheckThreshold` (week 5 days, month 3 weeks, year 6 months) and
 * the mock's `TH = { week: 5, month: 3, year: 6 }` is the same table under
 * another name — docs/redesign/chassis.md § "The goal cascade" says not to
 * re-derive it per page, so `CASCADE_TH` is a view onto the one constant.
 */
import { threshold } from '../utils/getDates';

/**
 * Period keys are the SERVER's period names, not the design's tab labels: the
 * last step is `lifetime` (what `Goal.period` holds) shown as "Life". One
 * vocabulary means no tab-key-to-period mapping to get wrong.
 */
export const DAY = 'day';
export const WEEK = 'week';
export const MONTH = 'month';
export const YEAR = 'year';
export const LIFETIME = 'lifetime';

/** How many of the level below auto-tick this level. One source: `threshold`. */
export const CASCADE_TH = {
  [WEEK]: threshold.weekDays,
  [MONTH]: threshold.monthWeeks,
  [YEAR]: threshold.yearMonths,
};

/** What one step counts, for a bar label and a blocked-tick toast. */
export const CASCADE_UNIT = {
  [WEEK]: 'days',
  [MONTH]: 'weeks',
  [YEAR]: 'months',
};

/**
 * The ladder, in order. `th` is the chip drawn BETWEEN this step and the next
 * one, so it is the NEXT level's threshold — and Year→Life carries none,
 * because a lifetime goal is ticked by hand.
 */
export const CASCADE_TABS = [
  { key: DAY, label: 'Today', icon: 'today' },
  { key: WEEK, label: 'Week', icon: 'view_week' },
  { key: MONTH, label: 'Month', icon: 'calendar_month' },
  { key: YEAR, label: 'Year', icon: 'event_repeat' },
  { key: LIFETIME, label: 'Life', icon: 'all_inclusive' },
];

export const CASCADE_KEYS = CASCADE_TABS.map((tab) => tab.key);

/** `×5` / `×3` / `×6` — the chip between two steps. Empty after Year. */
export function thresholdChip(key) {
  const next = CASCADE_KEYS[CASCADE_KEYS.indexOf(key) + 1];
  return CASCADE_TH[next] ? `×${CASCADE_TH[next]}` : '';
}

/** "Add day goal" / "Add lifetime goal" — the list's trailing row. */
export function addLabelFor(key) {
  return `Add ${key === LIFETIME ? 'lifetime' : key} goal`;
}

/** The new-goal sheet's period chips. "Today" becomes "Day" in the form. */
export const PERIOD_CHIPS = CASCADE_TABS.map((tab) => ({
  key: tab.key,
  label: tab.key === DAY ? 'Day' : tab.label,
}));

export const PERIOD_PLACEHOLDER = {
  [DAY]: 'e.g. Write release notes',
  [WEEK]: 'e.g. Beta feedback triage',
  [MONTH]: 'e.g. Retention push',
  [YEAR]: 'e.g. Learn Spanish to B1',
  [LIFETIME]: 'e.g. Run a marathon',
};

/** `Done` / `Active`. `Inactive` is Year Goals' only — chassis.md § cascade. */
export const GOAL_STATUS = {
  done: { label: 'Done', color: '#4CAF50', bg: 'rgba(76,175,80,.12)' },
  active: { label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)' },
};

export function statusChip(done) {
  return done ? GOAL_STATUS.done : GOAL_STATUS.active;
}

/** The chassis ring table, the two rows this page draws. */
export const LADDER_RING = {
  size: 44, viewBox: 48, r: 20, stroke: 4,
};
export const CALENDAR_RING = {
  size: 34, viewBox: 48, r: 21, stroke: 3,
};
/** The year row's ring: 46px in a 96 box, stroke 11 (dasharray 251.3). */
export const YEAR_ROW_RING = {
  size: 46, viewBox: 96, r: 40, stroke: 11,
};

export const RING_DONE = '#4CAF50';
export const RING_NOW = '#FF9800';
export const RING_DEFAULT = '#288bd5';

/** The bucket every goal with no routine (or a deleted one) falls into. */
export const NO_ROUTINE = { id: 'none', time: '—', name: 'No routine' };

/** `S M T W T F S`, Sunday-first — the calendar's column heads. */
export const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The rule line under the ladder. A `{...}` token is filled by the model, which
 * is the only place that knows the selected date.
 */
export const CASCADE_RULES = {
  [DAY]: `Day goals count toward this week’s goal for the same routine (${CASCADE_TH[WEEK]} days auto-tick it).`,
  [WEEK]: `{window}. A week goal auto-ticks after ${CASCADE_TH[WEEK]} day goals.`,
  [MONTH]: `{window}. A month goal auto-ticks after ${CASCADE_TH[MONTH]} week goals.`,
  [YEAR]: `{window}. A year goal auto-ticks after ${CASCADE_TH[YEAR]} month goals. Tap one to open it.`,
  [LIFETIME]: 'Lifetime goals have no date. Year goals link up into them; tick them by hand.',
};

export default {
  CASCADE_TABS,
  CASCADE_KEYS,
  CASCADE_TH,
  CASCADE_UNIT,
  CASCADE_RULES,
  PERIOD_CHIPS,
  PERIOD_PLACEHOLDER,
  GOAL_STATUS,
  LADDER_RING,
  CALENDAR_RING,
  YEAR_ROW_RING,
  NO_ROUTINE,
  DOW_LABELS,
  addLabelFor,
  statusChip,
  thresholdChip,
};
