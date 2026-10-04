/**
 * missedDay — spot the days of the current week that got away, so the dashboard
 * can say something about them instead of carrying on as if the week had gone
 * to plan.
 *
 * It reuses the rule the rest of the app already grades days by (see the
 * server's buildMilestoneDays): only a day BEFORE the reference date can be
 * missed, and a day is missed when nothing landed on it. Here "nothing landed"
 * is the week strip's own measure — the D/K/G totals `weekStimuli` already
 * returns for each date — so there is no second, disagreeing definition.
 *
 * Two days that score zero are deliberately NOT missed days:
 *
 *  1. A **Skip Day**. The user claimed a rest day on purpose; nudging them
 *     about it would punish the feature that exists for exactly this.
 *  2. A day before the user's first activity of the week. A routine document
 *     only exists once the app is opened (see D-29), so a mid-week sign-up —
 *     or anyone whose week simply starts on Tuesday — would otherwise be told
 *     they had missed days they were never there for.
 */
import moment from 'moment';

const DATE_FORMAT = 'DD-MM-YYYY';

/** DD-MM-YYYY -> YYYYMMDD, so two day keys can be compared as strings. */
const sortableDate = (date) => String(date || '').split('-').reverse().join('');

/** Total earned across the three stimuli on one week-strip day. */
const earnedOn = (day) => (day.D || 0) + (day.K || 0) + (day.G || 0);

/**
 * @param {Array}  days      week-strip entries ({ date, D, K, G, skipped }),
 *                           any order — `weekStimuli`'s shape
 * @param {string} reference DD-MM-YYYY the dashboard is showing (today)
 * @returns {Array<{ date: string, weekday: string }>} every missed day, in
 *                           calendar order
 */
export function findMissedDays(days, reference) {
  if (!Array.isArray(days) || !days.length || !reference) return [];

  const referenceKey = sortableDate(reference);
  const calendarOrder = days
    .filter((day) => day && day.date)
    .slice()
    .sort((a, b) => sortableDate(a.date).localeCompare(sortableDate(b.date)));

  let seenActivity = false;
  const missed = [];

  calendarOrder.forEach((day) => {
    if (sortableDate(day.date) >= referenceKey) return;
    if (earnedOn(day) > 0) {
      seenActivity = true;
      return;
    }
    if (day.skipped || !seenActivity) return;
    missed.push({
      date: day.date,
      weekday: moment(day.date, DATE_FORMAT).format('dddd'),
    });
  });

  return missed;
}

/**
 * @param {Array}  days      as findMissedDays
 * @param {string} reference as findMissedDays
 * @returns {{ date: string, weekday: string }|null} the most recent missed day
 */
export function findMissedDay(days, reference) {
  const missed = findMissedDays(days, reference);
  // The last match wins, so the user hears about the day nearest to now.
  return missed.length ? missed[missed.length - 1] : null;
}

export default { findMissedDay, findMissedDays };
