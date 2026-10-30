/**
 * chatWeek — the last seven days of one routine, written out for the chat.
 *
 * The chat used to see only today's checklist. Asked "how was my week?" or
 * "what did I do on this project?", the model had nothing to answer from, so it
 * did the one thing it could and added tasks. This is the week it was missing:
 * one line per day (how the session went, the items filed against it) and a
 * totals line, all counted here so the model never has to count.
 *
 * Pure: the resolver reads the documents, this only formats them.
 */
const moment = require('moment');
const {
  previousDates, dayStates, linkedGoals, goalItemState,
} = require('./routineInsight');
const { collectPeriodCriteria, evaluateAutoComplete } = require('./goalCompletionCriteria');
const { threshold } = require('./getProgressReport');

const WEEK_DAYS = 7;
const DIGEST_MAX = 1800;

const STATE_LABEL = {
  onTime: 'done on time',
  late: 'done late',
  missed: 'missed',
  skipped: 'rest day',
  off: 'not scheduled',
  absent: 'app not opened',
  open: 'not done yet',
};

// A goal item's status is one-to-one with timing: done (ticked in its window)
// or missed (not done in it). A late tick stays missed but is ticked and counts.
const ITEM_LABEL = {
  done: 'done',
  late: 'missed, ticked late',
  skipped: 'missed, not ticked',
  'not done': 'not done',
};

const dayLabel = (date) => moment(date, 'DD-MM-YYYY').format('ddd D MMM');

/** Today plus the six days before it, newest first — the dates to read. */
function chatWeekDates(today) {
  return [today, ...previousDates(today, WEEK_DAYS - 1)];
}

/** This routine's day goal items on one date, with goalItemState's state. */
function itemsOn(goals, date, ref) {
  const out = [];
  (goals || []).forEach((goal) => {
    if (goal.date !== date) return;
    (goal.goalItems || []).forEach((item) => {
      if (String(item.taskRef) !== ref || !item.body) return;
      out.push({ body: String(item.body).trim(), state: goalItemState(item) });
    });
  });
  return out;
}

/**
 * A week goal's milestones as the app counts them (autoCheckTaskPeriod's
 * `milestonesComplete` of `milestonesTotal`, over the week's own day docs), and
 * whether it is done: ticked, or at the threshold of met milestones however
 * many more were planned.
 */
function weekTally(goal, goals, weekDates) {
  const children = (goals || []).filter((doc) => weekDates.includes(doc.date));
  const criteria = collectPeriodCriteria(children, goal.id);
  const { isComplete, met } = evaluateAutoComplete({
    criteria, completionThreshold: threshold.weekDays, stepDownPeriod: 'day', date: '',
  });
  const state = goal.done || isComplete ? 'done' : `open, needs ${threshold.weekDays} met`;
  return `${met.length} of ${criteria.length} milestones, ${state}`;
}

/**
 * @param {Object} p
 * @param {Array}  p.routines day routine docs for `chatWeekDates(today)`
 * @param {Array}  p.goals    day goal docs for those dates and `weekDates`
 * @param {Array}  [p.periodGoals] this week's and month's goal docs
 * @param {Array}  [p.weekDates] the week goal's own child dates (Sun..Sat),
 *                               for its milestone tally
 * @param {string} p.taskRef  the routine item id
 * @param {string} p.today    DD-MM-YYYY
 * @returns {string} '' when there is no history at all
 */
function weekDigest({
  routines = [], goals = [], periodGoals = [], weekDates = [], taskRef, today,
}) {
  if (!taskRef || !today) return '';
  const ref = String(taskRef);
  // Today as the document has it: the chat is not answering a tick, and a
  // question about the week on its last day is mostly about today.
  const states = dayStates({
    routines, taskRef, today, justTicked: false,
  }).slice(0, WEEK_DAYS).map((day) => (
    // Unticked with its window still open is not a miss yet.
    day.date === today && day.state === 'missed' && !day.task.passed
      ? { ...day, state: 'open' }
      : day));

  const totals = {
    scheduled: 0, onTime: 0, late: 0, missed: 0, itemsDone: 0, itemsLate: 0, itemsSkipped: 0, itemsOpen: 0,
  };
  const late = [];
  const skipped = [];
  const lines = states.map(({ date, state }) => {
    const items = itemsOn(goals, date, ref);
    if (state !== 'off' && state !== 'skipped' && state !== 'open') totals.scheduled += 1;
    if (state === 'onTime') totals.onTime += 1;
    if (state === 'late') totals.late += 1;
    if (state === 'missed' || state === 'absent') totals.missed += 1;
    items.forEach((item) => {
      if (item.state === 'done' || item.state === 'late') totals.itemsDone += 1;
      if (item.state === 'late') {
        totals.itemsLate += 1;
        late.push(`${item.body} (${dayLabel(date)})`);
      } else if (item.state === 'skipped') {
        totals.itemsSkipped += 1;
        skipped.push(`${item.body} (${dayLabel(date)})`);
      } else if (item.state === 'not done') totals.itemsOpen += 1;
    });
    const list = items.length
      ? ` · ${items.map((item) => `${item.body} (${ITEM_LABEL[item.state]})`).join(', ')}`
      : '';
    return `- ${date === today ? 'Today, ' : ''}${dayLabel(date)}: ${STATE_LABEL[state] || state}${list}`;
  });

  const hadAnything = states.some(({ state }) => state !== 'absent' && state !== 'off')
    || totals.itemsDone + totals.itemsSkipped + totals.itemsOpen > 0;
  if (!hadAnything) return '';

  const done = totals.onTime + totals.late;
  const summary = `Last 7 days, today included: ${done} of ${totals.scheduled} scheduled sessions done`
    + ` (${totals.onTime} on time, ${totals.late} late), ${totals.missed} missed;`
    + ` checklist items ${totals.itemsDone} ticked (${totals.itemsLate} of them missed and ticked late),`
    + ` ${totals.itemsSkipped} missed and not ticked, ${totals.itemsOpen} left open.`;
  // Named here so the model can answer "which were late / skipped?" without
  // reading every day line.
  const named = [
    `Missed, ticked late: ${late.length ? late.join(', ') : 'none'}.`,
    `Missed, not ticked: ${skipped.length ? skipped.join(', ') : 'none'}.`,
  ].join(' ');
  const standing = (goal) => {
    if (goal.period === 'week' && weekDates.length) return weekTally(goal, goals, weekDates);
    return goal.done ? 'done' : 'open';
  };
  const feeds = linkedGoals(periodGoals, taskRef)
    .map((goal) => `${goal.period} goal "${goal.body}" (${standing(goal)})`);

  // The totals and the goals come before the day lines, so a long week loses
  // its oldest days to the cap, never the answer to "how many milestones?".
  const text = [
    summary,
    named,
    feeds.length ? `This routine feeds: ${feeds.join('; ')}.` : '',
    ...lines,
  ].filter(Boolean).join('\n');
  return text.length > DIGEST_MAX ? `${text.slice(0, DIGEST_MAX - 1)}…` : text;
}

module.exports = {
  WEEK_DAYS,
  chatWeekDates,
  weekDigest,
};
