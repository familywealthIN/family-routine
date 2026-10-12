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
const moment = require('moment');
const { completeChat } = require('./chatApi');
const { encryption } = require('./encryption');

// Once per routine per day, so it is worth the best writer available. The free
// roster is the safety net, then the measured fallback. Override (comma-separated
// OpenRouter ids) with ROUTINE_INSIGHT_MODEL without a deploy.
const DEFAULT_INSIGHT_MODEL = 'anthropic/claude-fable-5.1';
const insightModels = () => (process.env.ROUTINE_INSIGHT_MODEL || DEFAULT_INSIGHT_MODEL)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const MAX_PREVIOUS = 5;

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
  return `${days(target - streak)} makes ${target} in a row`;
}

/** The week and month Goal doc dates for a day: goal.js `periodGoalDates`' rule. */
function periodDates(date) {
  const m = moment(date, 'DD-MM-YYYY');
  return {
    week: m.clone().weeks(m.weeks()).weekday(5).format('DD-MM-YYYY'),
    month: m.clone().endOf('month').format('DD-MM-YYYY'),
  };
}

/**
 * Every routine on today's list, in time order, with where it stands, so the
 * message can see a missed routine worth making up and the later ones it could
 * be folded into. Routine documents are read lean, so names are decrypted here.
 */
function dayPlan(routine, taskRef) {
  if (!routine) return [];
  const ref = String(taskRef);
  return (routine.tasklist || [])
    .slice()
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    .map((t) => {
      const current = String(t._id || t.id) === ref;
      let state = 'not yet';
      if (routine.skip) state = 'rest day';
      else if (t.ticked || current) state = t.passed ? 'done late' : 'done';
      else if (t.passed) state = 'missed';
      return {
        time: t.time || '', name: encryption.decrypt(t.name || '') || 'Routine', state, current,
      };
    });
}

/** Week and month goal items this routine feeds. */
function linkedGoals(periodGoals, taskRef) {
  const ref = String(taskRef);
  const out = [];
  (periodGoals || []).forEach((goal) => {
    (goal.goalItems || []).forEach((item) => {
      if (String(item.taskRef) !== ref || !item.body) return;
      out.push({ period: goal.period, body: item.body, done: !!item.isComplete });
    });
  });
  return out;
}

/**
 * @param {Object} p
 * @param {Array}  p.routines day routine docs ({ date, skip, tasklist[] })
 * @param {Array}  p.goals    day goal docs ({ date, goalItems[] })
 * @param {string} p.taskRef  the routine item id
 * @param {string} [p.today]  DD-MM-YYYY of the tick; enables runs and the weekly trend
 * @param {Array}  [p.periodGoals] this week's and month's goal docs
 * @param {Object} [p.moment] the tick as the client saw it: { tickedAt, windowEnd, minutesLeft }
 */
