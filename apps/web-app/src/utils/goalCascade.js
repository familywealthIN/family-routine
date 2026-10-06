/**
 * Pure derivations for the rebuilt Goals screen (packages/design/Goals.dc.html).
 *
 * The cascade ladder IS the navigation, so the arithmetic behind it — how close
 * a week goal is to auto-ticking, whether a routine is cleared for the day, what
 * a tick that crosses a threshold should say, which calendar day rings are
 * filled — is the page's whole behaviour. It lives here so it can be tested
 * without Apollo, Vue or a DOM, the way `utils/progressReport.js` is.
 *
 * Nothing here touches Apollo, Vue, the router or the DOM.
 *
 * TWO CASCADE RULES, AND WHY BOTH EXIST
 * -------------------------------------
 * The design's rule is routine-shaped: a day goal contributes to its routine's
 * week goal only once EVERY task under that routine for that day is done, and
 * five such days auto-tick the week goal (docs/redesign/chassis.md § "The goal
 * cascade"). The server's rule is link-shaped: `autoCheckTaskPeriod` counts the
 * child documents that hold a COMPLETE item whose `goalRef` is this goal item,
 * and publishes that count as `GoalItem.progress`.
 *
 * So `progress` is the authority on the NUMBER (it is the figure the server will
 * auto-tick on), and the routine rule is the authority on the GESTURE — which
 * tick earns the toast, the pop and the predicted +1. Nothing here invents a
 * count the server does not have: a goal item that arrived without `progress`
 * reports `null`, which the UI prints as an em dash.
 */
import moment from 'moment';
import {
  CASCADE_KEYS,
  CASCADE_RULES,
  CASCADE_TH,
  CASCADE_TABS,
  CASCADE_UNIT,
  DAY,
  WEEK,
  MONTH,
  YEAR,
  LIFETIME,
  NO_ROUTINE,
  RING_DEFAULT,
  RING_DONE,
  RING_NOW,
  addLabelFor,
  statusChip,
  thresholdChip,
} from '@routine-notes/ui/constants/goalsCascade';
import { periodGoalDates } from '@routine-notes/ui/utils/getDates';
import { findCurrentRoutine, toMinutes } from './routineFocusModel';
import { isYearGoalItem } from './yearGoalModel';

export const DATE_FORMAT = 'DD-MM-YYYY';
/** The date every lifetime goal is filed under (see GoalCreationContainer). */
export const LIFETIME_DATE = '01-01-1970';

/** A period key the URL or a caller invented falls back to the day tab. */
export function normaliseTab(key) {
  return CASCADE_KEYS.indexOf(key) === -1 ? DAY : key;
}

/**
 * The date a goal of `period` is filed under, given the day in view. The Goal
 * document's `date` is the END of its period (the week's Friday, the month's last
 * day, 31 December, and `01-01-1970` for a lifetime goal, which has no date at
 * all) — `periodGoalDates` is the server's own rule for the first three.
 */
export function goalDateFor(period, date) {
  if (period === LIFETIME) return LIFETIME_DATE;
  if (period === DAY) return date;
  return periodGoalDates(period, date);
}

/**
 * "Week 37 · 6–12 Sep" / "September 2026" / "2026" — what one level COVERS, which
 * both the rule line and the new-goal sheet's hint are built from.
 */
function windowLabel(tab, date) {
  const day = moment(date, DATE_FORMAT);
  if (!day.isValid()) return '';
  if (tab === WEEK) {
    const start = day.clone().startOf('week');
    const end = day.clone().endOf('week');
    const span = start.month() === end.month()
      ? `${start.format('D')}–${end.format('D MMM')}`
      : `${start.format('D MMM')}–${end.format('D MMM')}`;
    return `Week ${day.week()} · ${span}`;
  }
  if (tab === MONTH) return day.format('MMMM YYYY');
  if (tab === YEAR) return day.format('YYYY');
  return day.format('dddd, D MMMM');
}

