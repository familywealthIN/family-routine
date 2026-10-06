/**
 * The Progress screen's fixed vocabulary (packages/design/Progress.dc.html).
 *
 * The period switch, the two section scopes and the three "completed" rows are
 * the same four periods everywhere on the page, so they live here rather than
 * being re-typed in the organism, the container and the page.
 *
 * NOTE: the Routine Efficiency *formula* is deliberately NOT here. The server
 * owns the single definition of that metric and ships the wording next to the
 * number as the `efficiency` card's `description` (D-13,
 * apps/server/src/utils/getProgressReport.js `efficiencyFormula`). A copy of
 * the sentence in the UI layer would be exactly the second definition D-13
 * removed.
 */

/** Day · Week · Month · Year — the SlidingSwitch segments, in order. */
export const PROGRESS_PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export const PROGRESS_PERIOD_KEYS = PROGRESS_PERIODS.map((p) => p.key);

/**
 * What one figure on this page covers. `getProgressReport` divides both the
 * stimulus balance and the completion counts by the number of routine days in
 * the window, so a Day period is literally today and every longer period is a
 * per-day mean — the label has to say which.
 */
export const SCOPE_TODAY = 'TODAY';
export const SCOPE_AVG_PER_DAY = 'AVG PER DAY';

/** Year adds the milestone count, which is a year total rather than a mean. */
export const SCOPE_YEAR_SUFFIX = 'MILESTONES THIS YEAR';

export function periodScope(period) {
  return period === 'day' ? SCOPE_TODAY : SCOPE_AVG_PER_DAY;
}

/** "COMPLETED · {scope}" — the three progress bars' section label. */
export function completedScope(period) {
  if (period === 'year') return `${SCOPE_AVG_PER_DAY} · ${SCOPE_YEAR_SUFFIX}`;
  return periodScope(period);
}

/**
 * "BALANCE · {scope}" — the D/K/G trio's legend heading. The mock hardcodes
 * "AVG PER DAY", which is wrong on the Day period: with one routine day in the
 * window `getStimuli` divides by 1, so the number is today's, not a mean.
 */
export function balanceScope(period) {
  return periodScope(period);
}

/**
 * The three bars, in the design's order, mapped to the `task-activities` card's
 * rows. `match` is what the server names that row (`getTaskActivities`).
 */
export const COMPLETED_ROWS = [
  { key: 'routine-items', label: 'Routine items', icon: 'history', match: 'Routine Items' },
  { key: 'tasks', label: 'Tasks', icon: 'task_alt', match: 'Tasks' },
  { key: 'milestones', label: 'Milestones', icon: 'flag', match: 'Milestones' },
];

/** `getProgress` card slots this page reads. */
export const PROGRESS_CARDS = {
  efficiency: 'efficiency',
  balance: 'radar-chart',
  completed: 'task-activities',
  good: 'good',
  bad: 'bad',
};

/** Hero delta + row score colours (chassis palette). */
export const PROGRESS_COLORS = {
  primary: '#288bd5',
  up: '#2e7d32',
  down: '#d32f2f',
  attention: '#e68900',
  good: '#4CAF50',
};

export default {
  PROGRESS_PERIODS,
  PROGRESS_PERIOD_KEYS,
  SCOPE_TODAY,
  SCOPE_AVG_PER_DAY,
  SCOPE_YEAR_SUFFIX,
  PROGRESS_CARDS,
  PROGRESS_COLORS,
  COMPLETED_ROWS,
  periodScope,
  completedScope,
  balanceScope,
};
