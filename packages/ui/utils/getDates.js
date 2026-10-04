/**
 * Date Utility Functions for Routine Notes Application
 * 
 * This module provides date manipulation and period management utilities
 * for the goal and task management system.
 * 
 * KEY CONCEPT - PERIOD HIERARCHY FOR MILESTONE GOALS:
 * =====================================================
 * Goals exist in a hierarchical period structure:
 * 
 *   Lifetime (01-01-1970) ← Eternal, overarching life goals
 *        ↑
 *      Year (Dec 31) ← Annual goals
 *        ↑
 *     Month (Last day) ← Monthly goals
 *        ↑
 *      Week (Friday) ← Weekly goals
 *        ↑
 *       Day ← Daily tasks
 * 
 * A goal at any level can be a MILESTONE (sub-goal) of a goal in the level above.
 * 
 * Example flow:
 * - Daily task: "Practice coding for 2 hours"
 *   → Milestone of weekly goal: "Complete JavaScript fundamentals"
 *   → Milestone of monthly goal: "Finish online web development course"
 *   → Milestone of yearly goal: "Become a full-stack developer"
 *   → Milestone of lifetime goal: "Build a successful tech career"
 * 
 * The stepupMilestonePeriodDate() function implements this hierarchy logic.
 * 
 * DATE FORMAT: All dates are stored and manipulated in DD-MM-YYYY format
 * internally, though displayed in various formats to users.
 */

import moment from 'moment';

export default function getDates() {
  return moment().format('DD-MM-YYYY');
}

export function getDatesOfYear(beginDate) {
  let dateStart = moment();
  if (beginDate) {
    dateStart = moment(beginDate, 'DD-MM-YYYY');
  }
  const timeTillEndOfYear = moment().endOf('year');
  const remainingDaysOfYear = timeTillEndOfYear.diff(dateStart, 'days');
  const days = [];
  const dateEnd = moment().add(remainingDaysOfYear, 'days');
  while (dateEnd.diff(dateStart, 'days') >= 0) {
    days.push({
      label: dateStart.format('DD-MM-YYYY'),
      value: dateStart.format('DD-MM-YYYY'),
    });
    dateStart.add(1, 'days');
  }
  return days;
}

export function getWeeksOfYear() {
  const currentWeek = moment().week();
  const lastWeekOfYear = moment().weeksInYear();
  const weeks = [];
  // eslint-disable-next-line no-plusplus
  for (let i = currentWeek; i <= lastWeekOfYear; i++) {
    weeks.push({
      label: `Week ${i} (${moment().weeks(i).weekday(1).format('DD-MM-YYYY')})`,
      value: moment().weeks(i).weekday(5).format('DD-MM-YYYY'),
    });
  }
  return weeks;
}

/**
 * THE WEEK DEFINITION
 * =====================================================
 * One definition of "a week" is used across the app: moment's locale week,
 * which runs Sunday to Saturday, with the Friday standing in for the week
 * itself (the week level of the hierarchy above). The server resolvers, the
 * cron settlement and every derivation in this file already count weeks that
 * way, so any surface that names, ranges or picks a week reads the three
 * helpers below instead of rolling its own arithmetic — that is what stops
 * Home's week strip and the week goal picker from drifting apart.
 */

/**
 * Sunday of week `week` in week-numbering year `year`.
 *
 * Anchoring in mid-June keeps `.week()` inside the intended week-numbering
 * year, so weeks 1 and 52/53 land on the right side of the year boundary.
 *
 * @param {number} year - Week-numbering year
 * @param {number} week - Week number (1-53)
 * @returns {Object} moment positioned on the Sunday that starts the week
 */
function weekAnchor(year, week) {
  return moment([year, 5, 15]).week(week).weekday(0);
}

/**
 * Which week a date belongs to
 *
 * @param {string} date - Date in DD-MM-YYYY format
 * @returns {Object} { week: number, year: number } - week number and its
 *   week-numbering year, which near a year boundary is not the calendar year
 */