/** "For today · counts toward the week" — what the sheet's date choice means. */
export function formHintFor(period, { selectedDate, today }) {
  if (period === DAY) {
    if (selectedDate === today) return 'For today · counts toward the week';
    const day = moment(selectedDate, DATE_FORMAT);
    return `For ${day.isValid() ? day.format('D MMM') : selectedDate}`;
  }
  if (period === LIFETIME) return 'No date';
  if (period === YEAR) return `${windowLabel(YEAR, selectedDate)} · opens as its own Year Goals page`;
  return windowLabel(period, selectedDate);
}

/**
 * The goal items of every loaded Goal document for one period, de-duped by id and
 * each stamped with the `period` + `date` of the document that owns it.
 *
 * A goal item does not know where it is filed — `GoalItem` carries no date of its
 * own in these reads — but every mutation on it is addressed by (id, period,
 * date). Stamping it here is the only place that mapping exists, and it is a
 * shallow COPY: the objects are Apollo's normalized records, which nothing
 * outside the cache may mutate.
 */
export function itemsFor(goals, period, date) {
  const seen = new Set();
  const out = [];
  (goals || []).forEach((goal) => {
    if (!goal || goal.period !== period) return;
    if (date && goal.date !== date) return;
    (goal.goalItems || []).forEach((item) => {
      // ARCHITECTURE § 3.6 — a repeated id is a duplicate `:key` and an
      // unreliable patch, so the list a view ever sees is de-duped here.
      if (!item || !item.id || seen.has(item.id)) return;
      seen.add(item.id);
      out.push({ ...item, period: goal.period, date: goal.date });
    });
  });
  return out;
}

/** The Goal document id that owns one period+date, for a create's cache slot. */
export function goalDocFor(goals, period, date) {
  return (goals || []).find((goal) => goal && goal.period === period && (!date || goal.date === date)) || null;
}

/** Routines in time order, with minutes parsed once. Nameless ones are dropped. */
export function orderedRoutines(routines) {
  return (routines || [])
    .filter((routine) => routine && routine.id)
    .map((routine) => ({
      id: String(routine.id),
      name: routine.name || '',
      time: routine.time || '',
      minutes: toMinutes(routine.time),
    }))
    .sort((a, b) => a.minutes - b.minutes);
}

/**
 * The routine whose window contains `now`. Reuses the home screen's rule rather
 * than inventing a second one, so the NOW badge and the focus card agree.
 */
export function currentRoutineId(routines, now) {
  const current = findCurrentRoutine(orderedRoutines(routines), now);
  return current ? String(current.id) : '';
}

/**
 * How many of the level below are done, as the server counts it — or `null` when
 * this read never carried the figure.
 *
 * Clamped to the threshold on purpose: a manual tick of a period goal routes
 * through `$goals.completeGoalItem`, which claims `progress: 100` for the
 * in-flight window (it cannot know a period goal's progress is a COUNT, not a
 * percentage). Unclamped that renders "100/5 days" for the second before the
 * refetch lands. Clamped it reads "5/5 days", which is what a manually finished
 * week goal means anyway.
 */
export function periodCount(item, period) {
  if (!item || item.progress == null) return null;
  const th = CASCADE_TH[period];
  const n = Number(item.progress);
  if (!Number.isFinite(n)) return null;
  return th ? Math.min(n, th) : n;
}

/** Done = the server ticked it, or the level below already satisfies it. */
export function periodDone(item, period) {
  if (!item) return false;
  if (item.isComplete) return true;
  const n = periodCount(item, period);
  const th = CASCADE_TH[period];
  return !!(th && n != null && n >= th);
}

/**
 * A hand tick is refused when the level below already satisfies the threshold —
 * the goal is auto-ticked, so a tap on it is a question, not an edit.
 */
export function manualTickBlocked(period, item) {
  const th = CASCADE_TH[period];
  if (!th || !item) return false;
  const n = periodCount(item, period);
  return n != null && n >= th;
}

