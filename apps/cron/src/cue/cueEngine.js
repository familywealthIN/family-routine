/**
 * Cue engine — decides WHEN to remind someone about a routine item and WHAT
 * the reminder says, from what they have actually done so far.
 *
 * Grounded in Atomic Habits' habit loop (cue → craving → response → reward):
 *
 * - Make it obvious: the cue fires a little before the time the person really
 *   does the habit (learned from `tickedAt`), not just the time they once typed
 *   in, and names the habit it is stacked after when that one is already done.
 * - Make it attractive: dopamine rises on the CUE once the cue reliably
 *   predicts a reward. So every cue states the reward at stake — the points,
 *   the next day of the run, the milestone in reach — and nothing is sent that
 *   cannot be acted on (already done, day skipped, not on today's list).
 * - Make it easy: the ask is the two-minute version (the first step).
 * - Make it satisfying: the run is shown; after one miss the copy is "never
 *   miss twice", never guilt.
 * - Avoid habituation: the copy rotates per day, and a habit that has become
 *   automatic (long run, steady time) only gets a late nudge when it is at
 *   risk, so the app fades into the background instead of nagging.
 *
 * Everything here is pure; send-notification.js does the I/O.
 */

const HISTORY_DAYS = 14;
const MIN_SAMPLES = 3; // ticks needed before the learned time is trusted
const LEAD_MINUTES = 5; // cue this long before the usual time
const EARLIEST_SHIFT = 30; // learned cue never earlier than set time - 30
const LATEST_SHIFT = 45; // ...nor later than set time + 45
const AUTOMATIC_STREAK = 21;
const AUTOMATIC_SPREAD = 15; // minutes of median absolute deviation
const AT_RISK_GRACE = 20; // automatic habits: nudge only this long after usual
const RUN_TARGETS = [3, 5, 7, 10, 14, 21, 30, 50, 100];
const MAX_TITLE = 60;
const ALARM_REPEAT = 5; // alarm re-rings once this many minutes later if not done

const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fromMinutes(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** Minute of the day for an instant in a timezone. */
function minuteOfDay(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(date));
  const get = (t) => Number((parts.find((p) => p.type === t) || {}).value);
  return (get('hour') % 24) * 60 + get('minute');
}

/** DD-MM-YYYY for `days` before a DD-MM-YYYY date. */
function shiftDate(date, days) {
  const [dd, mm, yyyy] = date.split('-').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd - days));
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

/** The dates the history query needs: today and the HISTORY_DAYS before it. */
function historyDates(today, days = HISTORY_DAYS) {
  return Array.from({ length: days + 1 }, (_, i) => shiftDate(today, i));
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** 0 (Sunday) to 6 (Saturday): the app's week runs Sunday to Saturday (moment's .week()). */
function dayOfWeek(date) {
  const [dd, mm, yyyy] = date.split('-').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd)).getUTCDay();
}
const weekday = (date) => WEEKDAYS[dayOfWeek(date)];

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// Stable small hash so the copy rotates by day but a retry in the same minute
// says the same thing.
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 4294967296;
  return h;
}

const findTask = (routine, id) => routine && (routine.tasklist || [])
  .find((t) => String(t._id || t.id) === String(id));

/**
 * What the last HISTORY_DAYS (excluding today) say about one item: newest-first
 * day states, the current run, whether yesterday was a miss, and the learned
 * time from tick timestamps.
 */