export function getWeekOfDate(date) {
  const momentDate = moment(date, 'DD-MM-YYYY');
  return { week: momentDate.week(), year: momentDate.weekYear() };
}

/**
 * Number of weeks in a week-numbering year (52 or 53)
 *
 * @param {number} year - Week-numbering year
 * @returns {number} Last week number of that year
 */
export function getWeeksInYear(year) {
  return moment([year, 5, 15]).weeksInYear();
}

/**
 * The three dates that describe a week
 *
 * @param {number} year - Week-numbering year
 * @param {number} week - Week number (1-53)
 * @returns {Object} { start, date, end } in DD-MM-YYYY format - the Sunday it
 *   starts on, the Friday a week goal is stored under, and the Saturday it
 *   ends on
 */
export function getWeekDates(year, week) {
  const start = weekAnchor(year, week);
  return {
    start: start.format('DD-MM-YYYY'),
    date: start.clone().weekday(5).format('DD-MM-YYYY'),
    end: start.clone().weekday(6).format('DD-MM-YYYY'),
  };
}

export function getMonthsOfYear() {
  const currentMonth = moment().month();
  const currentYear = moment().year();
  const months = [];
  // eslint-disable-next-line no-plusplus
  for (let i = currentMonth; i < 12; i++) {
    months.push({
      label: moment([currentYear, i]).format('MMMM'),
      value: moment([currentYear, i]).endOf('month').format('DD-MM-YYYY'),
    });
  }
  return months;
}

export function getYearsOfLife() {
  const currentYear = moment().year();
  const avgAge = moment().year() + 70;
  const years = [];
  // eslint-disable-next-line no-plusplus
  for (let i = currentYear; i < avgAge; i++) {
    years.push({
      label: `${i}`,
      value: moment([i]).endOf('year').format('DD-MM-YYYY'),
    });
  }
  return years;
}

/**
 * Step up to the parent period for milestone goal relationships
 * 
 * PURPOSE:
 * When creating a milestone goal, this function determines which parent period
 * to fetch goals from. A goal can be a milestone (sub-goal) of another goal
 * in the period above it.
 * 
 * PERIOD HIERARCHY (child → parent):
 * - day     → week     (Friday of the week containing the day)
 * - week    → month    (Last day of the month containing the week)
 * - month   → year     (December 31st of the year containing the month)
 * - year    → lifetime (Eternal goals, represented by 01-01-1970)
 * 
 * EXAMPLES:
 * 1. Creating a task on Feb 23, 2026 (day):
 *    - Can be milestone of week goals ending Friday Feb 27, 2026
 *    stepupMilestonePeriodDate('day', '23-02-2026')
 *    → { period: 'week', date: '27-02-2026' }
 * 
 * 2. Creating a weekly goal ending Feb 27, 2026:
 *    - Can be milestone of monthly goals ending Feb 28, 2026
 *    stepupMilestonePeriodDate('week', '27-02-2026')
 *    → { period: 'month', date: '28-02-2026' }
 * 
 * 3. Creating a monthly goal ending Feb 28, 2026:
 *    - Can be milestone of yearly goals ending Dec 31, 2026
 *    stepupMilestonePeriodDate('month', '28-02-2026')
 *    → { period: 'year', date: '31-12-2026' }
 * 
 * 4. Creating a yearly goal ending Dec 31, 2026:
 *    - Can be milestone of lifetime goals
 *    stepupMilestonePeriodDate('year', '31-12-2026')
 *    → { period: 'lifetime', date: '01-01-1970' }
 * 
 * USAGE:
 * Used in GoalListContainer, AiSearchModalContainer, and other components
 * to fetch parent period goals when showing milestone selection options.
 * 
 * @param {string} period - Current period: 'day', 'week', 'month', 'year', or 'lifetime'
 * @param {string} date - Current date in DD-MM-YYYY format
 * @returns {Object} Parent period and date { period: string, date: string (DD-MM-YYYY) }
 */