/** "Ticked automatically" / "4 of 5 day goals" — chassis.md § cascade. */
export function blockedTickToast(period, item) {
  const th = CASCADE_TH[period];
  const n = periodCount(item, period);
  const unit = { [WEEK]: 'day', [MONTH]: 'week', [YEAR]: 'month' }[period] || 'child';
  return {
    icon: 'info',
    color: '#90caf9',
    title: 'Ticked automatically',
    sub: `${n == null ? '—' : n} of ${th} ${unit} goals are done`,
  };
}

/** Every day goal under one routine for the loaded day. */
export function routineDayItems(dayItems, taskRef) {
  return (dayItems || []).filter((item) => String(item.taskRef || '') === String(taskRef || ''));
}

/**
 * THE precondition: a day goal contributes to its routine's week goal only once
 * every task under that routine for that day is done. `extraDoneId` lets a
 * caller ask "…once this tick lands".
 */
export function routineCleared(dayItems, taskRef, extraDoneId) {
  const mine = routineDayItems(dayItems, taskRef);
  if (!mine.length) return false;
  return mine.every((item) => item.isComplete || item.id === extraDoneId);
}

/** The period goal that belongs to the same routine as a day goal. */
export function itemForRoutine(items, taskRef) {
  if (!taskRef) return null;
  return (items || []).find((item) => String(item.taskRef || '') === String(taskRef)) || null;
}

/**
 * What a day tick that clears its routine does to the levels above it — one
 * gesture, every crossing it causes, one rollup toast.
 *
 * The numbers are the server's `progress` plus the one day this tick just
 * completed. They are a PREDICTION: the caller refetches the cascade read right
 * after the mutation, and the server's own count replaces them. A level whose
 * `progress` never arrived predicts nothing (`null`) rather than guessing 1.
 */
export function tickDayOutcome({
  dayItems, weekItems, monthItems, yearItems, item, routines, isToday,
}) {
  const empty = {
    pop: [], crossings: [], ticks: [], toast: null,
  };
  if (!item || !item.taskRef || !isToday) return empty;
  if (!routineCleared(dayItems, item.taskRef, item.id)) return empty;

  const routine = orderedRoutines(routines).find((r) => r.id === String(item.taskRef));
  const rname = (routine && routine.name) || NO_ROUTINE.name;
  const week = itemForRoutine(weekItems, item.taskRef);

  if (!week) {
    return {
      pop: [],
      crossings: [],
      ticks: [],
      toast: {
        icon: 'task_alt',
        color: '#81c784',
        title: `${rname} cleared for today`,
        sub: 'No week goal on this routine yet',
      },
    };
  }

  /**
   * The parent tick this crossing has to SEND.
   *
   * The server only runs its own roll-up from `completeGoalItem` when the day is
   * Thursday or later (`weekday() >= threshold.weekDays - 1`), so on a Monday
   * nothing above the day would ever close. The design says a tick that crosses a
   * threshold cascades immediately, so the crossing is sent explicitly — one
   * mutation per level, in order, which is what `GoalPeriodTickContainer` applies.
   */
  const parentTick = (parent) => ({
    id: parent.id,
    period: parent.period,
    date: parent.date,
    taskRef: parent.taskRef || '',
    isComplete: true,
    isMilestone: !!parent.isMilestone,
  });

  const step = (level, parent) => {
    const before = periodCount(parent, level);
    const after = before == null ? null : Math.min(before + 1, CASCADE_TH[level]);
    const wasDone = periodDone(parent, level);
    const isDone = !!parent.isComplete || (after != null && after >= CASCADE_TH[level]);
    return {
      before, after, wasDone, isDone, crossed: !wasDone && isDone,
    };
  };

  const w = step(WEEK, week);
  const count = (n, level) => `${n == null ? '—' : n}/${CASCADE_TH[level]} ${CASCADE_UNIT[level]}`;

  if (!w.crossed) {
    return {
      pop: [WEEK],
      crossings: [],
      ticks: [],
      toast: {
        icon: 'check_circle',
        color: '#81c784',
        title: `${rname} cleared for today`,
        sub: `“${week.body}” → ${count(w.after, WEEK)}`,
      },
    };
  }

  const pop = [WEEK];
  const crossings = [WEEK];
  const ticks = [parentTick(week)];
  const month = itemForRoutine(monthItems, item.taskRef);
  if (!month) {
    return {
      pop,
      crossings,
      ticks,
      toast: {
        icon: 'event_available',
        color: '#81c784',
        title: `“${week.body}” auto-ticked`,
        sub: count(w.after, WEEK),
      },
    };
  }

  const m = step(MONTH, month);
  pop.push(MONTH);
  let sub = `${month.body} → ${count(m.after, MONTH)}`;

  if (m.crossed) {
    crossings.push(MONTH);
    ticks.push(parentTick(month));
    const year = itemForRoutine(yearItems, item.taskRef);
    if (year) {
      const y = step(YEAR, year);
      pop.push(YEAR);
      if (y.crossed) {
        crossings.push(YEAR);
        ticks.push(parentTick(year));
      }
      sub += ` · ${year.body} → ${count(y.after, YEAR)}`;
    }
  }

  return {
    pop,
    crossings,
    ticks,
    toast: {
      icon: 'event_available',
      color: '#81c784',
      title: `“${week.body}” auto-ticked · ${count(w.after, WEEK)}`,
      sub,
    },
  };
}

