import { stepupMilestonePeriodDate } from './getDates';

/**
 * The goal items a goal of `(period, date)` can roll up into: the goals of the
 * period one step up (day → that week, week → that month, …), which is what the
 * goal-item sheet's "Linked to" picker offers.
 *
 * `useCache: false` so a parent goal added since the app loaded is offered.
 * Resolves `[]` for a lifetime goal (nothing above it), a missing date, or a
 * failed read — an empty picker, never a thrown error, because the sheet is
 * still usable without a parent.
 *
 * @param {Object} goals the `$goals` plugin
 * @param {string} period
 * @param {string} date DD-MM-YYYY
 * @returns {Promise<Array>}
 */
export async function fetchParentGoalOptions(goals, period, date) {
  if (!goals || !period || !date || period === 'lifetime') return [];
  try {
    const stepUp = stepupMilestonePeriodDate(period, date);
    if (!stepUp || !stepUp.period || !stepUp.date) return [];
    const data = await goals.fetchGoalDatePeriod(stepUp.period, stepUp.date, { useCache: false });
    return (data && data.goalItems) || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[parentGoalOptions] could not load parent goals:', error);
    return [];
  }
}

export default fetchParentGoalOptions;
