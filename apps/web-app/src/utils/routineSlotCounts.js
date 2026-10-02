/**
 * Daily task target ("09:00 - 0/6" on a routine card) read back off the
 * schedule alone.
 *
 * The target is not a checkbox count. The server slices a routine item's
 * window — the gap to the next item, floored at two hours and running to
 * midnight for the last item of the day — into one slot per two hours
 * (resolvers/routine.js buildStimuliForRoutineItem, then D.splitRate /
 * K.splitRate). Moving one item's time therefore re-slices its neighbour's
 * window as well, so the Settings form can name the items an edit retargets
 * instead of letting their numbers change behind the user's back.
 */

const HOURS_PER_SLOT = 2; // K.splitRate: 1 task in 2 hours
const END_OF_DAY = '24:00';

function timeOfDayInHours(time) {
  const [hour, minute] = String(time).split(':');

  return Number(hour) + (Number(minute || 0) / 60);
}

/**
 * @param {Array} items routine items, each { id, time }
 * @returns {Object} item id -> slot count
 */
export function slotCountsByItem(items) {
  const schedule = (Array.isArray(items) ? items : [])
    .filter((item) => item && item.id && item.time)
    .slice()
    .sort((a, b) => timeOfDayInHours(a.time) - timeOfDayInHours(b.time));

  const counts = {};
  schedule.forEach((item, index) => {
    const nextTime = schedule[index + 1] ? schedule[index + 1].time : END_OF_DAY;
    const window = timeOfDayInHours(nextTime) - timeOfDayInHours(item.time);
    // Same rounding as the card: Number((D.splitRate / K.splitRate).toFixed(0)).
    counts[item.id] = Number(
      (Math.max(window, HOURS_PER_SLOT) / HOURS_PER_SLOT).toFixed(0),
    );
  });

  return counts;
}

/**
 * "Start Work: 1 -> 6" for every item whose target the edit moved, in
 * schedule order. Items missing from either schedule are skipped: an add or a
 * delete has no before/after pair to report.
 *
 * @param {Array} before routine items as they stood, each { id, name, time }
 * @param {Array} after  the same list with the edit applied
 * @returns {Array<string>}
 */
export function describeSlotChanges(before, after) {
  const beforeCounts = slotCountsByItem(before);
  const afterCounts = slotCountsByItem(after);

  return (Array.isArray(after) ? after : [])
    .filter((item) => item
      && beforeCounts[item.id] !== undefined
      && afterCounts[item.id] !== beforeCounts[item.id])
    .sort((a, b) => timeOfDayInHours(a.time) - timeOfDayInHours(b.time))
    .map((item) => `${item.name}: ${beforeCounts[item.id]} -> ${afterCounts[item.id]}`);
}

export default { slotCountsByItem, describeSlotChanges };