function summariseRoutineHistory({
  routines = [], goals = [], taskRef, today, periodGoals = [], moment: tick = {},
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
    time: null,
    weekday: today ? WEEKDAYS[parseDate(today).getUTCDay()].slice(0, -1) : null,
    todayItems: [],
    earnedToday: { K: 0, D: 0, G: 0 },
    moment: tick || {},
    plan: dayPlan(routines.find((r) => r.date === today), taskRef),
    linked: linkedGoals(periodGoals, taskRef),
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
    if (date === today) {
      summary.todayState = state;
      summary.time = task.time || null;
      (task.stimuli || []).forEach((st) => {
        if (st && st.name in summary.earnedToday) {
          summary.earnedToday[st.name] += Math.round(Number(st.earned) || 0);
        }
      });
    }
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
        const state = item.isComplete ? (item.status === 'missed' ? 'late' : 'done') : 'not done';
        if (goal.date === today) summary.todayItems.push(`${body} (${state})`);
        if (summary.activities.length < MAX_ACTIVITIES) {
          summary.activities.push(`${item.body} (${state})`);
        }
      });
    });
  summary.topActivities = [...doneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ACTIVITIES)
    .map(([body, count]) => ({ body, count }));

  summary.showedUp = summary.onTime + summary.late;
  summary.missedToday = summary.plan.filter((r) => r.state === 'missed').map((r) => r.name);
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
  const m = s.moment || {};
  const windowText = s.time ? `window ${s.time}${m.windowEnd ? `-${m.windowEnd}` : ''}` : '';
  const left = Number.isFinite(m.minutesLeft) ? `${m.minutesLeft} min left in the window` : '';
  const momentLine = [
    m.tickedAt && `ticked at ${m.tickedAt}`, s.weekday && `on ${s.weekday}`, windowText, left, today,
  ].filter(Boolean).join(', ');
  const plan = (s.plan || []).length
    ? s.plan.map((r) => `${r.time} ${r.name} (${r.state})${r.current ? ' <- this routine' : ''}`).join('; ')
    : 'not available';
  const linked = (s.linked || []).length
    ? s.linked.map((g) => `${g.period} goal "${g.body}" (${g.done ? 'done' : 'open'})`).join('; ')
    : 'none linked';
  const earnedToday = s.earnedToday || { K: 0, D: 0, G: 0 };
  return `The moment: ${momentLine}.
Done in this session today: ${s.todayItems.length ? s.todayItems.join('; ') : 'no checklist items recorded'}
K/D/G this routine earned today: K ${earnedToday.K} · D ${earnedToday.D} · G ${earnedToday.G}
Today's whole day: ${plan}
Missed earlier today: ${(s.missedToday || []).length ? s.missedToday.join(', ') : 'nothing'}
Week / month goals this routine feeds: ${linked}
Current run of check-ins: ${s.streak} (${record})
Check-ins this week: ${s.thisWeek} · last week: ${s.lastWeek}
Last ${LOOKBACK_DAYS} days (${s.days} scheduled): ${s.showedUp} check-ins, ${s.onTime} in time (${pct(s.onTime, s.days)}%), ${s.late} late, ${s.missed} missed, ${s.skipped} rest days
K/D/G this routine earned over the last ${LOOKBACK_DAYS} days in total (not today): K ${s.earned.K} · D ${s.earned.D} · G ${s.earned.G}
Strongest day: ${s.bestWeekday || 'not enough data yet'}
Checklist work: ${items} items, ${s.itemsDone} done in time, ${s.itemsLate} done late, ${s.itemsOpen} open
Most-done activities: ${top}
Recent activities: ${s.activities.length ? s.activities.join('; ') : 'none recorded'}`;
}

const capFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** The win, the idea and the hook, built from the numbers alone, for when no model answers. */
function fallbackInsight(summary, routineName = 'this routine') {
  const s = summary;
  if (!s.showedUp) {
    return `First ${routineName} on the board. `
      + 'Next time, start the minute the window opens. '
      + 'Three in a row starts your first run.';
  }

  let win;
  if (s.streak >= 2) win = `${s.streak} in a row on ${routineName}.`;
  else if (s.thisWeek > s.lastWeek && s.lastWeek > 0) win = `${s.thisWeek} check-ins this week, up from ${s.lastWeek}.`;
  else win = `${routineName} done, number ${s.showedUp} this month.`;

  const top = s.topActivities[0];
  let idea;
  if (top) idea = `Next time, beat "${top.body}" by one rep or one minute.`;
  else if (s.late > s.onTime) idea = 'Next time, start the minute the window opens.';
  else idea = 'Next time, pair it with a song you love.';

  return `${win} ${idea} ${capFirst(s.milestone)}.`;
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

const SYSTEM_PROMPT = 'You are the coach inside Routine Notes, writing the one message the '
  + 'user reads right after ticking a routine. Read the moment: which routine, the day and '
  + 'time, what they just did in this session, how the last month has gone, and the '
  + 'area/project it serves. Then find the single most compelling thing to say to THIS person '
  + 'right NOW. The aim is a small spark of delight now and a real pull to do more in this '
  + 'routine next time.\n\n'
  + 'Craft:\n'
  + '- Exactly three SHORT sentences as one plain paragraph: at most 12 words each and 30 '
  + 'words in total, readable at a glance on a phone. One idea per sentence, no clauses '
  + 'strung together with commas or colons. No lists, headings, '
  + 'emoji, greeting or sign-off.\n'
  + '- Open with something true and specific that lands as a win: a real number, or an '
  + 'activity by name.\n'
  + '- Give ONE original idea for the next session that fits this routine, this moment and '
  + 'their goal, something they have not heard before and would actually want to try: a '
  + "challenge, a twist, a ritual, a reward, a variation, or a way to push the area's next "
  + 'step forward. Make it concrete enough to do.\n'
  + '- Use the moment itself when it helps: how early or late in the window they ticked, '
  + 'the minutes still left in it, what comes next today, and the week or month goal this '
  + 'routine feeds.\n'
  + '- If something was missed today, or this routine keeps slipping, and making it up is the '
  + 'most valuable move, make your ONE idea a quick way to compensate: a compressed version '
  + 'that fits the minutes left, or folding it into a later routine today. Name the routine '
  + 'and the time.\n'
  + '- Leave them looking forward to the next session.\n\n'
  + 'Avoid:\n'
  + '- Formulas and stock phrases such as "just N more", "keep it up", "you\'ve got this", '
  + '"momentum", "crushed", "nailed", "smash". Every message must read as written for this '
  + 'exact moment, so vary the angle and the sentence shapes.\n'
  + '- Repeating any idea or phrasing from the earlier messages you are shown.\n'
  + '- Generic productivity advice: alarms, scheduling, preparing the night before.\n'
  + '- Shame or lecturing. Never lead with late or missed counts.\n'
  + '- Calling anything a best or a record unless the data says so, or inventing data, times '
  + 'or plans that are not given.';

/**
 * @param {Object} p
 * @param {Object} p.summary     summariseRoutineHistory() output
 * @param {string} p.routineName
 * @param {string} [p.brief]     area/project description + next steps
 * @param {string[]} [p.previous] earlier insight texts for this routine, newest first
 */
async function generateRoutineInsight({
  summary, routineName, brief, previous = [],
}) {
  const context = String(brief || '').slice(0, BRIEF_MAX);
  const earlier = previous.filter(Boolean).slice(0, MAX_PREVIOUS);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Routine: ${routineName || 'this routine'}\n${describeHistory(summary)}`
        + `${context ? `\nArea / project context (description and next steps):\n${context}` : ''}`
        + `${earlier.length ? `\nEarlier messages for this routine (do not repeat them):\n${earlier.map((t) => `- ${t}`).join('\n')}` : ''}`
        + '\n\nWrite the message.',
    },
  ];

  // The chosen model first, then the free roster; either must yield three sentences.
  const attempts = [
    // Fable refuses to run with reasoning off. A little thinking, kept out of
    // the reply; the budget covers it plus the 65-word answer.
    {
      models: insightModels(),
      maxTokens: 2000,
      temperature: 1,
      reasoning: { effort: 'low', exclude: true },
    },
    { maxTokens: 400 },
  ];
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      // Sequential on purpose: the second attempt only runs when the first fails.
      // eslint-disable-next-line no-await-in-loop
      const { content, model } = await completeChat(messages, attempts[i]);
      const paragraph = threeSentences(content);
      if (paragraph) return { text: paragraph, model };
    } catch (error) {
      // Try the next attempt; the user ticked and expects an answer.
    }
  }
  return { text: fallbackInsight(summary, routineName), model: null };
}

module.exports = {
  LOOKBACK_DAYS,
  DEFAULT_INSIGHT_MODEL,
  previousDates,
  periodDates,
  dayPlan,
  linkedGoals,
  summariseRoutineHistory,
  nextMilestone,
  describeHistory,
  fallbackInsight,
  threeSentences,
  generateRoutineInsight,
};
