/**
 * routineInsight — the first message after a routine is ticked: three
 * sentences that make the user want to come back for the next session.
 *
 * It is a momentum message, not a report card. The routine chat only ever sees
 * today, so this looks back over the routine's last month — the current run of
 * check-ins, the best run, this week against last, the K/D/G it has earned, the
 * activities done most often and the weekday it lands best — and turns that into
 * a win to celebrate, one fresh idea that makes the next session more rewarding,
 * and a target just within reach. The area/project context the client already
 * caches (description + next steps) gives the idea something real to hang on.
 *
 * The model gets measurements, not raw documents, so the prompt stays small
 * enough for a free model. The summariser, the hook and the fallback are pure so
 * the arithmetic is testable without Mongo or a model.
 */
const { completeChat } = require('./chatApi');

const LOOKBACK_DAYS = 30;
const MAX_ACTIVITIES = 8;
const TOP_ACTIVITIES = 3;
const BRIEF_MAX = 1500;
const RUN_TARGETS = [3, 5, 7, 10, 14, 21, 30, 50, 100];
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const days = (n) => `${n} more day${n === 1 ? '' : 's'}`;
const sortKey = (date) => String(date).split('-').reverse().join('');

const parseDate = (date) => {
  const [d, m, y] = String(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** DD-MM-YYYY for each of the `count` days strictly before `date`, newest first. */
function previousDates(date, count = LOOKBACK_DAYS) {
  const start = parseDate(date);
  const out = [];
  for (let i = 1; i <= count; i += 1) {
    const day = new Date(start.getTime() - i * 86400000);
    const dd = String(day.getUTCDate()).padStart(2, '0');
    const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
    out.push(`${dd}-${mm}-${day.getUTCFullYear()}`);
  }
  return out;
}

/**
 * One state per calendar day, newest first: 'onTime' | 'late' | 'missed' |
 * 'skipped' | 'off' (the routine was not on that day's list) | 'absent' (no
 * routine document — the app was not opened, so nothing was done).
 */
function dayStates({ routines, taskRef, today }) {
  const ref = String(taskRef);
  const byDate = new Map(routines.map((r) => [r.date, r]));
  const dates = today ? [today, ...previousDates(today)] : routines
    .map((r) => r.date)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  return dates.map((date) => {
    const routine = byDate.get(date);
    if (!routine) return { date, state: 'absent' };
    const task = (routine.tasklist || []).find((t) => String(t._id || t.id) === ref);
    if (!task) return { date, state: 'off', task: null };
    if (routine.skip) return { date, state: 'skipped', task };
    // This runs because today's routine was just ticked, so today counts even
    // if the tick has not reached the document yet. `passed` is stamped when
    // the window closes untouched, so a tick on a passed task was late.
    const ticked = task.ticked || date === today;
    if (ticked) return { date, state: task.passed ? 'late' : 'onTime', task };
    return { date, state: 'missed', task };
  });
}

/** Current and best runs of check-ins. Skips and off days neither add nor break. */
function runs(states) {
  let current = 0;
  let currentOpen = true;
  let best = 0;
  let run = 0;
  states.forEach(({ state }) => {
    if (state === 'onTime' || state === 'late') {
      run += 1;
      if (currentOpen) current += 1;
    } else if (state === 'missed' || state === 'absent') {
      run = 0;
      currentOpen = false;
    }
    best = Math.max(best, run);
  });
  return { streak: current, bestStreak: best };
}

/**
 * The next target that is just within reach — the line the message ends on.
 * Beating the best run comes first; once the current run IS the best, the
 * next round number takes over.
 */
function nextMilestone({ streak, bestStreak }) {
  if (bestStreak > streak) {
    return `${days(bestStreak + 1 - streak)} beats your best run of ${bestStreak}`;
  }
  const target = RUN_TARGETS.find((t) => t > streak) || streak + 10;
  return `${days(target - streak)} makes it a ${target}-day run, and every day from here is a new personal best`;
}

/**
 * @param {Object} p
 * @param {Array}  p.routines day routine docs ({ date, skip, tasklist[] })
 * @param {Array}  p.goals    day goal docs ({ date, goalItems[] })
 * @param {string} p.taskRef  the routine item id
 * @param {string} [p.today]  DD-MM-YYYY of the tick; enables runs and the weekly trend
 */
function summariseRoutineHistory({
  routines = [], goals = [], taskRef, today,
}) {
  const ref = String(taskRef);
  const states = dayStates({ routines, taskRef, today });
  const summary = {
    days: 0,
    onTime: 0,
    late: 0,
    missed: 0,
    skipped: 0,
    itemsDone: 0,
    itemsLate: 0,
    itemsOpen: 0,
    activities: [],
    topActivities: [],
    earned: { K: 0, D: 0, G: 0 },
    thisWeek: 0,
    lastWeek: 0,
    bestWeekday: null,
    todayState: null,
    ...runs(states),
  };

  const weekdayHits = new Array(7).fill(0);
  states.forEach(({ date, state, task }, index) => {
    if (!task) return;
    summary.days += 1;
    if (state === 'onTime') summary.onTime += 1;
    if (state === 'late') summary.late += 1;
    if (state === 'missed') summary.missed += 1;
    if (state === 'skipped') summary.skipped += 1;
    if (date === today) summary.todayState = state;
    if (state === 'onTime' || state === 'late') {
      if (today && index < 7) summary.thisWeek += 1;
      else if (today && index < 14) summary.lastWeek += 1;
    }
    if (state === 'onTime') weekdayHits[parseDate(date).getUTCDay()] += 1;
    (task.stimuli || []).forEach((s) => {
      if (s && s.name in summary.earned) summary.earned[s.name] += Number(s.earned) || 0;
    });
  });
  Object.keys(summary.earned).forEach((k) => { summary.earned[k] = Math.round(summary.earned[k]); });

  const topDay = Math.max(...weekdayHits);
  if (topDay >= 2) summary.bestWeekday = WEEKDAYS[weekdayHits.indexOf(topDay)];

  const doneCounts = new Map();
  goals
    .slice()
    .sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)))
    .forEach((goal) => {
      (goal.goalItems || []).forEach((item) => {
        if (String(item.taskRef) !== ref) return;
        if (item.isComplete && item.status === 'missed') summary.itemsLate += 1;
        else if (item.isComplete) summary.itemsDone += 1;
        else summary.itemsOpen += 1;
        if (!item.body) return;
        // Trailing punctuation would end the fallback's sentence mid-quote.
        const body = String(item.body).trim().replace(/[.!?]+$/, '');
        if (item.isComplete) doneCounts.set(body, (doneCounts.get(body) || 0) + 1);
        if (summary.activities.length < MAX_ACTIVITIES) {
          const state = item.isComplete ? (item.status === 'missed' ? 'late' : 'done') : 'not done';
          summary.activities.push(`${item.body} (${state})`);
        }
      });
    });
  summary.topActivities = [...doneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ACTIVITIES)
    .map(([body, count]) => ({ body, count }));

  summary.showedUp = summary.onTime + summary.late;
  summary.milestone = nextMilestone(summary);
  return summary;
}

