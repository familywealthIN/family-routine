/**
 * Pure derivations for the Groups page (`packages/design/Groups.dc.html`).
 *
 * The server hands us, per group member, the last seven `Routine` documents
 * (`routinesByGroupEmail`) — a date and a tasklist of `{ name, time, points,
 * ticked, passed, wait }`. Everything the redesign shows is derived from that
 * here: the day scores behind the seven dots, the week grid, the "what are they
 * doing right now" line, the group pulse.
 *
 * Nothing here touches Apollo, Vue or the DOM, so the two rules that are easy to
 * get wrong — today is not scored yet, and a routine not yet reached today is
 * NOT a miss — are unit-testable in isolation.
 */
import moment from 'moment';
import {
  scoreColor, scoreIcon, TODAY_DOT_BG, WEEK_CELL,
} from '@routine-notes/ui/constants/groups';
import { toMinutes } from './routineFocusModel';

export const DAY_FORMAT = 'DD-MM-YYYY';

/** The window the page shows: today plus the six days before it. */
export const WINDOW_DAYS = 7;

/** A day counts toward a streak at this many ticked routines (same bar as Home). */
export const STREAK_TICKS = 3;

/** "Finished X · n min ago" only reads as *recent* inside this window. */
export const RECENT_MINUTES = 60;

/**
 * A past day with no routine document is *unknown*, not a 0% failure: the
 * member may not have opened the app, or the read may not reach that far back.
 * It gets a flat neutral grey with no glyph, never the red ✕ of a real miss.
 */
export const NO_DATA_DOT_BG = 'rgba(0,0,0,.08)';

/**
 * The week grid's equivalent: a day with no routine document draws blank
 * (`nodata`) cells and a "–" DAY SCORE — never the missed grey and a fake 0%.
 */
export const NO_DATA_CELL_BG = 'transparent';
export const NO_DATA_TOTAL = { value: '–', color: 'rgba(0,0,0,.3)' };

/**
 * A day's score as a percentage, weighted by each routine's points so a skipped
 * 40-point routine costs more than a skipped 5-point one. Falls back to a plain
 * ticked/total ratio when a day carries no points at all.
 */
export function dayScore(routine) {
  const tasks = (routine && routine.tasklist) || [];
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, task) => sum + (Number(task.points) || 0), 0);
  if (!total) {
    const ticked = tasks.filter((task) => task.ticked).length;
    return Math.round((ticked / tasks.length) * 100);
  }
  const earned = tasks.reduce(
    (sum, task) => (task.ticked ? sum + (Number(task.points) || 0) : sum),
    0,
  );
  return Math.round((earned / total) * 100);
}

export function tickedCount(routine) {
  return ((routine && routine.tasklist) || []).filter((task) => task.ticked).length;
}

/** Oldest-first list of the `size` dates ending at `today`. */
export function dayWindow(today, size = WINDOW_DAYS) {
  const end = moment(today, DAY_FORMAT);
  const dates = [];
  for (let back = size - 1; back >= 0; back -= 1) {
    dates.push(end.clone().subtract(back, 'days').format(DAY_FORMAT));
  }
  return dates;
}

export function routinesByDate(routines) {
  const map = {};
  (routines || []).forEach((routine) => {
    if (routine && routine.date) map[routine.date] = routine;
  });
  return map;
}

/**
 * The seven columns every part of the page shares: one entry per date in the
 * window, carrying that day's routine document (or none) and its score.
 */
export function memberDays(routines, today) {
  const byDate = routinesByDate(routines);
  return dayWindow(today).map((date) => {
    const routine = byDate[date] || null;
    return {
      date,
      routine,
      hasData: !!routine,
      isToday: date === today,
      label: moment(date, DAY_FORMAT).format('ddd'),
      score: dayScore(routine),
      ticked: tickedCount(routine),
    };
  });
}

/**
 * The member's week average. Today is included — the design's pulse arithmetic
 * averages all seven columns — so a fresh morning pulls the average down the way
 * the mock's does.
 */
export function weekAverage(days) {
  if (!days || !days.length) return 0;
  const sum = days.reduce((total, day) => total + (Number(day.score) || 0), 0);
  return Math.round(sum / days.length);
}

/**
 * The seven dots. Today's is the exception the design calls out: a flat blue
 * tint with NO icon, because the day has not finished and cannot be judged yet.
 */
export function sevenDayDots(days) {
  return (days || []).map((day) => {
    if (day.isToday) {
      return {
        key: day.date,
        date: day.date,
        title: 'Today · still going',
        bg: TODAY_DOT_BG,
        icon: '',
        isToday: true,
      };
    }
    if (!day.hasData) {
      return {
        key: day.date,
        date: day.date,
        title: `${day.label} · nothing logged`,
        bg: NO_DATA_DOT_BG,
        icon: '',
        isToday: false,
      };
    }
    return {
      key: day.date,
      date: day.date,
      title: `${day.label} · ${day.score}%`,
      bg: scoreColor(day.score),
      icon: scoreIcon(day.score),
      isToday: false,
    };
  });
}

