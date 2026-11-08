/**
 * goalCompletionCriteria — decide whether a period goal item has actually earned
 * its auto-complete, and say what it was earned on.
 *
 * The rule is the threshold (owner's rule, 25 Oct 2026): a period goal ticks
 * itself once `completionThreshold` of its milestones are met — five day
 * milestones for a week, three week milestones for a month, six month
 * milestones for a year — however many more the user hung off it. Planning five
 * week milestones under a month goal is ambition, not a raised bar. D-03
 * (bdeed5a, 10 Sep) made every milestone a criterion with the threshold only as
 * a floor, which left a month goal with 3 of 5 week milestones met open; that
 * was reverted here.
 *
 * The threshold is counted in met milestones rather than taken from
 * `progress`, which counts one win per child
 * DOCUMENT. A month goal whose five week milestones all sit in the same week
 * document scores one there, so it could never clear a threshold of three however
 * many of its milestones were met, while the dashboard truthfully read 5/5.
 * Deriving the count here instead of taking it from the caller is what stops the
 * two disagreeing again.
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
        // Met means TICKED, late or not (owner's rule, 11 Oct 2026). A day item
        // ticked after its routine window — or on a later day — is still graded
        // 'missed' by utils/goalItemStatus and reported as `late`, but it counts
        // towards the period: a night routine ticked at 00:27 was done. The
        // earlier on-time-only rule (D-02) had /goals read 4/5 for a week the
        // user ticked every day of.
        const ticked = !!childGoalItem.isComplete;
        const late = ticked && childGoalItem.status === 'missed';
        criteria.push({ date: childGoal.date, isComplete: ticked, late });
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
 * A past date carrying several milestones is 'partial' when some but not all of
 * them were met. Collapsing it to 'missed' told the user a day they had won a
 * milestone on counted for nothing, and contradicted `milestonesComplete`,
 * which had already counted that milestone — one goal, two stories.
 *
 * @param {Array<string>} childDates    DD-MM-YYYY, calendar order (periodChildDates)
 * @param {Array}         criteria      from collectPeriodCriteria
 * @param {string}        referenceDate DD-MM-YYYY the period is being read for;
 *                                      dates before it can be missed, dates from
 *                                      it onwards are still winnable
 * @returns {Array<{ date: string, status: 'complete'|'partial'|'missed'|'upcoming'|'none' }>}
 */
function buildMilestoneDays(childDates, criteria, referenceDate) {
  const reference = sortableDate(referenceDate);

  return childDates.map((childDate) => {
    const onThisDate = criteria.filter((criterion) => criterion.date === childDate);

    if (!onThisDate.length) return { date: childDate, status: 'none' };
    if (onThisDate.every((criterion) => criterion.isComplete)) return { date: childDate, status: 'complete' };
    if (sortableDate(childDate) >= reference) return { date: childDate, status: 'upcoming' };

    return {
      date: childDate,
      status: onThisDate.some((criterion) => criterion.isComplete) ? 'partial' : 'missed',
    };
  });
}

/**
 * @param {Object} p
 * @param {Array}  p.criteria            from collectPeriodCriteria
 * @param {number} p.completionThreshold the threshold (threshold.weekDays etc.),
 *                                       counted in met milestones
 * @param {string} p.stepDownPeriod      'day' | 'week' | 'month', for the note
 * @param {string} p.date                the period goal's own date, for the note
 * @returns {{ isComplete: boolean, met: Array, outstanding: Array, note: ?string }}
 */
function evaluateAutoComplete({
  criteria, completionThreshold, stepDownPeriod, date,
}) {
  const met = criteria.filter((criterion) => criterion.isComplete);
  const outstanding = criteria.filter((criterion) => !criterion.isComplete);
  // Reaching the threshold is enough; milestones still open beyond it do not
  // hold the goal back.
  const isComplete = met.length >= completionThreshold;

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
