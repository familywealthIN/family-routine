/**
 * Day-level notifications — everything that is not a single routine's cue.
 * Pure: lifecycle-notifications.js loads the data and sends what this returns.
 *
 *   morning   Good morning + the day's context (routines, first up, the run
 *             at stake, tasks already planned)
 *   plan      Day planning with suggested tasks, only when nothing is planned
 *   evening   End of day progress
 *   streak    A routine's run just reached a milestone — celebrate it
 *   reengage  Not using the app: 2, 7 and 14 days away, then silence
 *   insights  Using the app daily, ticking the routines the AI writes
 *             insights for, but never opening them — show what they say
 *
 * Guardrails: each notification has a once-only key (logged before sending),
 * at most DAILY_CAP a day, scheduled ones only inside their hour window, and
 * people who have been away get only the re-engagement message — not a
 * morning brief every day for an app they stopped opening.
 */
const moment = require('moment');
const {
  toMinutes, historyDates, shiftDate, itemHistory, firstStep,
} = require('../cue/cueEngine');

const DAILY_CAP = 4;
const WINDOW = 60; // minutes a scheduled notification may still go out late
const PLAN_AFTER_MORNING = 30;
const REENGAGE_AFTER_MORNING = 180; // ~10:00 with the default 07:00 morning
const INSIGHTS_BEFORE_EVENING = 120;
const QUIET_START = toMinutes('22:30');
const QUIET_END = toMinutes('06:00');
const AWAY_DAYS = [2, 7, 14]; // last one is the final attempt
const MILESTONES = [3, 7, 14, 21, 30, 50, 100];
const STREAK_DAYS = 100; // history loaded; runs are counted up to this long
const INSIGHT_ICON = 'tips_and_updates';
const MAX_BODY = 160;
// A routine can be ticked until 30 minutes after its time; after that only the
// paid late check-in can tick it, so it is never suggested as still to do.
const TICK_CLOSES_AFTER = 30;

const inWindow = (nowMinute, start) => start !== null
  && nowMinute >= start && nowMinute < start + WINDOW;
const clip = (text, n = MAX_BODY) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const findTask = (routine, id) => routine && (routine.tasklist || [])
  .find((t) => String(t._id || t.id) === String(id));
const parseDate = (date) => moment(date, 'DD-MM-YYYY');
const isOpen = (g) => g && !g.isComplete && g.status !== 'done';
/** The first routine not ticked yet whose tick window has not closed. */
const nextOpen = (list, nowMinute) => list
  .find((x) => !x.ticked && toMinutes(x.item.time) + TICK_CLOSES_AFTER >= nowMinute);

/** Whole days since the person last opened the app (a day doc exists). */
function daysAway(routines, today) {
  const dates = routines.map((r) => r.date).filter(Boolean);
  if (!dates.length) return { days: Infinity, lastDate: null };
  const last = dates.reduce((a, b) => (parseDate(a).isAfter(parseDate(b)) ? a : b));
  return { days: parseDate(today).diff(parseDate(last), 'days'), lastDate: last };
}

/** Today's routine items, in time order, with today's state. */
function todaysItems(items, todayRoutine) {
  return items
    .filter((i) => toMinutes(i.time) !== null)
    .filter((i) => !todayRoutine || findTask(todayRoutine, i._id))
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .map((item) => {
      const task = findTask(todayRoutine, item._id);
      return { item, ticked: !!(task && task.ticked) };
    });
}

function streaks(ctx) {
  return ctx.items.map((item) => {
    const h = itemHistory({
      itemId: item._id, routines: ctx.routines, today: ctx.today, timezone: ctx.timezone, days: STREAK_DAYS,
    });
    const task = findTask(ctx.todayRoutine, item._id);
    const tickedToday = !!(task && task.ticked);
    return {
      item, before: h.streak, now: tickedToday ? h.streak + 1 : h.streak, tickedToday,
    };
  });
}