/**
 * One tap on one row, resolved into what to SEND, what to SAY and what to POP.
 *
 * The three outcomes the design distinguishes:
 *   - a day row: tick it, and if that clears its routine, send every threshold
 *     the clearance crossed in the same gesture;
 *   - a week / month row the level below already satisfies: send nothing and say
 *     "Ticked automatically";
 *   - a year row: nothing at all. A year goal NAVIGATES (`navigate`), because its
 *     own page is where its months live.
 *
 * Untick never cascades: taking a day back cannot complete a week.
 */
export function planRowTick({
  row, items = {}, routines, isToday,
}) {
  const nothing = {
    ticks: [], toast: null, pop: [], blocked: false, navigate: '',
  };
  if (!row || !row.id) return nothing;
  if (row.period === YEAR) return { ...nothing, navigate: row.id };

  const self = {
    id: row.id,
    period: row.period,
    date: row.date,
    taskRef: row.taskRef || '',
    isComplete: !row.done,
    isMilestone: !!row.isMilestone,
  };

  if (row.period === DAY) {
    if (row.done) return { ...nothing, ticks: [self] };
    const outcome = tickDayOutcome({
      dayItems: items[DAY],
      weekItems: items[WEEK],
      monthItems: items[MONTH],
      yearItems: items[YEAR],
      item: { id: row.id, taskRef: row.taskRef },
      routines,
      isToday,
    });
    return {
      ...nothing,
      ticks: [self, ...outcome.ticks],
      toast: outcome.toast,
      pop: outcome.pop,
    };
  }

  const item = (items[row.period] || []).find((candidate) => candidate.id === row.id) || null;
  if (!row.done && manualTickBlocked(row.period, item)) {
    return { ...nothing, toast: blockedTickToast(row.period, item), blocked: true };
  }
  return { ...nothing, ticks: [self] };
}

// ---------------------------------------------------------------------------
// Rows and groups
// ---------------------------------------------------------------------------

function dayRow(item) {
  return {
    key: item.id,
    id: item.id,
    kind: 'check',
    taskRef: item.taskRef || '',
    body: item.body || '',
    done: !!item.isComplete,
    period: DAY,
    date: item.date,
    isMilestone: !!item.isMilestone,
    strike: true,
  };
}

function barRow(item, period) {
  const th = CASCADE_TH[period];
  const n = periodCount(item, period);
  const done = periodDone(item, period);
  return {
    key: item.id,
    id: item.id,
    kind: 'bar',
    taskRef: item.taskRef || '',
    body: item.body || '',
    done,
    period,
    date: item.date,
    isMilestone: !!item.isMilestone,
    strike: false,
    // An em dash, never a 0: a read that did not carry `progress` knows nothing
    // about this goal's streak, and "0/5 days" would be a claim.
    barLabel: `${n == null ? '—' : n}/${th} ${CASCADE_UNIT[period]}`,
    barPct: n == null ? 0 : Math.min(100, (n / th) * 100),
    status: statusChip(done),
    blocked: manualTickBlocked(period, item),
  };
}

