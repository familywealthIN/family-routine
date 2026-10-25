/**
 * routineInsight: the coach card a person reads right after ticking a routine.
 *
 * Three stages, so the message is both true and worth reading:
 *   1. summarise: this module reads the routine's last month (runs of
 *      check-ins, this week against last, today's plan and checklist, linked
 *      goals, activities done most) into plain numbers;
 *   2. diagnose: insightStrategy picks ONE hook (why this tick matters) and
 *      ONE lever (the change most likely to improve the routine), in code;
 *   3. write and check: the model turns that brief into a title, a spark and
 *      an action; `validateCard` holds it to the facts, one correction round
 *      follows, and the same brief is written without a model as the fallback.
 *
 * The summariser, validator and fallback are pure, so every decision is
 * testable without Mongo or a model.
 */
const moment = require('moment');
const { completeChat } = require('./chatApi');
const { diagnose, fallbackMessage, wordsOf } = require('./insightStrategy');
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

  // The most recent scheduled session before today: a miss there makes
  // today a comeback. Rest days and days off the list are not sessions.
  const before = today
    ? states.slice(1).find(({ state }) => state !== 'off' && state !== 'skipped')
    : null;
  summary.lastBefore = before ? before.state : null;
  summary.showedUp = summary.onTime + summary.late;
  summary.missedToday = summary.plan.filter((r) => r.state === 'missed').map((r) => r.name);
  summary.milestone = nextMilestone(summary);
  return summary;
}