function itemHistory({
  itemId, routines, today, timezone, days = HISTORY_DAYS,
}) {
  const byDate = new Map(routines.map((r) => [r.date, r]));
  const states = historyDates(today, days).slice(1).map((date) => {
    const routine = byDate.get(date);
    if (!routine) return 'absent';
    const task = findTask(routine, itemId);
    if (!task) return 'off';
    if (routine.skip) return 'skipped';
    return task.ticked ? 'done' : 'missed';
  });

  // Skips and days the item was not on the list neither add nor break a run;
  // a day with no routine document at all (app not opened) breaks it.
  const counted = states.filter((s) => s !== 'off' && s !== 'skipped');
  let streak = 0;
  for (let i = 0; i < counted.length && counted[i] === 'done'; i += 1) streak += 1;

  const missedYesterday = counted[0] === 'missed' || counted[0] === 'absent';
  const missedTwice = missedYesterday && (counted[1] === 'missed' || counted[1] === 'absent');
  const everDone = counted.includes('done');

  // This calendar week (Sunday to today), not the rolling last 7 days.
  const todayTask = findTask(byDate.get(today), itemId);
  const doneToday = !!(todayTask && todayTask.ticked && !(byDate.get(today) || {}).skip);
  const doneThisWeek = states.slice(0, dayOfWeek(today)).filter((s) => s === 'done').length
    + (doneToday ? 1 : 0);

  // Timing is learned from the recent fortnight only, however long the run,
  // and from ticks made in the window: a late check-in (redeemed) records
  // when the person caught up, not when they do the habit.
  const samples = historyDates(today).slice(1)
    .map((date) => findTask(byDate.get(date), itemId))
    .filter((t) => t && t.ticked && t.tickedAt && !t.redeemed)
    .map((t) => minuteOfDay(t.tickedAt, timezone));

  let usual = null;
  let spread = null;
  if (samples.length >= MIN_SAMPLES) {
    usual = median(samples);
    spread = median(samples.map((m) => Math.abs(m - usual)));
  }

  // The last 7 days in plain words, for the AI cue (aiCue.js). Weekday names,
  // not dates: every number the AI may write has to be a fact it was given.
  const week = historyDates(today, 7).slice(1).map((date, i) => {
    const task = findTask(byDate.get(date), itemId);
    const at = task && task.ticked && task.tickedAt ? fromMinutes(minuteOfDay(task.tickedAt, timezone)) : null;
    return { date: weekday(date), state: states[i], at };
  });

  return {
    streak, missedYesterday, missedTwice, everDone, usual, spread, samples: samples.length, week,
    doneToday, doneThisWeek,
  };
}

/**
 * When today's cue for an item should fire, in minutes of the day.
 * `mode` is 'set' (no learned time yet), 'learned', or 'atRisk' (automatic
 * habit: only nudge when it is late against the person's own usual time).
 */
function cueTiming(setMinute, history) {
  if (history.usual === null) return { minute: setMinute, mode: 'set' };
  const automatic = history.streak >= AUTOMATIC_STREAK && history.spread <= AUTOMATIC_SPREAD;
  if (automatic) {
    return {
      minute: clamp(history.usual + AT_RISK_GRACE, setMinute, Math.min(1439, setMinute + 60)),
      mode: 'atRisk',
    };
  }
  return {
    minute: clamp(
      history.usual - LEAD_MINUTES,
      Math.max(0, setMinute - EARLIEST_SHIFT),
      Math.min(1439, setMinute + LATEST_SHIFT),
    ),
    mode: 'learned',
  };
}

