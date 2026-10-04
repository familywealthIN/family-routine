/**
 * Pure reading of one year goal's milestone tree — the whole of the Year Goals
 * page's arithmetic, with no Apollo, no router and no Vue in sight.
 *
 * WHY A MODULE AND NOT A COMPONENT
 * --------------------------------
 * Three screens (phone / tablet / desktop) render the same numbers, and the one
 * thing that must never disagree between them is the cascade: 5 days tick a
 * week, 3 weeks tick a month, 6 months tick the year. So the cascade lives here
 * once, as functions of plain data, and the organisms only paint what it says.
 *
 * THE THRESHOLDS ARE NOT DECLARED HERE
 * ------------------------------------
 * `PROFILE_SETTINGS.autoCheckThreshold` already holds them, keyed by the CHILD
 * period that does the ticking (`day: 5`, `week: 3`, `month: 6`). The design and
 * `docs/redesign/chassis.md` name them by the period being ticked
 * (`TH = { week: 5, month: 3, year: 6 }`), so `TH` below is a re-keying of the
 * existing constant — never a second copy of the numbers. `autoCheckThreshold` is
 * what this page has always read (the old `YearGoalsTime.vue` did), and the
 * server mirrors the same three values in
 * `apps/server/src/utils/getProgressReport.js` (`weekDays / monthWeeks /
 * yearMonths`) behind no query, so a client constant is the only readable source.
 *
 * NOTE a pre-existing duplication, not introduced here: `packages/ui/utils/
 * getDates.threshold` holds the same three numbers under the server's key names,
 * and `constants/goalsCascade.CASCADE_TH` is the Goals page's view onto THAT one.
 * Two client mirrors of one server table is one too many — collapsing
 * `getDates.threshold` into `PROFILE_SETTINGS.autoCheckThreshold` (or the
 * reverse) is a worthwhile follow-up, and until then every page must read a
 * mirror rather than type a number.
 *
 * WHAT THE SERVER CANNOT TELL US (and is therefore computed here)
 * --------------------------------------------------------------
 * `GoalItem.progress`, `milestonesTotal`, `milestonesComplete` and
 * `milestoneDays` are derived per-read by `autoCheckTaskPeriod`, which also
 * WRITES (`$set: { 'goalItems.$.isComplete': true, … }`) while it reads. The
 * `currentYearGoal` query deliberately does not call it, so `progress` arrives
 * null and every count below is derived from the milestone tree instead. That is
 * the whole point: rendering a label must not complete anybody's goal.
 */
import moment from 'moment';
import { PROFILE_SETTINGS } from '@routine-notes/ui/constants/settings';

export const DATE_FORMAT = 'DD-MM-YYYY';

/**
 * The cascade thresholds, re-keyed by the period they tick.
 *
 * `autoCheckThreshold.day` = how many DAY goals tick a WEEK, and so on — so
 * `TH.week` reads `autoCheckThreshold.day`. Frozen so a page cannot nudge it.
 */
const AUTO = (PROFILE_SETTINGS && PROFILE_SETTINGS.autoCheckThreshold) || {};
export const TH = Object.freeze({
  week: AUTO.day,
  month: AUTO.week,
  year: AUTO.month,
});

export const MONTH_NAMES = moment.months();
export const MONTH_SHORT = moment.monthsShort();
/** Sunday-first, matching `PROFILE_SETTINGS.startOfWeek: 'sun'` and moment's en locale. */
export const DOW_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const DONE_GREEN = '#4CAF50';
const NOW_ORANGE = '#FF9800';
const LINK_BLUE = '#288bd5';

/** Status chips. `inactive` exists ONLY on this page (chassis.md § goal cascade). */
export const STATUS = Object.freeze({
  done: {
    label: 'Done',
    color: DONE_GREEN,
    bg: 'rgba(76,175,80,.12)',
    chipColor: '#2e7d32',
  },
  active: {
    label: 'Active',
    color: NOW_ORANGE,
    bg: 'rgba(255,152,0,.14)',
    chipColor: '#e68900',
  },
  inactive: {
    label: 'Inactive',
    color: 'rgba(0,0,0,.5)',
    bg: 'rgba(0,0,0,.06)',
    chipColor: 'rgba(0,0,0,.5)',
  },
});

/** A goal item is complete when the server says so — `status` is day-only. */
export const isDone = (item) => !!(item && (item.isComplete || item.status === 'done'));

