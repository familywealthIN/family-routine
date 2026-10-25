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
const { previousDates, dayStates, linkedGoals } = require('./routineInsight');

const WEEK_DAYS = 7;
const DIGEST_MAX = 1800;

const STATE_LABEL = {
  onTime: 'done on time',
  late: 'done late',
  missed: 'missed',
  skipped: 'rest day',
  off: 'not scheduled',
  absent: 'app not opened',
};

/** Today plus the seven days before it, newest first — the dates to read. */
function chatWeekDates(today) {
  return [today, ...previousDates(today, WEEK_DAYS)];
}

/** This routine's day goal items on one date, as "body (done)" strings. */
function itemsOn(goals, date, ref) {
  const out = [];
  (goals || []).forEach((goal) => {
    if (goal.date !== date) return;
    (goal.goalItems || []).forEach((item) => {
      if (String(item.taskRef) !== ref || !item.body) return;
      out.push({ body: String(item.body).trim(), done: !!item.isComplete });
    });
  });
  return out;
}

/**
 * @param {Object} p
 * @param {Array}  p.routines day routine docs for `chatWeekDates(today)`
 * @param {Array}  p.goals    day goal docs for the same dates
 * @param {Array}  [p.periodGoals] this week's and month's goal docs
 * @param {string} p.taskRef  the routine item id
 * @param {string} p.today    DD-MM-YYYY
 * @returns {string} '' when there is no history at all
 */
function weekDigest({
  routines = [], goals = [], periodGoals = [], taskRef, today,
}) {
  if (!taskRef || !today) return '';
  const ref = String(taskRef);
  // dayStates counts today as ticked (it was written for the post-tick card);
  // today is already described by the live snapshot, so the week starts at
  // yesterday.
  const states = dayStates({ routines, taskRef, today }).slice(1, WEEK_DAYS + 1);

  const totals = {
    scheduled: 0, onTime: 0, late: 0, missed: 0, itemsDone: 0, itemsOpen: 0,
  };
  const lines = states.map(({ date, state }) => {
    const items = itemsOn(goals, date, ref);
    if (state !== 'off' && state !== 'skipped') totals.scheduled += 1;
    if (state === 'onTime') totals.onTime += 1;
    if (state === 'late') totals.late += 1;
    if (state === 'missed' || state === 'absent') totals.missed += 1;
    items.forEach((item) => {
      if (item.done) totals.itemsDone += 1;
      else totals.itemsOpen += 1;
    });
    const day = moment(date, 'DD-MM-YYYY').format('ddd D MMM');
    const list = items.length
      ? ` · ${items.map((item) => `${item.body} (${item.done ? 'done' : 'not done'})`).join(', ')}`
      : '';
    return `- ${day}: ${STATE_LABEL[state] || state}${list}`;
  });

  const hadAnything = states.some(({ state }) => state !== 'absent' && state !== 'off')
    || totals.itemsDone + totals.itemsOpen > 0;
  if (!hadAnything) return '';

  const done = totals.onTime + totals.late;
  const summary = `Last 7 days: ${done} of ${totals.scheduled} scheduled sessions done`
    + ` (${totals.onTime} on time, ${totals.late} late), ${totals.missed} missed;`
    + ` checklist items ${totals.itemsDone} done, ${totals.itemsOpen} left open.`;
  const feeds = linkedGoals(periodGoals, taskRef)
    .map((goal) => `${goal.period} goal "${goal.body}" (${goal.done ? 'done' : 'open'})`);

  const text = [
    summary,
    ...lines,
    feeds.length ? `This routine feeds: ${feeds.join('; ')}.` : '',
  ].filter(Boolean).join('\n');
  return text.length > DIGEST_MAX ? `${text.slice(0, DIGEST_MAX - 1)}…` : text;
}

module.exports = {
  WEEK_DAYS,
  chatWeekDates,
  weekDigest,
};
