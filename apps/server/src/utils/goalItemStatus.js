/**
 * goalItemStatus — decide whether a completed day goal item is `done` or `missed`.
 *
 * Pure so the rule is testable in isolation, because it was wrong in two ways
 * that only show up with real data:
 *
 *  1. The old code took the next task in the list as the window's end. When two
 *     routine tasks share a start time (this account has `Wake Up` and
 *     `Morning movement` both at 06:00) the earlier one's window is ZERO minutes
 *     wide, so *every* completion of it graded `missed` — including a tick at
 *     exactly 06:00:00. The window must run to the next DISTINCT time.
 *
 *  2. It compared `moment(task.time,'HH:mm')` — which resolves in the SERVER's
 *     timezone — against an absolute `completedAt`. On Lambda (UTC) with an IST
 *     user that is a 5h30m error in the grading window, in both directions.
 *     Grade in the user's own zone; it is already stored on UserItem.timezone
 *     and already kept fresh by the TimezoneSync component.
 *
 * Ticking BEFORE the slot opens stays `done` — doing something early is not a
 * miss, and that matched the previous behaviour.
 */

const { getLocalTime, getLocalDate } = require('./timezone');

const MINUTES_IN_DAY = 24 * 60;

/** 'HH:mm' -> minutes since local midnight. NaN-safe. */
function toMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * End of `tasklist[index]`'s window: the next start time that DIFFERS from its
 * own. Tasks sharing a start time share the whole window. Returns end-of-day
 * for the last distinct slot.
 *
 * `tasklist` must already be time-sorted (callers use utils/sortTimes).
 */
function windowEndMinutes(tasklist, index) {
  const own = tasklist[index] && tasklist[index].time;
  if (own == null) return MINUTES_IN_DAY;
  for (let i = index + 1; i < tasklist.length; i += 1) {
    if (tasklist[i] && tasklist[i].time !== own) {
      const m = toMinutes(tasklist[i].time);
      if (m != null) return m;
    }
  }
  return MINUTES_IN_DAY;
}

/**
 * @param {Object}   p
 * @param {Array}    p.tasklist      time-sorted routine tasks ({ _id, time })
 * @param {string}   p.taskRef       routine task the goal item belongs to
 * @param {Date}     p.completedAt   absolute completion instant
 * @param {string}   [p.timezone]    IANA zone or legacy offset; defaults handled
 *                                   by utils/timezone
 * @param {string}   [p.routineDate] DD-MM-YYYY the goal item belongs to
 * @returns {'done'|'missed'}
 */
function deriveGoalItemStatus({
  tasklist, taskRef, completedAt, timezone, routineDate,
}) {
  if (!completedAt) return 'done';
  if (!Array.isArray(tasklist) || !tasklist.length || !taskRef) return 'done';

  const index = tasklist.findIndex(
    // eslint-disable-next-line no-underscore-dangle
    (t) => t && String(t._id || t.id) === String(taskRef),
  );
  if (index === -1) return 'done';

  const startMin = toMinutes(tasklist[index].time);
  if (startMin == null) return 'done';
  const endMin = windowEndMinutes(tasklist, index);

  // A completion on a later local day is late no matter the clock time; on an
  // earlier one it is planning ahead, which is not a miss.
  if (routineDate) {
    const localDate = getLocalDate(timezone, completedAt);
    if (localDate !== routineDate) {
      const [dd, mm, yy] = routineDate.split('-').map(Number);
      const [ld, lm, ly] = localDate.split('-').map(Number);
      const target = Date.UTC(yy, mm - 1, dd);
      const actual = Date.UTC(ly, lm - 1, ld);
      return actual > target ? 'missed' : 'done';
    }
  }

  const completedMin = toMinutes(getLocalTime(timezone, completedAt));
  if (completedMin == null) return 'done';

  // Early is fine; inside the window is fine; after it closes is a miss.
  return completedMin >= endMin ? 'missed' : 'done';
}

module.exports = { deriveGoalItemStatus, windowEndMinutes, toMinutes };