export function parseDate(value) {
  if (!value) return null;
  const parsed = moment(String(value), DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
}

/**
 * Status label for a period. `Done` wins; otherwise the period you are living
 * in is `Active` and every other one — past OR future — is `Inactive`.
 */
export function periodStatus(item, isCurrent) {
  if (isDone(item)) return STATUS.done;
  return isCurrent ? STATUS.active : STATUS.inactive;
}

/** Chassis ring/bar colour rule: green when done, orange for now, grey otherwise. */
export function periodColor(isComplete, isCurrent, idle) {
  if (isComplete) return DONE_GREEN;
  if (isCurrent) return NOW_ORANGE;
  return idle || 'rgba(0,0,0,.25)';
}

/**
 * The year ring's percentage.
 *
 * `Math.round(count / 6 * 100)` — so 5 of 6 months is **83%**, not 84%. Rounding
 * the ratio (not the 83.33) is the whole rule; it is pinned by a test.
 */
export function yearPercent(count) {
  const n = Number(count) || 0;
  return Math.min(100, Math.round((n / TH.year) * 100));
}

/**
 * The ONE rule line under the hero ring, replacing the old info alert.
 * Two states and no third: done, or how many are left.
 */
export function yearRule(count, done) {
  const n = Math.max(0, Number(count) || 0);
  if (done || n >= TH.year) return `Auto-ticked by ${n} month goals`;
  return `Ticks after ${TH.year} month goals · ${TH.year - n} to go`;
}

/** The same line for a month, against its 3 weeks. */
export function monthRule(month) {
  if (!month || !month.goal) return '';
  const n = month.weeksDone;
  if (n >= TH.month) return `Auto-ticked by ${n} week goals`;
  if (month.isComplete) return 'Marked done';
  return `Ticks after ${TH.month} week goals · ${Math.max(0, TH.month - n)} to go`;
}

/** "6 – 12 Sep" / "28 Sep – 4 Oct" for a week goal's own calendar week. */
export function weekRangeLabel(date) {
  const parsed = parseDate(date);
  if (!parsed) return '';
  const start = parsed.clone().startOf('week');
  const end = parsed.clone().endOf('week');
  if (start.month() === end.month()) {
    return `${start.date()} – ${end.date()} ${MONTH_SHORT[end.month()]}`;
  }
  return `${start.date()} ${MONTH_SHORT[start.month()]} – ${end.date()} ${MONTH_SHORT[end.month()]}`;
}

export function dayLabel(date) {
  const parsed = parseDate(date);
  if (!parsed) return '';
  return parsed.format('ddd D MMM');
}

/**
 * "ABOUT THIS GOAL" bullets. The design draws three authored bullets; the server
 * stores one markdown `contribution`, so the bullets are its lines. No
 * invention: an empty contribution yields an empty list and the card says so.
 */
export function aboutBullets(contribution) {
  return String(contribution || '')
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*[-*+]\s+/, '').trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

function sortByDate(a, b) {
  const ta = parseDate(a && a.date);
  const tb = parseDate(b && b.date);
  return (ta ? ta.valueOf() : 0) - (tb ? tb.valueOf() : 0);
}

/**
 * `milestones` is every child of a goal item regardless of period, so each level
 * filters to the period it owns. De-duped by id: the resolver walks every Goal
 * document that references the parent, and a duplicated id would mean a
 * duplicated `:key` (ARCHITECTURE § 3.6).
 */
function childrenOf(item, period) {
  const seen = {};
  return ((item && item.milestones) || [])
    .filter((child) => {
      if (!child || child.period !== period || !child.id) return false;
      const key = String(child.id);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    })
    .sort(sortByDate);
}

function buildDay(dayItem, todayKey) {
  const parsed = parseDate(dayItem.date);
  const key = parsed ? parsed.format(DATE_FORMAT) : '';
  return {
    id: String(dayItem.id),
    body: dayItem.body || '',
    date: dayItem.date || '',
    period: 'day',
    taskRef: dayItem.taskRef || '',
    goalRef: dayItem.goalRef || '',
    isMilestone: !!dayItem.isMilestone,
    dow: parsed ? parsed.day() : null,
    isComplete: isDone(dayItem),
    isToday: !!key && key === todayKey,
    dateLabel: parsed ? dayLabel(dayItem.date) : '',
  };
}

/** One of the 7 strip slots above a week's day rows. */
function buildDot(day, slot, dow, label, today) {
  const isToday = slot.isSame(today, 'day');
  const hasPassed = slot.isBefore(today, 'day');
  let icon = 'fiber_manual_record';
  let color = 'rgba(0,0,0,.15)';
  let size = 8;
  if (day) {
    size = 18;
    if (day.isComplete) {
      icon = 'check_circle';
      color = DONE_GREEN;
    } else if (isToday) {
      icon = 'radio_button_checked';
      color = NOW_ORANGE;
    } else if (hasPassed) {
      // The only place this page says "you missed this".
      icon = 'cancel';
      color = 'rgba(229,57,53,.55)';
    } else {
      icon = 'radio_button_unchecked';
      color = 'rgba(0,0,0,.3)';
    }
  }
  return {
    key: dow,
    label,
    num: slot.date(),
    icon,
    color,
    size,
    isToday,
  };
}

function buildDots(days, weekDate, today) {
  const start = parseDate(weekDate);
  if (!start) return [];
  const sunday = start.clone().startOf('week');
  return DOW_INITIALS.map((label, dow) => buildDot(
    days.filter((d) => d.dow === dow)[0] || null,
    sunday.clone().add(dow, 'days'),
    dow,
    label,
    today,
  ));
}

function buildWeek(weekItem, today) {
  const todayKey = today.format(DATE_FORMAT);
  const days = childrenOf(weekItem, 'day').map((d) => buildDay(d, todayKey));
  const doneDays = days.filter((d) => d.isComplete).length;
  const parsed = parseDate(weekItem.date);
  const isCurrent = !!parsed && parsed.isSame(today, 'week');
  /**
   * A week auto-ticks from its OWN days only. Once 5 of them are done the hand
   * tick is refused — not disabled, refused with an explanation, because a
   * control that silently ignores a tap reads as a broken app.
   */
  const autoTicked = doneDays >= TH.week;
  const isComplete = isDone(weekItem) || autoTicked;
  return {
    id: String(weekItem.id),
    body: weekItem.body || '',
    date: weekItem.date || '',
    period: 'week',
    taskRef: weekItem.taskRef || '',
    goalRef: weekItem.goalRef || '',
    isMilestone: !!weekItem.isMilestone,
    week: parsed ? parsed.week() : null,
    rangeLabel: weekRangeLabel(weekItem.date),
    days,
    dots: buildDots(days, weekItem.date, today),
    doneDays,
    autoTicked,
    canTickByHand: !autoTicked,
    isComplete,
    isCurrent,
    status: periodStatus({ isComplete }, isCurrent),
    percent: Math.min(100, (doneDays / TH.week) * 100),
    barColor: periodColor(isComplete, isCurrent),
  };
}

function buildMonth(monthItem, index, today) {
  const isCurrent = index === today.month();
  const isPast = index < today.month();
  const weeks = monthItem ? childrenOf(monthItem, 'week').map((w) => buildWeek(w, today)) : [];
  const weeksDone = weeks.filter((w) => w.isComplete).length;
  const autoTicked = !!monthItem && weeksDone >= TH.month;
  const isComplete = !!monthItem && (isDone(monthItem) || autoTicked);
  const month = {
    index,
    label: MONTH_SHORT[index],
    name: MONTH_NAMES[index],
    isCurrent,
    isPast,
    goal: monthItem ? {
      id: String(monthItem.id),
      body: monthItem.body || '',
      date: monthItem.date || '',
      period: 'month',
      taskRef: monthItem.taskRef || '',
      goalRef: monthItem.goalRef || '',
      isMilestone: !!monthItem.isMilestone,
    } : null,
    weeks,
    weeksDone,
    autoTicked,
    canTickByHand: !autoTicked,
    isComplete,
    status: periodStatus({ isComplete }, isCurrent),
    percent: Math.min(100, (weeksDone / TH.month) * 100),
  };
  month.rule = monthRule(month);
  return month;
}

/**
 * A shallow COPY of one complete goal-item record, as its mutations address it.
 *
 * The record arrives from Apollo's normalized cache, so nothing outside the
 * cache may mutate it — hence the copy, the same one `goalCascade.itemsFor`
 * makes. `period` and `date` are the OWNING Goal document's: `currentYearGoal`
 * and the `milestones` resolver both stamp them back onto every node they
 * return (apps/server/src/schema/GoalSchema.js), and that pair plus the id is
 * the address every goal-item mutation is sent to.
 */
function stampItem(raw, period) {
  return {
    ...raw,
    id: String(raw.id),
    period: raw.period || period,
    date: raw.date || '',
  };
}

/**
 * Every goal item in the tree, COMPLETE, indexed by the period it lives on.
 *
 * The row view-models `buildDay` / `buildWeek` / `buildMonth` produce carry only
 * what a row DRAWS — no contribution, no tags, no subtasks, no deadline — so a
 * row cannot be handed to the full editor. This is the one place the row id maps
 * back to the whole record, and it walks the raw payload through the same
 * `childrenOf` filter the rows are built from, so a row can never exist without
 * its record here.
 *
 * The reverse is allowed: `buildYearGoal` drops a month goal whose date will not
 * parse, and a dropped month's items stay in this index with no row to look them
 * up. Harmless — nothing enumerates it, it is only ever asked about an id a row
 * already showed.
 */
export function treeItems(goalItem) {
  const items = { month: [], week: [], day: [] };
  if (!goalItem) return items;
  childrenOf(goalItem, 'month').forEach((monthItem) => {
    items.month.push(stampItem(monthItem, 'month'));
    childrenOf(monthItem, 'week').forEach((weekItem) => {
      items.week.push(stampItem(weekItem, 'week'));
      childrenOf(weekItem, 'day').forEach((dayItem) => {
        items.day.push(stampItem(dayItem, 'day'));
      });
    });
  });
  return items;
}

/**
 * The hero ring's year title, the 12-month strip and the focus card, all from
 * ONE `currentYearGoal` read.
 *
 * @param {Object} goalItem the `currentYearGoal` payload (period 'year')
 * @param {string|Object} [todayDate] DD-MM-YYYY, for tests. Defaults to now.
 */
export function buildYearGoal(goalItem, todayDate) {
  if (!goalItem || !goalItem.id) return null;
  const today = (typeof todayDate === 'string' ? parseDate(todayDate) : todayDate) || moment();

  const byIndex = {};
  childrenOf(goalItem, 'month').forEach((item) => {
    const parsed = parseDate(item.date);
    // A month goal whose date will not parse has no tile to live in. Dropping it
    // is better than guessing a month and ticking the wrong one.
    if (parsed && !byIndex[parsed.month()]) byIndex[parsed.month()] = item;
  });

  const months = MONTH_NAMES.map((name, i) => buildMonth(byIndex[i] || null, i, today));
  const monthsDone = months.filter((m) => m.isComplete).length;
  const isComplete = isDone(goalItem) || monthsDone >= TH.year;
  const parsedDate = parseDate(goalItem.date);

  return {
    id: String(goalItem.id),
    body: goalItem.body || '',
    contribution: goalItem.contribution || '',
    about: aboutBullets(goalItem.contribution),
    tags: goalItem.tags || [],
    date: goalItem.date || '',
    period: 'year',
    taskRef: goalItem.taskRef || '',
    goalRef: goalItem.goalRef || '',
    isMilestone: !!goalItem.isMilestone,
    routineName: (goalItem.routine && goalItem.routine.name) || '',
    year: parsedDate ? parsedDate.year() : today.year(),
    months,
    monthsDone,
    isComplete,
    percent: isComplete ? 100 : yearPercent(monthsDone),
    ringColor: isComplete ? DONE_GREEN : LINK_BLUE,
    status: isComplete ? STATUS.done : STATUS.active,
    rule: yearRule(monthsDone, isComplete),
    currentMonthIndex: today.month(),
    /**
     * The complete records behind the rows, for whatever needs a WHOLE goal item
     * rather than a row — the day-goal editor. Read it through `itemForRow`.
     */
    items: treeItems(goalItem),
  };
}

// ---------------------------------------------------------------------------
// Month tiles
// ---------------------------------------------------------------------------

function tileLabelColor(month, selected) {
  if (month.isCurrent) return '#e68900';
  return selected ? 'rgba(0,0,0,.8)' : 'rgba(0,0,0,.45)';
}

/**
 * One of the 12 strip tiles. Three states and nothing else:
 *   done   — solid green disc with a check
 *   active — a ring showing `n/3`
 *   empty  — a dashed track with `+` (future) or `−` (past)
 */
export function monthTile(month, selectedIndex) {
  const selected = month.index === selectedIndex;
  const base = {
    key: month.index,
    index: month.index,
    label: month.label,
    name: month.name,
    selected,
    isCurrent: month.isCurrent,
    title: month.goal ? `${month.name}: ${month.goal.body}` : `${month.name}: no goal`,
    bodyText: month.goal ? month.goal.body : 'No goal',
    labelColor: tileLabelColor(month, selected),
    labelWeight: selected || month.isCurrent ? 700 : 500,
  };
  if (month.goal && month.isComplete) {
    return {
      ...base,
      state: 'done',
      ringColor: 'transparent',
      ringValue: 0,
      track: 'rgba(76,175,80,.25)',
      trackDash: null,
      fill: DONE_GREEN,
      icon: 'check',
      iconColor: '#fff',
      text: '',
    };
  }
  if (month.goal) {
    return {
      ...base,
      state: 'active',
      ringColor: month.isCurrent ? NOW_ORANGE : LINK_BLUE,
      ringValue: month.percent,
      track: 'rgba(0,0,0,.08)',
      trackDash: null,
      fill: 'transparent',
      icon: '',
      iconColor: 'rgba(0,0,0,.3)',
      text: `${month.weeksDone}/${TH.month}`,
    };
  }
  return {
    ...base,
    state: 'empty',
    ringColor: 'transparent',
    ringValue: 0,
    track: 'rgba(0,0,0,.22)',
    trackDash: '3 3',
    fill: 'transparent',
    // Past without a goal reads as a gap you can still fill; future as an
    // invitation. Same tap either way.
    icon: month.isPast ? 'remove' : 'add',
    iconColor: 'rgba(0,0,0,.3)',
    text: '',
  };
}

export function monthTiles(tree, selectedIndex) {
  if (!tree) return [];
  return tree.months.map((month) => monthTile(month, selectedIndex));
}

// ---------------------------------------------------------------------------
// Finding things
// ---------------------------------------------------------------------------

export function findWeek(tree, weekId) {
  if (!tree || !weekId) return null;
  const id = String(weekId);
  let found = null;
  tree.months.forEach((m) => m.weeks.forEach((w) => {
    if (w.id === id) found = w;
  }));
  return found;
}

/**
 * The COMPLETE goal item a tree row stands for, out of `tree.items`.
 *
 * Module-level and pure, for the same reason `GoalsCascadeContainer.itemForRow`
 * is: every path that acts on a row — the day row's edit glyph and the ⋮ menu's
 * Edit — resolves the row ONE way, so they cannot drift into disagreeing about
 * which record (or which `period` + `date` address) a row means.
 */
export function itemForRow(tree, row) {
  if (!tree || !row || !row.id || !row.period) return null;
  const items = (tree.items && tree.items[row.period]) || [];
  const id = String(row.id);
  return items.find((candidate) => candidate.id === id) || null;
}

export function findMonthOfWeek(tree, weekId) {
  if (!tree || !weekId) return null;
  const id = String(weekId);
  let found = null;
  tree.months.forEach((m) => m.weeks.forEach((w) => {
    if (w.id === id) found = m;
  }));
  return found;
}

/** Where a tick landed: its day (if any), its week (if any) and its month. */
function locate(tree, level, id) {
  const at = { day: null, week: null, month: null };
  tree.months.forEach((m) => {
    if (level === 'month' && m.goal && m.goal.id === id) at.month = m;
    m.weeks.forEach((w) => {
      if (level === 'week' && w.id === id) {
        at.week = w;
        at.month = m;
      }
      w.days.forEach((d) => {
        if (level === 'day' && d.id === id) {
          at.day = d;
          at.week = w;
          at.month = m;
        }
      });
    });
  });
  return at;
}

// ---------------------------------------------------------------------------
// The cascade
// ---------------------------------------------------------------------------

const TONE_GREEN = { tone: 'green', color: '#81c784' };
const TONE_BLUE = { tone: 'blue', color: '#64b5f6' };

function tickOf(item, isComplete) {
  return {
    id: String(item.id),
    period: item.period,
    date: item.date,
    // `completeGoalItem`'s `taskRef` is String! and a month/week/year goal has
    // no routine. The resolver only reads it for `period === 'day'`, so '' is
    // the honest value, not a placeholder.
    taskRef: item.taskRef || '',
    isMilestone: !!item.isMilestone,
    isComplete,
  };
}

function dedupeTicks(ticks) {
  const seen = {};
  return ticks.filter((t) => {
    if (seen[t.id]) return false;
    seen[t.id] = true;
    return true;
  });
}

/** One rollup toast per gesture, however many levels crossed. */
function rollupToast(events, month, monthNowDone) {
  if (!events.length) return null;
  const top = events[events.length - 1];
  let sub = '';
  if (events.length > 1) {
    sub = events.slice(1).map((e) => e.text).join(' · ');
  } else if (month && month.goal && !monthNowDone) {
    sub = `${month.name} ${month.weeksDone + 1}/${TH.month} weeks`;
  }
  return {
    icon: top.icon,
    color: top.color,
    title: events[0].text,
    sub,
  };
}

/** "Ticked automatically" — the hand tick a lower level already satisfied. */
function autoBlocked(doneCount, threshold, noun) {
  return {
    blocked: true,
    ticks: [],
    events: [],
    toast: {
      icon: 'info',
      color: '#90caf9',
      title: 'Ticked automatically',
      sub: `${doneCount} of ${threshold} ${noun} goals are done`,
    },
  };
}

/**
 * What one tick does, all the way up, in a single gesture.
 *
 * The server will NOT do this for us: `completeGoalItem` only runs its own
 * `autoCheckTaskPeriod` cascade when `isComplete && moment(date).weekday() >= 4`,
 * and for a non-day item it persists `isComplete` alone. So the page computes
 * every crossing here and ticks each crossed parent explicitly. One pure
 * function, so the three shells and the tests agree on what crossed.
 *
 * @param {Object} tree   buildYearGoal() output, BEFORE the tick
 * @param {Object} target { level: 'day'|'week'|'month', id }
 * @returns {Object} {
 *   blocked, toast, ticks: [{ id, period, date, taskRef, isMilestone, isComplete }],
 *   events: [{ icon, text, tone, color }]
 * }
 */
export function planTick(tree, target) {
  const empty = {
    blocked: false, ticks: [], events: [], toast: null,
  };
  if (!tree || !target || !target.id) return empty;

  const { level } = target;
  const id = String(target.id);
  const { day, week, month } = locate(tree, level, id);

  if (level === 'day' && !day) return empty;
  if (level === 'week' && !week) return empty;
  if (level === 'month' && !month) return empty;

  const self = { day, week, month: month && month.goal }[level];
  if (!self) return empty;

  // --- Already done: untick, and never cascade. Taking one day back cannot
  //     un-tick a year, so only this item changes.
  const wasDone = {
    day: day && day.isComplete,
    week: week && week.isComplete,
    month: month && month.isComplete,
  }[level];
  if (wasDone) {
    if (level === 'week' && week.autoTicked) {
      return autoBlocked(week.doneDays, TH.week, 'day');
    }
    if (level === 'month' && month.autoTicked) {
      return autoBlocked(month.weeksDone, TH.month, 'week');
    }
    return { ...empty, ticks: [tickOf(self, false)] };
  }

  const ticks = [tickOf(self, true)];
  const events = [];

  // --- week crossing
  let weekNowDone = !!(week && week.isComplete);
  if (level === 'day' && week) {
    const doneDays = week.doneDays + 1;
    if (!week.isComplete && doneDays >= TH.week) {
      weekNowDone = true;
      ticks.push(tickOf(week, true));
      events.push({
        icon: 'check_circle',
        ...TONE_GREEN,
        text: `${week.body} auto-ticked · ${doneDays}/${TH.week} days`,
      });
    }
  } else if (level === 'week') {
    weekNowDone = true;
    events.push({ icon: 'check_circle', ...TONE_GREEN, text: `${week.body} done` });
  }

  // --- month crossing
  let monthNowDone = !!(month && month.isComplete);
  if (level === 'month') {
    monthNowDone = true;
    events.push({ icon: 'event_available', ...TONE_GREEN, text: `${month.name} done` });
  } else if (month && month.goal && weekNowDone && !month.isComplete) {
    const weeksDone = month.weeksDone + 1;
    if (weeksDone >= TH.month) {
      monthNowDone = true;
      ticks.push(tickOf(month.goal, true));
      events.push({
        icon: 'event_available',
        ...TONE_GREEN,
        text: `${month.name} auto-ticked · ${weeksDone}/${TH.month} weeks`,
      });
    }
  }

  // --- year crossing
  if (monthNowDone && month && !month.isComplete) {
    const count = tree.monthsDone + 1;
    const yearDone = count >= TH.year;
    if (yearDone && !tree.isComplete) ticks.push(tickOf(tree, true));
    events.push({
      icon: yearDone ? 'emoji_events' : 'timeline',
      ...TONE_BLUE,
      text: yearDone
        ? `Year complete · ${tree.body}`
        : `Year at ${yearPercent(count)}% · ${count}/${TH.year} months`,
    });
  }

  return {
    blocked: false,
    ticks: dedupeTicks(ticks),
    events,
    toast: rollupToast(events, month, monthNowDone),
  };
}

// ---------------------------------------------------------------------------
// Creating a child
// ---------------------------------------------------------------------------

export function monthEndDate(year, monthIndex) {
  return moment({ year, month: monthIndex, day: 1 }).endOf('month').format(DATE_FORMAT);
}

/**
 * The Friday after the month's last planned week. Weeks end on Friday.
 *
 * Returns `null` when that week no longer belongs to the month. A week belongs
 * to a month when its Sun–Sat span overlaps the month: that is how the server
 * gathers a month's week docs (`periodChildDates('month')` in
 * apps/server/src/resolvers/goal.js — every Friday from the month's first to its
 * last week), so "27 Sep – 3 Oct" (Friday 2 Oct) is still September's, but
 * "1 – 7 Nov" is never October's. Once the next free week starts after the
 * month ends, the month is fully planned and there is no week to offer.
 */
export function nextWeekDate(year, month, todayDate) {
  const today = (typeof todayDate === 'string' ? parseDate(todayDate) : todayDate) || moment();
  const last = month.weeks[month.weeks.length - 1];
  let anchor;
  if (last) {
    anchor = parseDate(last.date).clone().add(1, 'week');
  } else if (month.isCurrent) {
    anchor = today.clone();
  } else {
    anchor = moment({ year, month: month.index, day: 1 });
  }
  const friday = anchor.clone().day(5);
  if (friday.isBefore(anchor, 'day')) friday.add(1, 'week');
  const monthEnd = moment({ year, month: month.index, day: 1 }).endOf('month');
  if (friday.clone().startOf('week').isAfter(monthEnd, 'day')) return null;
  return friday.format(DATE_FORMAT);
}

/** The first day in this week with no day goal yet, from today onward. */
export function nextDayDate(week, todayDate) {
  const today = (typeof todayDate === 'string' ? parseDate(todayDate) : todayDate) || moment();
  const sunday = parseDate(week.date).clone().startOf('week');
  const used = week.days.map((d) => d.dow);
  const from = sunday.isSame(today, 'week') ? today.day() : 0;
  for (let i = from; i < 7; i += 1) {
    if (used.indexOf(i) === -1) return sunday.clone().add(i, 'days').format(DATE_FORMAT);
  }
  for (let i = 0; i < 7; i += 1) {
    if (used.indexOf(i) === -1) return sunday.clone().add(i, 'days').format(DATE_FORMAT);
  }
  return sunday.clone().add(6, 'days').format(DATE_FORMAT);
}

/**
 * The date a new child goal gets, and the parent it locks to.
 *
 * Dates match what the old page sent (`openCreateGoalDrawer`), because the
 * server buckets goal items by `(date, period)` and a different rule here would
 * file the same month's goal under two documents:
 *   month → last day of that month
 *   week  → the Friday of the week being planned (weeks end on Friday)
 *   day   → the day itself
 */
export function createDraft(tree, kind, context) {
  if (!tree) return null;
  const ctx = context || {};
  if (kind === 'month') {
    const month = tree.months[ctx.monthIndex];
    if (!month) return null;
    return {
      kind: 'month',
      period: 'month',
      date: monthEndDate(tree.year, month.index),
      goalRef: tree.id,
      parentLabel: tree.body,
      periodIcon: 'calendar_month',
      periodLabel: `${month.name} ${tree.year}`,
      placeholder: 'e.g. Retention push',
      title: 'New month goal',
    };
  }
  if (kind === 'week') {
    const month = tree.months[ctx.monthIndex];
    if (!month || !month.goal) return null;
    const date = nextWeekDate(tree.year, month, ctx.today);
    // Every week of this month already has a goal — a week outside it would be
    // filed under the wrong month goal.
    if (!date) return null;
    const parsed = parseDate(date);
    return {
      kind: 'week',
      period: 'week',
      date,
      goalRef: month.goal.id,
      parentLabel: month.goal.body,
      periodIcon: 'view_week',
      periodLabel: `Week ${parsed ? parsed.week() : ''} · ${weekRangeLabel(date)}`,
      placeholder: 'e.g. Beta feedback triage',
      title: 'New week goal',
    };
  }
  if (kind === 'day') {
    const week = findWeek(tree, ctx.weekId);
    if (!week) return null;
    const date = nextDayDate(week, ctx.today);
    return {
      kind: 'day',
      period: 'day',
      date,
      goalRef: week.id,
      taskRef: week.taskRef || tree.taskRef || '',
      parentLabel: week.body,
      periodIcon: 'today',
      periodLabel: dayLabel(date),
      placeholder: 'e.g. Write release notes',
      title: 'New day goal',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// The goal switcher
// ---------------------------------------------------------------------------

export const SORT_CHIPS = [
  { key: 'routine', label: 'By routine time', icon: 'schedule' },
  { key: 'progress', label: 'By progress', icon: 'donut_large' },
];

/**
 * Rows for the phone sheet / tablet shelf / desktop sidebar, from the
 * `currentYearGoals` read (`[Goal]`, each with its complete `goalItems`).
 *
 * `routineTime` is NOT available: `GoalItem.routine` resolves to
 * `RoutineItemRef { id, name }` and the schema has no `time` on it. So the
 * "By routine time" chip sorts by routine NAME and the rows print an em dash
 * where the design prints "09:00" — an honest unknown, not an invented clock.
 * Adding `time` to `RoutineItemRef` is the one-line server change that would
 * restore the Now / Later today / Earlier today grouping.
 */
export function yearGoalRows(goals, options) {
  const opts = options || {};
  const query = String(opts.query || '').trim().toLowerCase();
  const activeId = opts.activeId ? String(opts.activeId) : '';
  const today = (typeof opts.today === 'string' ? parseDate(opts.today) : opts.today) || moment();
  const monthIndex = today.month();

  const items = [];
  (goals || []).forEach((goal) => {
    ((goal && goal.goalItems) || []).forEach((item) => {
      if (!item || !item.id || item.isMilestone) return;
      const tree = buildYearGoal(
        { ...item, period: 'year', date: item.date || goal.date },
        today,
      );
      if (!tree) return;
      items.push({
        id: tree.id,
        title: tree.body,
        percent: tree.percent,
        monthsDone: tree.monthsDone,
        isComplete: tree.isComplete,
        routineName: tree.routineName,
        routineTime: '',
        currentMonthBody: (tree.months[monthIndex].goal || {}).body || '',
        currentMonthLabel: MONTH_SHORT[monthIndex],
        isActive: tree.id === activeId,
        color: tree.isComplete ? DONE_GREEN : LINK_BLUE,
      });
    });
  });

  const filtered = items.filter((row) => !query
    || row.title.toLowerCase().indexOf(query) !== -1
    || (row.routineName || '').toLowerCase().indexOf(query) !== -1);

  if (opts.sort === 'progress') {
    return [
      { header: 'LOWEST PROGRESS FIRST' },
      ...filtered.slice().sort((a, b) => a.percent - b.percent),
    ];
  }
  return [
    { header: 'BY ROUTINE' },
    ...filtered.slice().sort((a, b) => String(a.routineName || '~')
      .localeCompare(String(b.routineName || '~'))),
  ];
}

export default {
  TH,
  STATUS,
  DATE_FORMAT,
  MONTH_NAMES,
  MONTH_SHORT,
  DOW_INITIALS,
  SORT_CHIPS,
  isDone,
  parseDate,
  periodStatus,
  periodColor,
  yearPercent,
  yearRule,
  monthRule,
  weekRangeLabel,
  dayLabel,
  aboutBullets,
  buildYearGoal,
  monthTile,
  monthTiles,
  planTick,
  createDraft,
  findWeek,
  findMonthOfWeek,
  treeItems,
  itemForRow,
  monthEndDate,
  nextWeekDate,
  nextDayDate,
  yearGoalRows,
};
