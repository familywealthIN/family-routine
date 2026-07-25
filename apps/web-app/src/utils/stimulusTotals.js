/**
 * Stimulus (D/K/G) totals for a routine day.
 *
 * Pure aggregation extracted from DashBoard's `countTotal` so the D/K/G summary
 * circles can live in their own container and the rule is unit-testable.
 *
 * D and K are the raw sum of each task's `earned`. G is period-scaled the same
 * way the dashboard always has: ×4 until the week settles, ×2 until the month,
 * ×1.334 until the year, then ×1 (thresholds from utils/getDates).
 */
import moment from 'moment';
import { threshold } from './getDates';

// Which week of the month a date falls in — verbatim from the old DashBoard
// module helper (its only consumer was the G scaling).
function weekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
  return (
    moment(d, 'DD-MM-YYYY').week()
    - moment(d, 'DD-MM-YYYY').startOf('month').week()
    + addFirstWeek
  );
}

/**
 * @param {Array} tasklist  the day's routine tasks (each with `stimuli`)
 * @param {string} name     'D' | 'K' | 'G'
 * @param {string} date     DD-MM-YYYY (only used for G period scaling)
 * @returns {number}
 */
export function stimulusTotal(tasklist, name, date) {
  const list = Array.isArray(tasklist) ? tasklist : [];
  const earned = list.reduce((sum, task) => {
    const s = task && task.stimuli && task.stimuli.find((st) => st.name === name);
    return sum + ((s && s.earned) || 0);
  }, 0);

  if (name !== 'G') return earned;

  // G period-scaling (inverse of the original nested guards).
  const m = moment(date, 'DD-MM-YYYY');
  if (m.weekday() < threshold.weekDays - 1) return earned * 4;
  if (weekOfMonth(date) < threshold.monthWeeks - 1) return earned * 2;
  if (m.month() < threshold.yearMonths - 1) return Number((earned * 1.334).toFixed(1));
  return earned;
}

export default { stimulusTotal };
