/**
 * goalCompletionCriteria — decide whether a period goal item has actually earned
 * its auto-complete, and say what it was earned on.
 *
 * The old rule was the streak threshold on its own (`progress === completionThreshold`),
 * so a week goal closed itself at five day-wins however many day milestones the
 * user had hung off it. A seven-milestone week goal therefore reported COMPLETE
 * with a mid-week milestone still open — and, because `autoCheckTaskPeriod` runs
 * from read queries, it did so without the user ticking anything and without
 * saying why.
 *
 * The threshold stays as a floor, so the streak economy is unchanged, but every
 * milestone the user declared inside the period is now a criterion as well and
 * all of them must be met. `progress` is deliberately untouched: it is the
 * N-of-5 streak count the dashboard renders, not a completion signal.
 *
 * Pure so the rule is testable without Mongo.
 */

/**
 * The child goal items hanging off `goalItemId` — the criteria the user declared
 * for it. Scoped to `childPeriodGoals`, which the caller has already narrowed to
 * this period's own child dates, so a milestone in a neighbouring week can never
 * hold a goal open for ever.
 *
 * @param {Array}  childPeriodGoals step-down-period goal docs ({ date, goalItems })
 * @param {string} goalItemId       the period goal item the criteria roll up into
 * @returns {Array<{ date: string, isComplete: boolean }>}
 */
function collectPeriodCriteria(childPeriodGoals, goalItemId) {
  const criteria = [];

  childPeriodGoals.forEach((childGoal) => {
    (childGoal.goalItems || []).forEach((childGoalItem) => {
      if (String(childGoalItem.goalRef) === String(goalItemId)) {
        criteria.push({ date: childGoal.date, isComplete: !!childGoalItem.isComplete });
      }
    });
  });

  return criteria;
}

/** DD-MM-YYYY → YYYYMMDD, so two period dates can be compared as strings. */
const sortableDate = (date) => String(date || '').split('-').reverse().join('');

/**
 * One entry per CALENDAR child date of the period, in calendar order, so the
 * streak widget can align its nodes to days instead of packing completions to
 * the left. Rendering `progress` as an N-of-5 count made a week with a missed
 * Wednesday look identical to an unbroken one.
 *
 * A child date the user declared no milestone on is still emitted, as 'none':
 * dropping it would shift the later days leftwards and re-create that bug.
 *
 * @param {Array<string>} childDates    DD-MM-YYYY, calendar order (periodChildDates)
 * @param {Array}         criteria      from collectPeriodCriteria
 * @param {string}        referenceDate DD-MM-YYYY the period is being read for;
 *                                      dates before it can be missed, dates from
 *                                      it onwards are still winnable
 * @returns {Array<{ date: string, status: 'complete'|'missed'|'upcoming'|'none' }>}
 */
function buildMilestoneDays(childDates, criteria, referenceDate) {
  const reference = sortableDate(referenceDate);

  return childDates.map((childDate) => {
    const onThisDate = criteria.filter((criterion) => criterion.date === childDate);

    if (!onThisDate.length) return { date: childDate, status: 'none' };
    if (onThisDate.every((criterion) => criterion.isComplete)) return { date: childDate, status: 'complete' };

    return {
      date: childDate,
      status: sortableDate(childDate) < reference ? 'missed' : 'upcoming',
    };
  });
}

/**
 * @param {Object} p
 * @param {Array}  p.criteria            from collectPeriodCriteria
 * @param {number} p.progress            day/week/month wins counted so far
 * @param {number} p.completionThreshold streak floor (threshold.weekDays etc.)
 * @param {string} p.stepDownPeriod      'day' | 'week' | 'month', for the note
 * @param {string} p.date                the period goal's own date, for the note
 * @returns {{ isComplete: boolean, met: Array, outstanding: Array, note: ?string }}
 */
function evaluateAutoComplete({
  criteria, progress, completionThreshold, stepDownPeriod, date,
}) {
  const met = criteria.filter((criterion) => criterion.isComplete);
  const outstanding = criteria.filter((criterion) => !criterion.isComplete);
  const isComplete = progress >= completionThreshold && !outstanding.length;

  // An auto-complete has to state what it was awarded for; being told you
  // achieved something with no way to check it is worse than not closing.
  const metDates = met.map((criterion) => criterion.date).join(', ');
  const note = isComplete
    ? `Auto-completed on ${date}: ${met.length} of ${criteria.length} `
      + `${stepDownPeriod} milestones met — ${metDates}.`
    : null;

  return {
    isComplete, met, outstanding, note,
  };
}

module.exports = { collectPeriodCriteria, buildMilestoneDays, evaluateAutoComplete };
