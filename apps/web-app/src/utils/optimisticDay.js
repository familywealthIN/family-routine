/**
 * optimisticDay — draw a day before the server has answered for it.
 *
 * Two placeholders, both built from what this device already has
 * (utils/homeSnapshot.js) and both replaced the moment `routineDate` arrives:
 *
 *   - the day itself, as last read: `withClockFlags` brings its passed / wait
 *     flags up to the clock, the way the pass/wait sweep is about to;
 *   - a day never read on this device (the first open of a day): the routine
 *     template, started clean exactly as the server starts a new day
 *     (resetDayState: nothing ticked, passed or redeemed, nothing earned).
 *
 * Neither carries a document id, so nothing can be written against them.
 */
import moment from 'moment';
import { TIMES_UP_TIME, PROACTIVE_START_TIME } from '../constants/settings';

const FORMAT = 'DD-MM-YYYY';

function minutesUntil(time, date, now) {
  return moment(`${date} ${time}`, `${FORMAT} HH:mm`).diff(moment(now), 'minutes', true);
}

/**
 * passed / wait as the clock says, for today. The same thresholds as
 * routinePassWaitMixin: passed once TIMES_UP_TIME minutes are gone, no longer
 * waiting within PROACTIVE_START_TIME minutes of the start. Only forward: a
 * passed task stays passed, and a ticked one is left exactly as it is.
 */
export function withClockFlags(routine, date, now) {
  if (!routine || !Array.isArray(routine.tasklist)) return routine;
  return {
    ...routine,
    tasklist: routine.tasklist.map((task) => {
      if (!task || task.ticked || !task.time) return task;
      const minutes = minutesUntil(task.time, date, now);
      return {
        ...task,
        passed: !!task.passed || minutes < -TIMES_UP_TIME,
        wait: !!task.wait && minutes >= PROACTIVE_START_TIME,
      };
    }),
  };
}

/**
 * A new day, from the routine template.
 *
 * @param {Array}  template  homeSnapshot's template (no per-day fields)
 * @param {string} date      DD-MM-YYYY
 * @param {Object} opts
 * @param {*}      opts.now      the page's clock
 * @param {string} opts.today    DD-MM-YYYY
 * @returns {Object|null} a routineDate-shaped object, or null for a past day or
 *   no template (a past day nobody read cannot be guessed: it would claim
 *   nothing was done)
 */
export function optimisticRoutine(template, date, { now, today } = {}) {
  if (!Array.isArray(template) || !template.length || !date) return null;
  const day = moment(date, FORMAT);
  const current = moment(today, FORMAT);
  if (day.isBefore(current, 'day')) return null;

  const routine = {
    __typename: 'Routine',
    id: '',
    date,
    skip: false,
    tasklist: template.map((task) => ({
      ...task,
      ticked: false,
      passed: false,
      wait: true,
      redeemed: false,
      passedPoints: 0,
      stimuli: (task.stimuli || []).map((st) => ({ ...st, earned: 0 })),
    })),
  };
  return day.isSame(current, 'day') ? withClockFlags(routine, date, now) : routine;
}

export default optimisticRoutine;