function describeHistory(summary) {
  const s = summary;
  const items = s.itemsDone + s.itemsLate + s.itemsOpen;
  const today = { onTime: 'ticked inside its window', late: 'ticked after its window' }[s.todayState]
    || 'ticked';
  const top = s.topActivities.length
    ? s.topActivities.map((a) => `${a.body} ×${a.count}`).join('; ')
    : 'none recorded';
  // Spelled out, because a free model will otherwise call any run "your best".
  const record = s.streak >= s.bestStreak
    ? `this IS the best run in the last ${LOOKBACK_DAYS} days`
    : `NOT a record: the best run in the last ${LOOKBACK_DAYS} days is ${s.bestStreak}`;
  return `Today: ${today}.
Current run of check-ins: ${s.streak} (${record})
Check-ins this week: ${s.thisWeek} · last week: ${s.lastWeek}
Last ${LOOKBACK_DAYS} days (${s.days} scheduled): ${s.showedUp} check-ins, ${s.onTime} in time (${pct(s.onTime, s.days)}%), ${s.late} late, ${s.missed} missed, ${s.skipped} rest days
K/D/G this routine earned over the last ${LOOKBACK_DAYS} days in total (not today): K ${s.earned.K} · D ${s.earned.D} · G ${s.earned.G}
Strongest day: ${s.bestWeekday || 'not enough data yet'}
Checklist work: ${items} items, ${s.itemsDone} done in time, ${s.itemsLate} done late, ${s.itemsOpen} open
Most-done activities: ${top}
Recent activities: ${s.activities.length ? s.activities.join('; ') : 'none recorded'}
Next target within reach: ${s.milestone}`;
}

const capFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** The win, the idea and the hook, built from the numbers alone, for when no model answers. */
function fallbackInsight(summary, routineName = 'this routine') {
  const s = summary;
  if (!s.showedUp) {
    return `First ${routineName} on the board, and the first one is always the hardest. `
      + 'Next time, make it a two-minute race: start the moment the window opens and see how far you get before the timer runs out. '
      + `${capFirst(s.milestone || 'three days in a row starts your first run')}, so come back tomorrow.`;
  }

  let win;
  if (s.streak >= 2) win = `That is ${s.streak} check-ins in a row on ${routineName}, and the momentum is real.`;
  else if (s.thisWeek > s.lastWeek && s.lastWeek > 0) win = `You have shown up for ${routineName} ${s.thisWeek} times this week, up from ${s.lastWeek} last week.`;
  else win = `${routineName} is done for today, check-in number ${s.showedUp} this month.`;

  const top = s.topActivities[0];
  let idea;
  if (top) {
    idea = `Next session, turn "${top.body}" into a game: beat today by one small notch, one more rep or one more minute, and call it a personal record.`;
  } else if (s.late > s.onTime) {
    idea = 'Next session, race the clock: start the moment the window opens and see if the first step is done inside two minutes.';
  } else {
    idea = `Next session, pair ${routineName} with something you love, a favourite playlist or a treat you only get then, so the routine itself becomes the reward.`;
  }

  return `${win} ${idea} ${capFirst(s.milestone)}, so see you there.`;
}

/** First three sentences of the model's prose, as one plain paragraph. */
function threeSentences(text) {
  const plain = String(text || '')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•\d.)]+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = plain.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length < 3) return '';
  return sentences.slice(0, 3).map((x) => x.trim()).join(' ');
}

const SYSTEM_PROMPT = 'You are an upbeat routine coach inside a habit app, writing the first '
  + 'message the user sees right after ticking a routine. Your job is to make them excited '
  + 'to come back for the next session. Write EXACTLY three short sentences as one plain '
  + 'paragraph, under 70 words, with no lists, headings, emoji or greeting.\n'
  + 'Sentence 1 celebrates a real win from the data with a number: the current run, a '
  + 'personal best, more check-ins than last week, K/D/G earned, or how often an activity '
  + 'got done.\n'
  + 'Sentence 2 gives ONE fresh, specific and playful idea that makes the next session more '
  + 'rewarding, such as a micro-challenge, beating a personal record by one notch, a bonus '
  + 'round, pairing it with something they enjoy, a surprise variation, or moving the next '
  + 'step from their area/project forward. Tie it to their actual activities or next steps. '
  + 'Never give generic advice such as setting alarms, scheduling it, or preparing the night '
  + 'before.\n'
  + 'Sentence 3 ends on anticipation with the next target within reach, as given.\n'
  + 'Never shame or lecture. Do not lead with late or missed counts; mention a slip only as '
  + 'a record to beat. Call something a best or a record only when the data says it is. '
  + 'Never invent data, times or plans that are not given.';

async function generateRoutineInsight({ summary, routineName, brief }) {
  const context = String(brief || '').slice(0, BRIEF_MAX);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Routine: ${routineName || 'this routine'}\n${describeHistory(summary)}`
        + `${context ? `\nArea / project context (description and next steps):\n${context}` : ''}`
        + '\n\nWrite the three sentences.',
    },
  ];
  try {
    const { content, model } = await completeChat(messages, { maxTokens: 400 });
    const paragraph = threeSentences(content);
    if (paragraph) return { text: paragraph, model };
  } catch (error) {
    // Fall through to the measured fallback: the user ticked and expects an answer.
  }
  return { text: fallbackInsight(summary, routineName), model: null };
}

module.exports = {
  LOOKBACK_DAYS,
  previousDates,
  summariseRoutineHistory,
  nextMilestone,
  describeHistory,
  fallbackInsight,
  threeSentences,
  generateRoutineInsight,
};