export function stepupMilestonePeriodDate(period, date) {
  // Day → Week: Return Friday of the week containing this day
  if (period === 'day') {
    const weekNo = moment(date, 'DD-MM-YYYY').weeks();
    return {
      period: 'week',
      date: moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY'),
    };
  }

  // Week → Month: Return last day of the month containing this week
  if (period === 'week') {
    return {
      period: 'month',
      date: moment(date, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY'),
    };
  }

  // Month → Year: Return December 31st of the year containing this month
  if (period === 'month') {
    return {
      period: 'year',
      date: moment(date, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY'),
    };
  }

  // Year → Lifetime: Return the eternal goal date (Unix epoch start)
  if (period === 'year') {
    return {
      period: 'lifetime',
      date: '01-01-1970',
    };
  }

  // Default fallback: treat as day and return week
  const weekNo = moment(date, 'DD-MM-YYYY').weeks();
  return {
    period: 'week',
    date: moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY'),
  };
}

export function periodGoalDates(period, date) {
  if (period === 'week') {
    const weekNo = moment(date, 'DD-MM-YYYY').weeks();
    return moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY');
  }
  if (period === 'month') {
    return moment(date, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY');
  }
  if (period === 'year') {
    return moment(date, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY');
  }
  return date;
}

export function getPeriodDate(period, date, separator = ' - ') {
  switch (period) {
    case 'day':
      return moment(date, 'DD-MM-YYYY').format('DD') + separator;
    case 'week':
      return `Week ${moment(date, 'DD-MM-YYYY').week()}${separator}`;
    case 'month':
      return moment(date, 'DD-MM-YYYY').format('MMMM') + separator;
    case 'year':
      return moment(date, 'DD-MM-YYYY').format('YYYY') + separator;
    case 'lifetime':
      return '';

    default:
      return date;
  }
}

export function isItBeforeToday(period, date) {
  try {
    switch (period) {
      case 'day':
        return moment(date, 'DD-MM-YYYY').diff(moment(0, 'HH')) < 0;
      case 'week':
        return moment(date, 'DD-MM-YYYY').diff(moment(0, 'HH')) < 0;
      case 'month':
        return moment(date, 'DD-MM-YYYY').diff(moment(0, 'HH')) < 0;
      case 'year':
        return moment(date, 'DD-MM-YYYY').diff(moment(0, 'HH')) < 0;
      default:
        return true;
    }
  } catch (e) {
    console.log(e);
    return true;
  }
}

export const threshold = {
  weekDays: 5,
  monthWeeks: 3,
  yearMonths: 6,
};

export function getTimelineEntryPeriod(milestonePeriod) {
  // Map the milestone period to the appropriate timeline entry period
  switch (milestonePeriod) {
    case 'week':
      return 'day'; // Week plans have daily entries
    case 'month':
      return 'week'; // Month plans have weekly entries
    case 'year':
      return 'month'; // Year plans have monthly entries
    case 'day':
    default:
      return 'day'; // Day plans or fallback to daily entries
  }
}

/**
 * For week plans, convert daily dates to Friday of that week for timeline entries
 * For month plans, convert dates to the end of that month for timeline entries
 * @param {string} date - Date in DD-MM-YYYY format
 * @param {string} milestonePeriod - The period of the milestone plan
 * @returns {string} - Date in DD-MM-YYYY format, converted appropriately based on the period
 */
export function getTimelineEntryDate(date, milestonePeriod) {
  if (milestonePeriod === 'week') {
    // For week plans, convert any daily date to Friday of that week
    const momentDate = moment(date, 'DD-MM-YYYY');
    const friday = momentDate.clone().day(5); // 5 = Friday

    // If the original date is after Friday, get Friday of next week
    if (momentDate.day() > 5) {
      friday.add(1, 'week');
    }

    return friday.format('DD-MM-YYYY');
  }

  if (milestonePeriod === 'month') {
    // For month plans, convert any date to the end of that month
    const momentDate = moment(date, 'DD-MM-YYYY');
    return momentDate.endOf('month').format('DD-MM-YYYY');
  }

  // For other periods, return the date as-is
  return date;
}