function yearRow(item) {
  const th = CASCADE_TH[YEAR];
  const n = periodCount(item, YEAR);
  const done = periodDone(item, YEAR);
  // `Math.round(count / 6 * 100)` — 5 of 6 is 83%, not 84% (chassis.md).
  const pct = n == null ? null : Math.round((n / th) * 100);
  return {
    key: item.id,
    id: item.id,
    kind: 'year',
    taskRef: item.taskRef || '',
    body: item.body || '',
    done,
    period: YEAR,
    date: item.date,
    isMilestone: !!item.isMilestone,
    pct,
    pctLabel: pct == null ? '—' : `${pct}%`,
    ringColor: done ? RING_DONE : RING_DEFAULT,
    meta: `${n == null ? '—' : n}/${th} months · ${done ? 'Done' : 'Active'}`,
  };
}

function lifeRow(item, yearTitles) {
  const link = item.goalRef ? yearTitles[String(item.goalRef)] : null;
  return {
    key: item.id,
    id: item.id,
    kind: 'check',
    taskRef: item.taskRef || '',
    body: item.body || '',
    done: !!item.isComplete,
    period: LIFETIME,
    date: item.date,
    isMilestone: !!item.isMilestone,
    strike: false,
    meta: link ? `↑ From year goal: ${link}` : 'No linked year goal yet',
  };
}

/**
 * Every period's goals, grouped by routine in time order, with a trailing
 * "No routine" bucket. A goal whose `taskRef` names a routine that no longer
 * exists falls into that bucket too rather than vanishing.
 */
