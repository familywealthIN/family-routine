/**
 * relatedGoalTasks — the "Related Goals" timeline rows for one parent goal ref.
 *
 * Three places asked `goalsByGoalRef` the same question and each derived the
 * timeline rows itself: the goal-action modal, the standalone timeline
 * container and the AI task form. The copies had already drifted — only two
 * deduped, only two scoped out future dates, and the third sorted on a `time`
 * it never set — so this is now the one derivation all three read.
 *
 * `goals` is expected to be ALREADY scoped to the ref (see
 * web-app utils/goalRefScope): the server returns each Goal's complete
 * goalItems list, because returning a filtered one truncated the shared
 * normalized Goal entity in the Apollo cache. The `goalRef` check below is the
 * belt to that braces, not a substitute for it.
 */
import moment from 'moment';

// What the timeline shows before it needs to scroll.
export const MAX_RELATED_TASKS = 10;

const asDate = (value) => moment(value, 'DD-MM-YYYY');

/**
 * @param {Array}  goals              Goals carrying items for this ref
 * @param {Object} options
 * @param {string} options.goalRef    Parent goal item id the rows belong to
 * @param {string} [options.date]     Viewed date; later-dated goals are hidden.
 *                                    Omit to show every date.
 * @param {Array}  [options.tasklist] Routine items, to label a row with the
 *                                    time of the routine its task ref points at
 * @returns {Array} timeline rows, newest date first, capped
 */
export function relatedGoalTasks(goals, options = {}) {
  const { goalRef, date = '', tasklist = [] } = options;

  if (!goalRef || !Array.isArray(goals)) return [];

  const today = asDate(date);
  const hideFutureDates = today.isValid();
  const seen = new Set();
  const tasks = [];

  goals.forEach((goal) => {
    if (!goal || !Array.isArray(goal.goalItems)) return;

    // Show the whole history for this goal ref; exclude only future-dated items.
    if (hideFutureDates && goal.date) {
      const goalDate = asDate(goal.date);
      if (goalDate.isValid() && goalDate.isAfter(today, 'day')) return;
    }

    goal.goalItems.forEach((goalItem) => {
      if (!goalItem || goalItem.goalRef !== goalRef) return;

      // Dedupe on identity ONLY. A missing id is not evidence of a duplicate,
      // and treating it as one is what collapsed a week of entries into a
      // single row: `goalsByGoalRef` served every item with id:null, so the
      // first row poisoned the set for all the rest.
      if (goalItem.id) {
        if (seen.has(goalItem.id)) return;
        seen.add(goalItem.id);
      }

      const routineTask = Array.isArray(tasklist)
        ? tasklist.find((t) => t.id === goalItem.taskRef || t.taskId === goalItem.taskRef)
        : null;

      tasks.push({
        id: goalItem.id,
        body: goalItem.body,
        date: goal.date,
        period: goal.period,
        time: (routineTask && routineTask.time) || null,
        isComplete: goalItem.isComplete,
        goalRef: goalItem.goalRef,
        taskRef: goalItem.taskRef,
        tags: goalItem.tags || [],
      });
    });
  });

  return tasks
    .sort((a, b) => asDate(b.date).valueOf() - asDate(a.date).valueOf())
    .slice(0, MAX_RELATED_TASKS);
}

export default relatedGoalTasks;