function morning(ctx) {
  const { todayRoutine, list, runs } = ctx;
  if (todayRoutine && todayRoutine.skip) {
    return { title: 'Good morning ☀️ Rest day', body: 'Your routines are paused today — enjoy it.', route: '/home' };
  }
  if (!list.length) return null;
  const first = nextOpen(list, ctx.nowMinute);
  const parts = [`${plural(list.length, 'routine')} today`];
  if (first) {
    // The routine's first step is the cue that starts it; name it here too.
    const step = firstStep(first.item);
    parts.push(`first up: ${first.item.name} at ${first.item.time}${step ? ` — first step: ${step}` : ''}`);
  }
  const atStake = runs.filter((r) => r.before >= 2).sort((a, b) => b.before - a.before)[0];
  if (atStake) parts.push(`keep your ${atStake.before}-day ${atStake.item.name} run going`);
  const planned = ctx.dayGoals.filter(isOpen).length;
  if (planned) parts.push(`${plural(planned, 'task')} planned`);
  return { title: 'Good morning ☀️', body: clip(parts.join(' · ')), route: '/home' };
}

function plan(ctx) {
  if (ctx.dayGoals.some(isOpen)) return null; // already planned
  const suggested = [
    ...ctx.carryOver.filter(isOpen),
    ...ctx.weekGoals.filter(isOpen),
  ].map((g) => g.body).filter(Boolean);
  const unique = Array.from(new Set(suggested)).slice(0, 3);
  if (!unique.length) return null;
  return {
    title: 'Plan your day',
    body: clip(`Suggested: ${unique.join(' · ')}. Pick one to start.`),
    route: '/goals',
  };
}

function evening(ctx) {
  const { todayRoutine, list, runs } = ctx;
  if (!todayRoutine || todayRoutine.skip || !list.length) return null;
  const done = list.filter((x) => x.ticked);
  const points = done.reduce((sum, x) => sum + (Number(x.item.points) || 0), 0);
  const extended = runs.filter((r) => r.tickedToday && r.now >= 2).length;
  const next = nextOpen(list, ctx.nowMinute);
  const perfect = done.length === list.length;
  const parts = [];
  if (points) parts.push(`+${points} pts`);
  if (extended) parts.push(`${plural(extended, 'run')} kept alive`);
  if (next) parts.push(`still time for ${next.item.name} — two minutes counts`);
  else if (ctx.items.length) {
    const first = [...ctx.items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))[0];
    parts.push(`tomorrow starts with ${first.name} at ${first.time}`);
  }
  return {
    title: perfect ? `Perfect day 🎉 ${done.length}/${list.length}` : `Today: ${done.length}/${list.length} routines`,
    body: clip(parts.join(' · ') || 'Tomorrow is a fresh start.'),
    route: '/progress/day',
  };
}

function streakCelebration(ctx) {
  const hits = ctx.runs.filter((r) => r.tickedToday && MILESTONES.includes(r.now));
  if (!hits.length) return null;
  const top = hits.sort((a, b) => b.now - a.now)[0];
  const next = MILESTONES.find((m) => m > top.now);
  const others = hits.length > 1 ? ` (+${plural(hits.length - 1, 'more run')})` : '';
  return {
    key: `streak:${hits.map((h) => `${h.item._id}:${h.now}`).sort().join(',')}:${ctx.today}`,
    title: clip(`🔥 ${top.now}-day streak: ${top.item.name}!${others}`, 60),
    body: `Every tick is a vote for who you're becoming.${next ? ` Next milestone: ${next} days.` : ''}`,
    route: '/home',
  };
}

function reengage(ctx) {
  const { days, lastDate } = ctx.away;
  const level = [...AWAY_DAYS].reverse().find((d) => days >= d);
  if (!level || !Number.isFinite(days) || !ctx.items.length) return null;
  const smallest = [...ctx.items].sort((a, b) => (Number(a.points) || 0) - (Number(b.points) || 0))[0];
  const copy = {
    2: { title: 'Never miss twice', body: `One day off is fine. Today is the one that counts — just ${smallest.name}, two minutes.` },
    7: { title: 'Fresh start?', body: `Pick up with one routine: ${smallest.name}. Small beats perfect.` },
    14: { title: 'Your routines are waiting', body: 'Whenever you are ready, open the app and tick one thing. This is our last nudge.' },
  }[level];
  return { key: `reengage:${level}:${lastDate}`, ...copy, route: '/home' };
}

/**
 * Not using AI correctly: shows up daily, ticks the routine the insights are
 * written for (so the insight's next steps are what they are already doing),
 * but has not opened the chat — no message of their own, nothing added.
 */