export function groupByRoutine(rows, routines, { nowId = '', showNow = false } = {}) {
  const ordered = orderedRoutines(routines);
  const buckets = new Map();
  ordered.forEach((routine) => buckets.set(routine.id, []));
  const orphans = [];

  (rows || []).forEach((row) => {
    const key = String(row.taskRef || '');
    if (key && buckets.has(key)) buckets.get(key).push(row);
    else orphans.push(row);
  });

  const groups = ordered
    .filter((routine) => buckets.get(routine.id).length)
    .map((routine) => {
      const list = buckets.get(routine.id);
      return {
        key: routine.id,
        time: routine.time,
        name: routine.name,
        // Exactly one group can carry it: `nowId` is a single routine id and the
        // badge is suppressed off the Today tab and off any day but today.
        isNow: showNow && routine.id === nowId,
        current: routine.id === nowId,
        count: `${list.filter((row) => row.done).length}/${list.length}`,
        rows: list,
      };
    });

  if (orphans.length) {
    groups.push({
      key: NO_ROUTINE.id,
      time: NO_ROUTINE.time,
      name: NO_ROUTINE.name,
      isNow: false,
      current: false,
      count: `${orphans.filter((row) => row.done).length}/${orphans.length}`,
      rows: orphans,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// The calendar
// ---------------------------------------------------------------------------

/**
 * One cell per day of the month the selected date lives in, padded to whole
 * Sunday-first weeks. Facts only — the ring COLOUR rule is the organism's.
 */
export function calendarCells({
  monthDate, dayGoals, selectedDate, today,
}) {
  const month = moment(monthDate || selectedDate, DATE_FORMAT);
  if (!month.isValid()) return [];
  const firstDow = month.clone().startOf('month').day();
  const days = month.daysInMonth();
  const todayMoment = moment(today, DATE_FORMAT);
  const cells = [];

  for (let i = 0; i < firstDow; i += 1) cells.push({ key: `pad-${i}`, blank: true });

  for (let d = 1; d <= days; d += 1) {
    const date = month.clone().date(d).format(DATE_FORMAT);
    const items = itemsFor(dayGoals, DAY, date);
    const done = items.filter((item) => item.isComplete).length;
    cells.push({
      key: date,
      blank: false,
      day: d,
      date,
      total: items.length,
      done,
      value: items.length ? (done / items.length) * 100 : 0,
      selected: date === selectedDate,
      today: date === today,
      future: moment(date, DATE_FORMAT).isAfter(todayMoment, 'day'),
    });
  }

  while (cells.length % 7) cells.push({ key: `tail-${cells.length}`, blank: true });
  return cells;
}

// ---------------------------------------------------------------------------
// The ladder and the whole view
// ---------------------------------------------------------------------------

/** The year nav ring and the Year ladder step share one figure. */
export function yearAverageOf(yearItems) {
  const items = (yearItems || []).filter((item) => item && item.progress != null);
  if (!items.length) return 0;
  const th = CASCADE_TH[YEAR];
  const total = items.reduce((sum, item) => sum + Math.min(1, Number(item.progress) / th), 0);
  return Math.round((total / items.length) * 100);
}

export function ruleFor(tab, { selectedDate, today }) {
  if (tab === DAY) {
    return selectedDate === today
      ? CASCADE_RULES[DAY]
      : windowLabel(DAY, selectedDate);
  }
  return CASCADE_RULES[tab].replace('{window}', windowLabel(tab, selectedDate));
}

/**
 * "This week" only when the selected day IS in this week — the same locale week
 * `windowLabel` prints, so the title and the rule line never disagree.
 */
function weekTitle(selectedDate, today) {
  const day = moment(selectedDate, DATE_FORMAT);
  const now = moment(today, DATE_FORMAT);
  if (!day.isValid() || !now.isValid()) return 'This week';
  const offset = day.clone().startOf('week').diff(now.clone().startOf('week'), 'weeks');
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  if (offset === -1) return 'Last week';
  return `Week ${day.week()}`;
}

export function titleFor(tab, { selectedDate, today }) {
  if (tab === DAY) {
    if (selectedDate === today) return 'Today';
    const day = moment(selectedDate, DATE_FORMAT);
    return day.isValid() ? day.format('dddd D MMM') : selectedDate;
  }
  if (tab === WEEK) return weekTitle(selectedDate, today);
  if (tab === MONTH) return moment(selectedDate, DATE_FORMAT).format('MMMM');
  if (tab === YEAR) return moment(selectedDate, DATE_FORMAT).format('YYYY');
  return 'Lifetime';
}

/**
 * The whole page body as one plain object: ladder, rule, list title, groups,
 * the desktop year rail and the year average the nav ring reads.
 */
export function buildCascade({
  tab, goals, routines, selectedDate, today, now, pop = [], loadError = false,
}) {
  const active = normaliseTab(tab);
  const isToday = selectedDate === today;
  const dayItems = itemsFor(goals, DAY, selectedDate);
  const weekItems = itemsFor(goals, WEEK);
  const monthItems = itemsFor(goals, MONTH);
  // A year item that is a step toward a SIBLING year goal is not a year goal of
  // its own — the same rule the year-goal sidebar/switcher read
  // (yearGoalModel.isYearGoalItem). `isMilestone` alone is not that test: a year
  // goal hung off a LIFETIME goal carries it too, and filtering on the flag hid
  // every such year goal from this page.
  const allYearItems = itemsFor(goals, YEAR);
  const yearIds = new Set(allYearItems.map((item) => String(item.id)));
  const yearItems = allYearItems.filter((item) => isYearGoalItem(item, yearIds));
  const lifeItems = itemsFor(goals, LIFETIME);

  const yearAverage = yearAverageOf(yearItems);
  const yearTitles = allYearItems.reduce((acc, item) => ({ ...acc, [String(item.id)]: item.body }), {});

  const tallies = {
    [DAY]: [dayItems.filter((i) => i.isComplete).length, dayItems.length],
    [WEEK]: [weekItems.filter((i) => periodDone(i, WEEK)).length, weekItems.length],
    [MONTH]: [monthItems.filter((i) => periodDone(i, MONTH)).length, monthItems.length],
    [YEAR]: [yearItems.filter((i) => periodDone(i, YEAR)).length, yearItems.length],
    [LIFETIME]: [lifeItems.filter((i) => i.isComplete).length, lifeItems.length],
  };

  /** The Year step is an AVERAGE of its goals, not a done-of-total count. */
  const stepRatio = (key, done, total) => {
    if (key === YEAR) return yearAverage / 100;
    return total ? done / total : 0;
  };
  /**
   * D-10: a load we never received knows nothing about the tallies. An em dash
   * beats "0/0", which reads as "every goal you had is gone".
   */
  const stepNum = (key, done, total) => {
    if (loadError) return '—';
    if (key === YEAR) return `${yearAverage}%`;
    return `${done}/${total}`;
  };
  /** Green at 100%, orange for the day step, blue otherwise — chassis ring rule. */
  const stepColor = (key, ratio) => {
    if (ratio >= 1) return RING_DONE;
    return key === DAY ? RING_NOW : RING_DEFAULT;
  };

  const ladder = CASCADE_TABS.map((step) => {
    const [done, total] = tallies[step.key];
    const ratio = stepRatio(step.key, done, total);
    const label = step.key === DAY && !isToday
      ? moment(selectedDate, DATE_FORMAT).format('D MMM')
      : step.label;
    return {
      key: step.key,
      label,
      num: stepNum(step.key, done, total),
      value: Math.round(ratio * 100),
      color: stepColor(step.key, ratio),
      active: step.key === active,
      threshold: thresholdChip(step.key),
      pop: pop.indexOf(step.key) !== -1,
    };
  });

  let rows;
  if (active === DAY) rows = dayItems.map(dayRow);
  else if (active === WEEK) rows = weekItems.map((item) => barRow(item, WEEK));
  else if (active === MONTH) rows = monthItems.map((item) => barRow(item, MONTH));
  else if (active === YEAR) rows = yearItems.map(yearRow);
  else rows = lifeItems.map((item) => lifeRow(item, yearTitles));

  const nowId = currentRoutineId(routines, now);
  const groups = groupByRoutine(rows, routines, {
    nowId,
    showNow: active === DAY && isToday,
  });

  const [listDone, listTotal] = tallies[active];
  const future = moment(selectedDate, DATE_FORMAT).isAfter(moment(today, DATE_FORMAT), 'day');

  return {
    tab: active,
    isToday,
    ladder,
    ruleIcon: (CASCADE_TABS.find((step) => step.key === active) || {}).icon || '',
    rule: ruleFor(active, { selectedDate, today }),
    listTitle: titleFor(active, { selectedDate, today }),
    listDone,
    listTotal,
    groups,
    // Error and empty are two different screens: the organism shows
    // `LoadErrorState` for the first and the copy below only for the second.
    loadError,
    empty: !loadError && !rows.length,
    emptyText: active === DAY && future ? 'Nothing planned yet for this day.' : 'No goals here yet.',
    addLabel: addLabelFor(active),
    // The nav glyph's ring and the Year ladder step read ONE figure, so the page
    // takes it from here rather than computing a second year average.
    yearAverage,
    items: {
      [DAY]: dayItems,
      [WEEK]: weekItems,
      [MONTH]: monthItems,
      [YEAR]: yearItems,
      [LIFETIME]: lifeItems,
    },
  };
}

export default {
  DATE_FORMAT,
  LIFETIME_DATE,
  blockedTickToast,
  buildCascade,
  calendarCells,
  currentRoutineId,
  formHintFor,
  goalDateFor,
  goalDocFor,
  groupByRoutine,
  itemForRoutine,
  itemsFor,
  manualTickBlocked,
  normaliseTab,
  orderedRoutines,
  periodCount,
  periodDone,
  planRowTick,
  routineCleared,
  routineDayItems,
  ruleFor,
  tickDayOutcome,
  titleFor,
  yearAverageOf,
};