const BANNED = /\b(keep it up|you'?ve got this|momentum|crush(ed|ing)?|nail(ed|ing)?|smash(ed|ing)?|just \d+ more|great job|well done|proud of you)\b/i;
const LIMITS = { title: 6, spark: 22, action: 24 };

/**
 * The writer's brief: the strategy `diagnose` chose, the facts it may quote,
 * and the shape of the answer. The model decides the words, never the angle.
 */
const SYSTEM_PROMPT = 'You write the coach card a person reads right after ticking a routine '
  + 'in Routine Notes. The analysis is already done for you: you get the HOOK (the true reason '
  + 'this tick matters), the LEVER (the one change that will make this routine better next '
  + 'time) and the FACTS you may use. Your job is the words: make them want to read it and '
  + 'want to try the idea.\n\n'
  + 'Answer with JSON only: {"title": "...", "spark": "...", "action": "..."}\n'
  + '- title: at most 6 words. A headline that makes them smile or lean in, built on the hook. '
  + 'No full stop.\n'
  + '- spark: one sentence, at most 22 words. The motivation: why this tick matters for who '
  + 'they are becoming, or for the goal or area it serves. Specific and warm, never generic.\n'
  + '- action: one sentence, at most 24 words, starting with a verb. The lever made concrete '
  + 'and vivid: exactly what to do, right now or in the next session as the LEVER says, small '
  + 'enough to start at once, and something they have not been told before.\n\n'
  + 'Rules:\n'
  + '- Use only numbers that appear in the FACTS or the LEVER, or small counts such as one or '
  + 'two minutes. Never invent data, records, times or plans.\n'
  + '- No stock phrases: "keep it up", "you have got this", "momentum", "crushed", "nailed", '
  + '"great job", "just N more". No emoji, no lists, no greeting.\n'
  + '- Never shame. Never lead with what was missed.\n'
  + '- Do not reuse an idea or phrasing from the earlier cards you are shown.';

/** The first JSON object in a reply, or null. */
function parseCard(content) {
  const match = /\{[\s\S]*\}/.exec(String(content || ''));
  if (!match) return null;
  try {
    const card = JSON.parse(match[0]);
    const clean = (v) => String(v || '').replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim();
    return {
      title: clean(card.title).replace(/[.!]+$/, ''),
      spark: clean(card.spark),
      action: clean(card.action),
    };
  } catch (e) {
    return null;
  }
}

const tokens = (text) => new Set(String(text || '').toLowerCase().match(/[a-z]{4,}/g) || []);
function overlap(a, b) {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  x.forEach((t) => { if (y.has(t)) shared += 1; });
  return shared / Math.min(x.size, y.size);
}

/**
 * Hold the card to the brief. Returns the problems found ([] = accept), so a
 * retry can tell the model exactly what to fix.
 */
function validateCard(card, strategy, previous = []) {
  if (!card) return ['the answer was not the JSON object asked for'];
  const problems = [];
  Object.keys(LIMITS).forEach((field) => {
    const n = wordsOf(card[field]).length;
    if (!n) problems.push(`${field} is empty`);
    else if (n > LIMITS[field]) problems.push(`${field} has ${n} words, the limit is ${LIMITS[field]}`);
  });
  const all = `${card.title} ${card.spark} ${card.action}`;
  const stock = BANNED.exec(all);
  if (stock) problems.push(`uses a stock phrase ("${stock[0]}")`);
  const invented = (all.match(/\d+/g) || [])
    .filter((n) => !strategy.numbers.has(n) && Number(n) > 10);
  if (invented.length) problems.push(`uses numbers not in the facts: ${invented.join(', ')}`);
  if (previous.some((text) => overlap(card.action, text) >= 0.6)) {
    problems.push('the action repeats an earlier card, so give a different idea');
  }
  return problems;
}

/**
 * The card as the thread stores it: title, spark, then the action, labelled
 * for when it is meant ("Right now" for finishing or making up today).
 */
function formatCard({ title, spark, action }, when = 'next') {
  return `${title}\n${spark}\n${when === 'now' ? 'Right now' : 'Next time'}: ${action}`;
}

function describeStrategy(strategy, routineName, context) {
  const {
    hook, lever, alternatives, facts,
  } = strategy;
  const backup = alternatives.length
    ? `(If the lever cannot be made concrete, use instead: ${alternatives[0].hint})\n`
    : '';
  const area = context ? `\nArea / project it serves (description and next steps):\n${context}` : '';
  return `Routine: ${routineName || 'this routine'}
HOOK: ${hook ? hook.evidence : 'a session done'}
LEVER (${lever.when === 'now' ? 'for RIGHT NOW, today' : 'for the NEXT session'}): ${lever.hint}
${backup}FACTS:
${facts.map((f) => `- ${f}`).join('\n')}${area}`;
}

/**
 * Diagnose in code, write with the model, validate, retry once with the
 * problems, then fall back to the same brief written without a model.
 *
 * @param {Object} p
 * @param {Object} p.summary     summariseRoutineHistory() output
 * @param {string} p.routineName
 * @param {string} [p.brief]     area/project description + next steps
 * @param {string[]} [p.previous] earlier insight texts for this routine, newest first
 * @returns {Promise<{text: string, model: string|null, strategy: string}>}
 */
async function generateRoutineInsight({
  summary, routineName, brief, previous = [],
}) {
  const context = String(brief || '').slice(0, BRIEF_MAX);
  const earlier = previous.filter(Boolean).slice(0, MAX_PREVIOUS);
  const strategy = diagnose(summary, { brief: context });
  const label = `${strategy.hook ? strategy.hook.key : 'none'}/${strategy.lever.key}`;
  const shown = earlier.map((t) => `- ${t.replace(/\n/g, ' / ')}`).join('\n');
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: describeStrategy(strategy, routineName, context)
        + (earlier.length ? `\nEarlier cards for this routine (do not repeat them):\n${shown}` : '')
        + '\n\nWrite the card.',
    },
  ];

  // The chosen model first, then the free roster. Each gets one correction
  // round: the validator's problems go back as the next turn.
  const attempts = [
    {
      models: insightModels(),
      maxTokens: 2000,
      temperature: 1,
      reasoning: { effort: 'low', exclude: true },
      // It reasons before it writes, so it gets longer than a chat turn's 20s.
      timeoutMs: 45000,
    },
    { maxTokens: 500 },
  ];
  for (let i = 0; i < attempts.length; i += 1) {
    let turn = messages;
    for (let round = 0; round < 2; round += 1) {
      let reply;
      try {
        // Sequential on purpose: each call only runs when the one before failed.
        // eslint-disable-next-line no-await-in-loop
        reply = await completeChat(turn, attempts[i]);
      } catch (error) {
        break; // this attempt's model is unavailable; try the next attempt
      }
      const card = parseCard(reply.content);
      const problems = validateCard(card, strategy, earlier);
      if (!problems.length) {
        return { text: formatCard(card, strategy.lever.when), model: reply.model, strategy: label };
      }
      turn = [
        ...messages,
        { role: 'assistant', content: String(reply.content || '') },
        { role: 'user', content: `Fix these and answer with the JSON again: ${problems.join('; ')}.` },
      ];
    }
  }
  const fallback = fallbackMessage(strategy, routineName);
  return { text: formatCard(fallback, fallback.when), model: null, strategy: label };
}

module.exports = {
  LOOKBACK_DAYS,
  DEFAULT_INSIGHT_MODEL,
  previousDates,
  periodDates,
  dayStates,
  dayPlan,
  linkedGoals,
  summariseRoutineHistory,
  nextMilestone,
  parseCard,
  validateCard,
  formatCard,
  generateRoutineInsight,
};