function nextTarget(streak) {
  return RUN_TARGETS.find((t) => t > streak) || streak + 10;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The reward the cue predicts — the line that makes the cue worth noticing. */
function rewardLine({ points, streak }) {
  const parts = [];
  if (points > 0) parts.push(`+${points} pts`);
  if (streak > 0) {
    const day = streak + 1;
    const target = nextTarget(streak);
    parts.push(day === target ? `day ${day} 🔥 milestone` : `day ${day} 🔥 · ${plural(target - day, 'more day')} to ${target}`);
  } else {
    parts.push('day 1 of a new run');
  }
  return parts.join(' · ');
}

function twoMinuteAsk(item) {
  const first = (item.steps || []).map((s) => s && s.name).find(Boolean);
  return first ? `Just start: ${first}.` : 'Two minutes counts.';
}

/**
 * Title and body for one item's cue. Pure: everything it reads is passed in.
 */
function cueCopy({
  item, history, timing, anchor, identity, today,
}) {
  const name = item.name || 'Your routine';
  const reward = rewardLine({ points: item.points, streak: history.streak });
  const ask = twoMinuteAsk(item);
  const pick = (variants) => variants[hash(`${item._id}:${today}`) % variants.length];

  if (history.missedYesterday && !history.missedTwice && history.everDone) {
    return {
      kind: 'recovery',
      title: `${name} — never miss twice`,
      body: `Yesterday slipped; today is the one that counts. ${ask} ${reward}`,
    };
  }
  if (history.missedTwice && history.everDone) {
    return {
      kind: 'restart',
      title: `${name}: fresh start`,
      body: `Small beats perfect. ${ask} ${reward}`,
    };
  }
  if (timing.mode === 'atRisk') {
    return {
      kind: 'atRisk',
      title: `${name} — keep the ${history.streak}-day run`,
      body: `Later than your usual ${fromMinutes(history.usual)}. ${ask} ${reward}`,
    };
  }
  if (anchor) {
    return {
      kind: 'stack',
      title: `${anchor} ✓ → ${name}`,
      body: `${ask} ${reward}`,
    };
  }

  const variants = [
    { kind: 'reward', title: `${name} is up`, body: `${reward}. ${ask}` },
    { kind: 'twoMinute', title: `${name}: ${ask}`, body: reward },
  ];
  if (identity) {
    variants.push({ kind: 'identity', title: `${name} — a vote for ${identity}`, body: `${ask} ${reward}` });
  }
  return pick(variants);
}

const trim = (text) => (text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1)}…` : text);

/**
 * Every cue due for one user at `now`.
 *
 * @param {Object} input
 * @param {Date} input.now
 * @param {string} input.timezone IANA zone
 * @param {string} input.today DD-MM-YYYY in that zone
 * @param {Array} input.items the user's routine item templates (decrypted)
 * @param {Array} input.routines the user's day documents for historyDates(today)
 * @param {string} [input.identity] a short identity phrase (first motto)
 * @returns {Array<{item, title, body, kind, minute, mode}>}
 */
function dueCues({
  now, timezone, today, items, routines, identity,
}) {
  const nowMinute = minuteOfDay(now, timezone);
  const todayRoutine = routines.find((r) => r.date === today);
  if (todayRoutine && todayRoutine.skip) return [];

  const ordered = items
    .map((item) => ({ item, setMinute: toMinutes(item.time) }))
    .filter((x) => x.setMinute !== null)
    .sort((a, b) => a.setMinute - b.setMinute);

  return ordered.flatMap(({ item, setMinute }, index) => {
    const todayTask = findTask(todayRoutine, item._id);
    // Today's list exists and this item is not on it, or it is already done:
    // a cue the person cannot act on teaches them to ignore cues.
    if (todayRoutine && !todayTask) return [];
    if (todayTask && todayTask.ticked) return [];
    if (item.notifyMode === 'off') return [];

    const history = itemHistory({
      itemId: item._id, routines, today, timezone,
    });

    // An alarm is a promise to ring at the time the person set — it does not
    // drift to the learned time — and rings once more if still not done.
    if (item.notifyMode === 'alarm') {
      const repeat = nowMinute === setMinute + ALARM_REPEAT;
      if (nowMinute !== setMinute && !repeat) return [];
      return [{
        item,
        alarm: true,
        kind: repeat ? 'alarmRepeat' : 'alarm',
        title: trim(`⏰ ${item.name || 'Your routine'} · ${item.time}`),
        body: `${repeat ? 'Still on — ' : ''}${twoMinuteAsk(item)} ${rewardLine({ points: item.points, streak: history.streak })}`,
        minute: nowMinute,
        mode: 'set',
      }];
    }

    const timing = cueTiming(setMinute, history);
    if (timing.minute !== nowMinute) return [];

    // Habit stacking: the item just before this one, if it is done today.
    const prev = index > 0 ? ordered[index - 1].item : null;
    const prevTask = prev && findTask(todayRoutine, prev._id);
    const anchor = prevTask && prevTask.ticked ? prev.name : null;

    const copy = cueCopy({
      item, history, timing, anchor, identity, today,
    });
    return [{
      item, ...copy, title: trim(copy.title), minute: timing.minute, mode: timing.mode, history, anchor,
    }];
  });
}

/**
 * At most one notification per user per minute: several cues landing together
 * are batched rather than stacked, so they do not compete with each other.
 */
function batchCues(all) {
  // Alarms ring on their own channel and are never folded into a batch.
  const alarms = all.filter((c) => c.alarm);
  const cues = all.filter((c) => !c.alarm);
  if (cues.length <= 1) return [...alarms, ...cues];
  const names = cues.map((c) => c.item.name).filter(Boolean);
  return [...alarms, {
    item: cues[0].item,
    kind: 'batch',
    title: trim(`${cues.length} routines are up`),
    body: `${names.join(' · ')}. Start with the first — two minutes counts.`,
    minute: cues[0].minute,
    mode: cues[0].mode,
  }];
}

/**
 * HH:mm values of item set-times whose cue COULD land on `nowMinute`, so the
 * cron can query a narrow slice of items instead of every item every minute.
 */
function candidateSetTimes(nowMinute) {
  const out = [];
  const from = Math.max(0, nowMinute - LATEST_SHIFT - 15); // atRisk reaches +60
  const to = Math.min(1439, nowMinute + EARLIEST_SHIFT);
  for (let m = from; m <= to; m += 1) out.push(fromMinutes(m));
  return out;
}

module.exports = {
  HISTORY_DAYS,
  nextTarget,
  toMinutes,
  fromMinutes,
  minuteOfDay,
  shiftDate,
  historyDates,
  itemHistory,
  cueTiming,
  cueCopy,
  rewardLine,
  dueCues,
  batchCues,
  candidateSetTimes,
};