function insightNudge(ctx) {
  const since7 = ctx.now.getTime() - 7 * 86400000;
  const since14 = ctx.now.getTime() - 14 * 86400000;
  const at = (m) => new Date(m.createdAt).getTime();
  const engaged = ctx.chats.some((m) => at(m) >= since14 && (m.from === 'me' || m.added));
  if (engaged) return null;

  const last7 = historyDates(ctx.today, 6);
  const activeDays = ctx.routines.filter((r) => last7.includes(r.date)
    && (r.tasklist || []).some((t) => t.ticked)).length;
  if (activeDays < 5) return null;

  const insights = ctx.chats.filter((m) => m.from === 'routine' && m.icon === INSIGHT_ICON && at(m) >= since7);
  if (insights.length < 3) return null;

  const byRef = insights.reduce((map, m) => map.set(m.taskRef, [...(map.get(m.taskRef) || []), m]), new Map());
  const [taskRef, list] = [...byRef.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const item = ctx.items.find((i) => String(i._id) === String(taskRef));
  if (!item) return null;
  const ticks = ctx.routines.filter((r) => last7.includes(r.date)
    && (findTask(r, taskRef) || {}).ticked).length;
  if (ticks < 4) return null; // their daily input is this routine

  const latest = [...list].sort((a, b) => at(b) - at(a))[0];
  return {
    key: `insights:${parseDate(ctx.today).format('GGGG-[W]WW')}`,
    title: clip(`${item.name}: ${plural(list.length, 'insight')} waiting for you`, 60),
    body: clip(latest.text || 'Your routine coach has next steps for what you are already doing.'),
    route: `/home/${taskRef}/insight?src=push`,
  };
}

/**
 * Everything due for one user now, most important first, within the cap.
 *
 * @param {Object} input
 * @param {Date} input.now
 * @param {string} input.timezone
 * @param {string} input.today DD-MM-YYYY
 * @param {number} input.nowMinute
 * @param {Object} input.prefs notification prefs with defaults applied
 * @param {Array} input.items decrypted routine templates
 * @param {Array} input.routines day docs for lifecycleDates(today).history
 * @param {Array} input.dayGoals today's day-goal items (decrypted)
 * @param {Array} input.carryOver yesterday's day-goal items (decrypted)
 * @param {Array} input.weekGoals this week's goal items (decrypted)
 * @param {Array} input.chats routine chat messages, last 14 days (decrypted)
 * @param {Set<string>} input.sentKeys keys already sent
 * @param {number} input.sentToday lifecycle notifications sent today
 * @returns {Array<{key, kind, title, body, route}>}
 */
function planNotifications(input) {
  const {
    nowMinute, prefs, today, sentKeys, sentToday,
  } = input;
  const todayRoutine = input.routines.find((r) => r.date === today);
  const ctx = {
    ...input,
    todayRoutine,
    list: todaysItems(input.items, todayRoutine),
    away: daysAway(input.routines, today),
  };
  ctx.runs = streaks(ctx);
  const morningAt = toMinutes(prefs.morningTime);
  const eveningAt = toMinutes(prefs.eveningTime);
  const quiet = nowMinute >= QUIET_START || nowMinute < QUIET_END;
  const active = ctx.away.days < AWAY_DAYS[0];

  const candidates = [];
  const add = (kind, enabled, due, build, key = `${kind}:${today}`) => {
    if (!enabled || !due) return;
    const n = build(ctx);
    if (n) candidates.push({ kind, key, ...n });
  };

  add('streak', prefs.streak, !quiet, streakCelebration);
  add('morning', prefs.morning, active && inWindow(nowMinute, morningAt), morning);
  add('plan', prefs.plan, active && inWindow(nowMinute, morningAt + PLAN_AFTER_MORNING), plan);
  add('evening', prefs.evening, active && inWindow(nowMinute, eveningAt), evening);
  add('insights', prefs.insights, active && inWindow(nowMinute, eveningAt - INSIGHTS_BEFORE_EVENING), insightNudge);
  add('reengage', prefs.reengage, !active && inWindow(nowMinute, morningAt + REENGAGE_AFTER_MORNING), reengage);

  const fresh = candidates.filter((c) => !sentKeys.has(c.key));
  return fresh.slice(0, Math.max(0, DAILY_CAP - sentToday));
}

/** Dates the job needs loaded: the history window and yesterday. */
const lifecycleDates = (today) => ({
  history: historyDates(today, STREAK_DAYS),
  yesterday: shiftDate(today, 1),
  week: parseDate(today).weekday(5).format('DD-MM-YYYY'),
});

module.exports = {
  DAILY_CAP,
  AWAY_DAYS,
  MILESTONES,
  daysAway,
  planNotifications,
  lifecycleDates,
};