/** Tasks in clock order. The server sorts them, but never trust a list's order. */
function orderedTasks(routine) {
  const tasks = ((routine && routine.tasklist) || []).filter(Boolean);
  return tasks.slice().sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/**
 * Every routine the member ran at any point in the window, one grid row each,
 * in clock order. Keyed by name + time because a `RoutineItem` id is reused
 * across days and is therefore not a per-row identity.
 */
export function weekRoutineRows(days) {
  const rows = [];
  const seen = {};
  (days || []).forEach((day) => {
    orderedTasks(day.routine).forEach((task) => {
      const key = `${task.time}|${task.name}`;
      if (seen[key]) return;
      seen[key] = true;
      rows.push({ key, name: task.name, time: task.time });
    });
  });
  return rows.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/**
 * One cell of the week grid.
 *
 * Three states, and the third is the one that matters: a routine on TODAY whose
 * time has not arrived yet is `later` — transparent with a dashed ring — so it
 * cannot be misread as a miss. Only a day that has actually gone by can miss.
 *
 * A fourth, `nodata`, sits outside that: a day with no routine document at all
 * is unknown, not missed, so its cells draw blank (as `sevenDayDots` does).
 */
export function weekCell(day, row, nowMinutes) {
  if (!day.hasData) {
    return {
      key: `${row.key}|${day.date}`,
      state: 'nodata',
      missed: false,
      title: `${row.name} · ${day.isToday ? 'Today' : day.label} · nothing logged`,
      bg: NO_DATA_CELL_BG,
      ring: day.isToday ? WEEK_CELL.todayRing : WEEK_CELL.noRing,
      icon: '',
    };
  }
  const task = orderedTasks(day.routine).find(
    (entry) => entry.name === row.name && entry.time === row.time,
  );
  const ticked = !!(task && task.ticked);
  const later = !ticked && day.isToday && toMinutes(row.time) > nowMinutes;

  let state = 'missed';
  if (ticked) state = 'done';
  else if (later) state = 'later';

  const stateLabel = { done: 'ticked', missed: 'missed', later: 'later today' }[state];
  // Today's column gets the blue inset ring — except where the cell is `later`,
  // whose dashed ring is a border and so belongs to the organism's CSS.
  let ring = WEEK_CELL.noRing;
  if (state !== 'later' && day.isToday) ring = WEEK_CELL.todayRing;

  return {
    key: `${row.key}|${day.date}`,
    state,
    missed: state === 'missed',
    title: `${row.name} · ${day.isToday ? 'Today' : day.label} · ${stateLabel}`,
    bg: { done: WEEK_CELL.doneBg, missed: WEEK_CELL.missedBg, later: WEEK_CELL.laterBg }[state],
    ring,
    icon: state === 'done' ? 'check' : '',
  };
}

/** The whole routines x days grid, plus its column heads and DAY SCORE row. */
export function weekGrid(days, nowMinutes) {
  const rows = weekRoutineRows(days);
  return {
    dayHeads: (days || []).map((day) => ({
      key: day.date,
      label: day.isToday ? 'Today' : day.label,
      isToday: day.isToday,
      color: day.isToday ? '#288bd5' : 'rgba(0,0,0,.45)',
    })),
    rows: rows.map((row) => ({
      ...row,
      cells: (days || []).map((day) => weekCell(day, row, nowMinutes)),
    })),
    dayTotals: (days || []).map((day) => (day.hasData
      ? { key: day.date, value: `${day.score}%`, color: scoreColor(day.score) }
      : { key: day.date, ...NO_DATA_TOTAL })),
  };
}

function agoLabel(minutes) {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

/**
 * The routine whose window contains `now` — the same rule the Home screen uses,
 * expressed in minutes because a group member's day is read, not driven.
 */
export function currentTask(routine, nowMinutes) {
  const tasks = orderedTasks(routine);
  if (!tasks.length) return null;
  return tasks.find((task, index) => {
    const start = toMinutes(task.time);
    const next = tasks[index + 1];
    const end = next ? toMinutes(next.time) : 24 * 60;
    if (index === 0 && nowMinutes < start) return true;
    return nowMinutes >= start && nowMinutes < end;
  }) || null;
}

/** The most recent ticked routine that was due at or before `now`. */
export function lastTicked(routine, nowMinutes) {
  const done = orderedTasks(routine)
    .filter((task) => task.ticked && toMinutes(task.time) <= nowMinutes);
  return done.length ? done[done.length - 1] : null;
}

/**
 * "What is this person doing right now" — the row's second line.
 *
 * NOTE (server gap): a `RoutineItem` carries no completion timestamp, so
 * "12 min ago" is measured from when the routine was *due*, not when it was
 * actually ticked. It is the closest honest reading available today.
 */
export function nowLine(routine, nowMinutes) {
  const tasks = orderedTasks(routine);
  if (!tasks.length) return { text: 'No routine logged today', live: false };

  const current = currentTask(routine, nowMinutes);
  const done = tasks.filter((task) => task.ticked).length;

  if (current && !current.ticked && toMinutes(current.time) <= nowMinutes) {
    return {
      text: done
        ? `In ${current.name} · ${done} of ${tasks.length} done`
        : `In ${current.name} · just started`,
      live: true,
    };
  }

  const finished = lastTicked(routine, nowMinutes);
  const since = finished ? nowMinutes - toMinutes(finished.time) : Infinity;
  if (finished && since <= RECENT_MINUTES) {
    return { text: `Finished ${finished.name} · ${agoLabel(since)}`, live: false };
  }

  const next = tasks.find((task) => !task.ticked && toMinutes(task.time) > nowMinutes);
  if (next) return { text: `Next: ${next.name} at ${next.time}`, live: false };
  if (finished) return { text: `Finished ${finished.name} · ${agoLabel(since)}`, live: false };
  return { text: 'Nothing ticked today', live: false };
}

/**
 * Did this member finish a routine in the last hour? Feeds the pulse card's
 * avatar stack and its "{n} of {m} finished a routine in the last hour".
 * Same server gap as `nowLine` — measured from the routine's due time.
 */
export function finishedWithinHour(routine, nowMinutes) {
  const finished = lastTicked(routine, nowMinutes);
  if (!finished) return false;
  return nowMinutes - toMinutes(finished.time) <= RECENT_MINUTES;
}

/**
 * Consecutive days clearing the 3-ticked bar, newest first. Today is allowed to
 * be short — a streak is not broken at 09:00 — so it only ever adds.
 *
 * NOTE (server gap): there is no stored per-member streak, so this can never
 * read further back than the seven days `routinesByGroupEmail` returns.
 */
export function memberStreak(days) {
  const list = (days || []).slice().reverse();
  let streak = 0;
  for (let i = 0; i < list.length; i += 1) {
    const day = list[i];
    if (day.ticked >= STREAK_TICKS) streak += 1;
    else if (!day.isToday) break;
  }
  return streak;
}

/**
 * The group pulse: the rounded mean of each member's week average, plus the line
 * the design writes under it. Below 70 it names anyone whose week is under 50 —
 * except you: the pulse never tells you to nudge yourself. A group of one (no
 * group yet, or everyone else left) has nobody to compare with or nudge, so it
 * gets its own line instead of the group arithmetic.
 */
export function groupPulse(entries, myEmail = '') {
  const list = (entries || []).filter(Boolean);
  if (!list.length) return { average: 0, line: 'No one to compare with yet.' };

  const average = Math.round(
    list.reduce((sum, entry) => sum + (Number(entry.average) || 0), 0) / list.length,
  );
  if (list.length === 1) {
    return { average, line: 'Just you so far. Invite someone to share the week with.' };
  }
  if (average >= 70) {
    return { average, line: 'Strong week. Everyone is showing up.' };
  }
  const mine = String(myEmail || '').toLowerCase();
  const laggards = list
    .filter((entry) => !mine || String(entry.email || '').toLowerCase() !== mine)
    .filter((entry) => (Number(entry.average) || 0) < 50)
    .map((entry) => String(entry.name || '').trim().split(/\s+/)[0])
    .filter(Boolean);
  const names = laggards.length ? laggards.join(' and ') : 'Nobody';
  return {
    average,
    line: `Average across ${list.length} member${list.length === 1 ? '' : 's'}. `
      + `${names} could use a nudge.`,
  };
}

/**
 * You first, then today's score descending. Ties keep their incoming order, so
 * the list does not reshuffle while seven per-member reads land one by one.
 */
export function sortMembers(members, myEmail) {
  const mine = String(myEmail || '').toLowerCase();
  return (members || [])
    .map((member, index) => ({ member, index }))
    .sort((a, b) => {
      const aYou = String(a.member.email || '').toLowerCase() === mine ? 1 : 0;
      const bYou = String(b.member.email || '').toLowerCase() === mine ? 1 : 0;
      if (aYou !== bYou) return bYou - aYou;
      const diff = (Number(b.member.todayScore) || 0) - (Number(a.member.todayScore) || 0);
      if (diff) return diff;
      return a.index - b.index;
    })
    .map((entry) => entry.member);
}

/** "Priya, Sam and Leo" — the names the leave-group sheet promises you lose. */
export function otherNames(members, myEmail) {
  const mine = String(myEmail || '').toLowerCase();
  const names = (members || [])
    .filter((member) => String(member.email || '').toLowerCase() !== mine)
    .map((member) => String(member.name || member.email || '').trim().split(/\s+/)[0])
    .filter(Boolean);
  if (!names.length) return 'the others';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default {
  DAY_FORMAT,
  WINDOW_DAYS,
  STREAK_TICKS,
  RECENT_MINUTES,
  NO_DATA_DOT_BG,
  NO_DATA_CELL_BG,
  NO_DATA_TOTAL,
  dayScore,
  tickedCount,
  dayWindow,
  routinesByDate,
  memberDays,
  weekAverage,
  sevenDayDots,
  weekRoutineRows,
  weekCell,
  weekGrid,
  currentTask,
  lastTicked,
  nowLine,
  finishedWithinHour,
  memberStreak,
  groupPulse,
  sortMembers,
  otherNames,
};
