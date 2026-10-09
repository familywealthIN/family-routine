/**
 * On time, late or missed: how each routine check-in landed against its window,
 * for every day of a range. The drawer's day ribbon and the Progress page's
 * Timing card both read this one summary.
 *
 * The states come from the flags the server already stamps on a day's tasks
 * (the same rule `routineInsight.dayStates` and D-02 use):
 *   ticked, not passed -> on time   (inside the window)
 *   ticked and passed  -> late      (a check-in after the window closed)
 *   passed, not ticked -> missed
 *   neither            -> pending   (the window is still ahead), except on a
 *                         day before `today`, which is over: missed.
 * A skipped day is a rest day: its tasks count for nothing.
 */
const moment = require('moment');
const { encryption } = require('./encryption');

const DATE_FORMAT = 'DD-MM-YYYY';
/** The widest range one read may ask for: a year, plus a leap day. */
const MAX_DAYS = 366;

/** Every DD-MM-YYYY date from `startDate` to `endDate`, inclusive and capped. */
function datesBetween(startDate, endDate) {
  const start = moment(startDate, DATE_FORMAT, true);
  const end = moment(endDate, DATE_FORMAT, true);
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return [];
  const dates = [];
  const cursor = start.clone();
  while (!cursor.isAfter(end, 'day') && dates.length < MAX_DAYS) {
    dates.push(cursor.format(DATE_FORMAT));
    cursor.add(1, 'day');
  }
  return dates;
}

function taskState(task, date, today) {
  if (task.ticked) return task.passed ? 'late' : 'onTime';
  if (task.passed) return 'missed';
  const day = moment(date, DATE_FORMAT);
  const now = today ? moment(today, DATE_FORMAT) : null;
  return now && now.isValid() && day.isBefore(now, 'day') ? 'missed' : 'pending';
}

const emptyCounts = () => ({
  onTime: 0, late: 0, missed: 0, pending: 0,
});

/**
 * @param {Object}   p
 * @param {Object[]} p.routines day routine documents, lean ({ date, skip, tasklist })
 * @param {string}   p.startDate DD-MM-YYYY
 * @param {string}   p.endDate   DD-MM-YYYY
 * @param {string}   [p.today]   the user's own today, so an unticked past day reads missed
 */
function summariseTiming({
  routines = [], startDate, endDate, today,
}) {
  const byDate = new Map(routines.map((r) => [r.date, r]));
  const totals = emptyCounts();
  const routineRows = new Map();

  const days = datesBetween(startDate, endDate).map((date) => {
    const routine = byDate.get(date);
    const counts = emptyCounts();
    if (!routine) return { date, skip: false, ...counts, slots: [] };
    if (routine.skip) return { date, skip: true, ...counts, slots: [] };

    const slots = (routine.tasklist || [])
      .slice()
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
      .map((task) => {
        const id = String(task._id || task.id || '');
        const name = encryption.decrypt(task.name || '') || 'Routine';
        const state = taskState(task, date, today);
        counts[state] += 1;
        totals[state] += 1;
        const row = routineRows.get(id) || {
          id, name, time: task.time || '', ...emptyCounts(),
        };
        // The newest day names the routine: a rename shows its current name.
        row.name = name;
        row.time = task.time || row.time;
        row[state] += 1;
        routineRows.set(id, row);
        return {
          id, name, time: task.time || '', state,
        };
      });
    return {
      date, skip: false, ...counts, slots,
    };
  });

  return {
    startDate,
    endDate,
    ...totals,
    days,
    routines: [...routineRows.values()]
      .sort((a, b) => String(a.time).localeCompare(String(b.time))),
  };
}

module.exports = {
  DATE_FORMAT, MAX_DAYS, datesBetween, taskState, summariseTiming,
};
