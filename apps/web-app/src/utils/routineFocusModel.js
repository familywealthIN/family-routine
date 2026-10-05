/**
 * Pure derivations for the Routine Focus home screen.
 *
 * Kept out of the page so the arithmetic that decides what the focus card says
 * — which routine is current, how much of its window is left, which button
 * glyph it carries, what the cascade grid shows — is unit-testable on its own.
 *
 * Nothing here touches Apollo, Vue or the DOM.
 */
import moment from 'moment';
import { CASCADE_UNIT_STYLE, STIMULI } from '@routine-notes/ui/constants/routineFocus';
import { threshold } from './getDates';

/**
 * Goal-item slots the server expects for a routine — the same equation as
 * apps/server utils/stimulusPoints.js: Number((D.splitRate / K.splitRate).toFixed(0)).
 * 0 while stimuli have not loaded.
 */
export function routineSlotCount(task) {
  const stimuli = (task && task.stimuli) || [];
  const d = stimuli.find((st) => st.name === 'D');
  const k = stimuli.find((st) => st.name === 'K');
  if (!d || !k || !k.splitRate) return 0;
  const count = Number((d.splitRate / k.splitRate).toFixed(0));
  return Number.isNaN(count) ? 0 : count;
}

const DAY_FORMAT = 'DD-MM-YYYY';

export function toMinutes(time) {
  const [hour, minute] = String(time || '0:0').split(':');
  return (Number(hour) || 0) * 60 + (Number(minute) || 0);
}

/**
 * The routine whose window contains `now`. Same rule as the legacy dashboard:
 * a time before the first item's start still selects the first item, so the day
 * always has a focus.
 */
export function findCurrentRoutine(tasklist, now) {
  if (!Array.isArray(tasklist) || !tasklist.length) return null;
  const nowMoment = now || moment();
  return tasklist.find((task, index) => {
    const start = moment(task.time, 'HH:mm');
    const next = tasklist[index + 1];
    const end = moment(next ? next.time : '23:59', 'HH:mm');
    if (index === 0 && nowMoment.diff(start, 'minutes') <= 0) return true;
    return nowMoment.diff(start, 'minutes') >= 0 && nowMoment.diff(end, 'minutes') <= -1;
  }) || null;
}

/**
 * Tick-button appearance, straight from the handoff's state table.
 *
 * `redeemable` (a passed, unticked, un-redeemed task on TODAY) is the only
 * state that spends points, so it is the only one that gets the diamond.
 */
// `isCurrent` is deliberately NOT a parameter: keying the glyph off it is what
// inverted the alarm and the three dots. Callers may still pass it; it is ignored.
export function tickButtonFor(task, { past, redeemable }) {
  if (task.ticked) {
    return { buttonGlyph: 'check', buttonBg: '#4CAF50', buttonFg: '#fff' };
  }
  if (redeemable) {
    return { buttonGlyph: 'diamond', buttonBg: '#fff', buttonFg: '#288bd5' };
  }
  if (past) {
    // Past and no longer redeemable — a locked miss, not an invitation.
    return { buttonGlyph: 'close', buttonBg: '#fff', buttonFg: '#e53935' };
  }
  // The last two key off `wait`, not off "is this the current routine".
  //
  // `apps/web-app/src/utils/routineTaskDisplay.js` already owns this rule as
  // `getButtonIcon` — `!passed && !ticked && !wait` is the alarm, anything else
  // is the three dots — and this function reimplemented it instead of calling it,
  // then drifted. Because `buttonDisabled` disables `wait`, keying these off
  // `isCurrent` put the disabled state on the alarm clock (the icon that means
  // "tick this now") and left the routine you could actually tick wearing the
  // inert three dots.
  //
  // Mirrored rather than delegated for now: `getButtonIcon` has no notion of a
  // "current" routine, so routing through it would also turn a passed-but-current
  // routine's glyph from the alarm into a `close` cross. That is a separate
  // behaviour question — the duplication is flagged here so the two can be
  // consolidated deliberately rather than by accident.
  if (task.wait) {
    return { buttonGlyph: 'more_horiz', buttonBg: '#f5f5f5', buttonFg: 'rgba(0,0,0,.87)' };
  }
  return { buttonGlyph: 'alarm', buttonBg: '#f5f5f5', buttonFg: 'rgba(0,0,0,.87)' };
}

export function stateIconFor({
  ticked, isCurrent, past, redeemable,
}) {
  if (ticked) return { stateIcon: 'check_circle', stateColor: '#4CAF50' };
  if (isCurrent) return { stateIcon: 'radio_button_checked', stateColor: '#FF9800' };
  if (redeemable) return { stateIcon: 'diamond', stateColor: '#288bd5' };
  if (past) return { stateIcon: 'cancel', stateColor: 'rgba(229,57,53,.55)' };
  return { stateIcon: 'radio_button_unchecked', stateColor: 'rgba(0,0,0,.3)' };
}

function hasSplit(task, name) {
  const stim = (task.stimuli || []).find((s) => s && s.name === name);
  return !!stim && Number(stim.splitRate) > 0;
}

/**
 * Which stimulus a routine item "is". The server splits every item across D, K
 * and G, but the card names one — the one the item is scored on besides
 * Discipline, which every item carries. G wins over K when both are present
 * because a focused-output item is what the G ring is for.
 */
export function primaryStimulus(task) {
  const names = (task.stimuli || []).map((s) => s && s.name);
  if (names.indexOf('G') !== -1 && hasSplit(task, 'G')) return 'G';
  if (names.indexOf('K') !== -1 && hasSplit(task, 'K')) return 'K';
  return 'D';
}

/**
 * Enrich the day's routine items with everything the deck, rail and focus card
 * need. One pass, so every surface reads the same numbers.
 *
 * @param {Array} tasklist routine items, in schedule order
 * @param {Object} options
 * @param {Object} options.now moment for "current"/"past" decisions
 * @param {Object} options.itemsByTask map of routine id -> its day goal items
 * @param {boolean} options.isToday the viewed date is today (gates redemption)
 * @param {boolean} options.isPastDay the viewed date is before today. Every
 *   routine on it has passed — the server only stamps `passed` while the day
 *   is live, so a routine never marked on its day would otherwise read as
 *   upcoming and tickable against today's clock.
 * @param {string} options.focusId the focused routine's id
 */
export function buildRoutineRows(tasklist, {
  now, itemsByTask = {}, isToday = true, isPastDay = false, focusId = '',
} = {}) {
  const list = Array.isArray(tasklist) ? tasklist : [];
  const current = isToday ? findCurrentRoutine(list, now) : null;
  const currentId = current ? current.id : '';
  const dayOver = !isToday && isPastDay;
  // A FUTURE date is neither today nor past. Nothing on it has happened yet, so
  // every routine is simply upcoming.
  //
  // `passed` cannot be trusted here: `routinePassWaitMixin.passedTime` compares
  // `moment(item.time, 'HH:mm')` — the routine's time parsed into TODAY — against
  // now, with no reference to the viewed date. So on a future day a 06:30 routine
  // reads as already passed, and it was rendering the `close` cross of a locked
  // miss on a day that has not arrived.
  const isFutureDay = !isToday && !isPastDay;

  return list.map((source) => {
    let task = source;
    if (dayOver && !source.passed) {
      task = { ...source, passed: true };
    } else if (isFutureDay) {
      // Normalise rather than special-case every derived field: a routine on a
      // day that has not arrived has not passed, and IS waiting.
      task = { ...source, passed: false, wait: true };
    }
    const isCurrent = !!currentId && task.id === currentId;
    const past = !isCurrent && !!task.passed;
    const redeemable = !!task.passed && !task.ticked && !task.redeemed && isToday;
    const items = itemsByTask[task.id] || [];
    const stim = STIMULI[task.stimuli && task.stimuli.length ? primaryStimulus(task) : 'D']
      || STIMULI.D;

    return {
      ...task,
      items,
      doneCount: items.filter((item) => item && item.isComplete).length,
      // The routine owes its server slot count (one task per 2 hours of its
      // window) even before any checklist item exists — "0 of 1", not "0 of 0".
      // More items than slots still count every item.
      totalCount: Math.max(items.length, routineSlotCount(task)),
      isCurrent,
      past,
      redeemable,
      isFocus: task.id === focusId,
      stimulus: stim.key,
      stimulusColor: stim.color,
      stimulusTint: stim.tint,
      stimulusLabel: stim.label,
      // Same rule as the legacy dashboard's getButtonDisabled: a redeemable
      // task keeps its (diamond) button, otherwise an unticked task that has
      // passed or is still waiting cannot be pressed.
      buttonDisabled: !task.ticked && (!!task.passed || !!task.wait) && !redeemable,
      ...tickButtonFor(task, { isCurrent, past, redeemable }),
      ...stateIconFor({
        ticked: task.ticked, isCurrent, past, redeemable,
      }),
    };
  });
}

function formatLeft(minutes) {
  if (minutes <= 0) return 'ended';
  const hours = Math.floor(minutes / 60);
  const mins = String(minutes % 60).padStart(2, '0');
  return hours ? `${hours}h ${mins}m left` : `${minutes}m left`;
}

/**
 * The focused routine's window: when it ends, how far through it we are, and
 * the status line above the ring.
 */
export function focusWindow(rows, index, now, { isToday = true } = {}) {
  const focus = rows[index];
  if (!focus) {
    return {
      endTime: '23:59',
      elapsedPct: 0,
      leftLabel: '',
      statusLabel: '',
      statusColor: 'rgba(0,0,0,.45)',
    };
  }
  const next = rows[index + 1];
  const endTime = next ? next.time : '23:59';
  const nowMoment = now || moment();
  const nowMin = nowMoment.hours() * 60 + nowMoment.minutes();
  const startMin = toMinutes(focus.time);
  const span = Math.max(toMinutes(endTime) - startMin, 0);

  let elapsed = 0;
  if (focus.isCurrent) elapsed = Math.min(span, Math.max(nowMin - startMin, 0));
  else if (focus.past) elapsed = span;

  let leftLabel;
  if (focus.past) leftLabel = 'passed';
  else if (focus.isCurrent) leftLabel = formatLeft(span - elapsed);
  // Today's clock only means something on today: a future day's routine
  // starts at its time, not "in Nm".
  else if (!isToday) leftLabel = `starts ${focus.time}`;
  else leftLabel = `starts in ${formatLeft(Math.max(startMin - nowMin, 0)).replace(' left', '')}`;

  let statusLabel = 'Up next';
  let statusColor = 'rgba(0,0,0,.45)';
  if (focus.ticked) {
    statusLabel = focus.redeemed ? 'Redeemed' : 'Done';
    statusColor = '#4CAF50';
  } else if (focus.isCurrent) {
    // Times up, but the window is still open: the routine is current AND
    // already costs points to tick. Saying only "In progress" above a diamond
    // button reads as a contradiction.
    statusLabel = focus.redeemable ? 'In progress · times up' : 'In progress';
    statusColor = '#FF9800';
  } else if (focus.redeemable) {
    statusLabel = 'Missed · redeem with points';
  } else if (focus.past) {
    statusLabel = 'Missed';
  }

  return {
    endTime,
    elapsedPct: span ? Math.round((elapsed / span) * 100) : 0,
    leftLabel,
    statusLabel,
    statusColor,
  };
}

// ---------------------------------------------------------------------------
// Goal cascade (Week / Month / Year tabs)
// ---------------------------------------------------------------------------

// How wide a single cell of the grid is, for "is the viewed day inside this
// cell" — a month's cells are ISO weeks, a year's are months.
const CASCADE_UNIT_GRANULARITY = { week: 'day', month: 'isoWeek', year: 'month' };

const CASCADE_META = {
  week: {
    unitName: 'days', stepDown: 'day', cols: 7, thresholdKey: 'weekDays', linkedLabel: 'Linked day goals',
  },
  month: {
    unitName: 'weeks', stepDown: 'week', cols: 5, thresholdKey: 'monthWeeks', linkedLabel: 'Linked week goals',
  },
  year: {
    unitName: 'months', stepDown: 'month', cols: 6, thresholdKey: 'yearMonths', linkedLabel: 'Linked month goals',
  },
};

function unitLabel(period, dateStr, index) {
  const m = moment(dateStr, DAY_FORMAT);
  if (period === 'week') {
    return { label: m.isValid() ? m.format('ddd') : `D${index + 1}`, sub: m.isValid() ? m.format('D') : '' };
  }
  if (period === 'month') {
    return { label: `W${index + 1}`, sub: m.isValid() ? m.format('D MMM') : '' };
  }
  return { label: m.isValid() ? m.format('MMM') : `M${index + 1}`, sub: '' };
}

/**
 * milestoneDays statuses -> grid states.
 *
 * Only 'upcoming' needs splitting: the child period the viewed day sits in is
 * ACTIVE (orange), later ones are merely future. 'none' means the goal had
 * nothing scheduled on that date — an empty cell, never a miss, or a week that
 * simply started on Monday would read as having broken on Sunday.
 */
function unitState(status, dateStr, period, today) {
  if (status === 'complete') return 'done';
  if (status === 'missed') return 'missed';
  if (status !== 'upcoming') return 'none';
  const m = moment(dateStr, DAY_FORMAT);
  if (!m.isValid()) return 'none';
  const unit = CASCADE_UNIT_GRANULARITY[period] || 'day';
  if (m.isSame(today, unit)) return 'active';
  return m.isBefore(today, unit) ? 'missed' : 'none';
}

function styleUnit(unit) {
  const style = CASCADE_UNIT_STYLE[unit.state] || CASCADE_UNIT_STYLE.none;
  return {
    ...unit,
    icon: style.icon,
    color: style.color,
    bg: style.bg,
    fg: unit.state === 'none' ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.75)',
  };
}

function rangeLabel(period, dateStr) {
  const m = moment(dateStr, DAY_FORMAT);
  if (!m.isValid()) return '';
  if (period === 'week') {
    const start = m.clone().startOf('week');
    const end = m.clone().endOf('week');
    return start.month() === end.month()
      ? `Week of ${start.format('D')} – ${end.format('D MMM')}`
      : `Week of ${start.format('D MMM')} – ${end.format('D MMM')}`;
  }
  if (period === 'month') return m.format('MMMM YYYY');
  return m.format('YYYY');
}

/**
 * Pick the goal item the cascade tab should show.
 *
 * ONLY a goal that belongs to the focused routine: the goal its day items
 * actually roll up into (their `goalRef`), else one created against this
 * routine (`taskRef`). A goal filed against ANOTHER routine is never a
 * candidate — not even through a stray `goalRef` — and there is no "the
 * period's first goal" fallback: a routine with no week/month/year goal of its
 * own gets `null`, which the panel draws as its empty state. The old fallback
 * showed some other routine's goal as if it were this one's.
 */
export function pickCascadeItem({ goals, period, focusRow }) {
  if (!focusRow || !focusRow.id) return null;
  const routineId = String(focusRow.id);
  const items = (goals || [])
    .filter((goal) => goal && goal.period === period)
    .reduce((acc, goal) => acc.concat(goal.goalItems || []), [])
    // A goal with no routine is not another routine's; one that names a
    // different routine is.
    .filter((item) => item && item.id && (!item.taskRef || String(item.taskRef) === routineId));
  if (!items.length) return null;

  const refs = (focusRow.items || [])
    .map((item) => item && item.goalRef)
    .filter(Boolean)
    .map(String);
  const byRef = items.find((item) => refs.indexOf(String(item.id)) !== -1);
  if (byRef) return byRef;

  return items.find((item) => String(item.taskRef) === routineId) || null;
}

/** What one linked goal's period is called in its detail summary. */
const PERIOD_NAME = {
  day: 'Day goal', week: 'Week goal', month: 'Month goal', year: 'Year goal',
};

/** "Mon, 5 Oct 2026" / "Week of 4 – 10 Oct" / "October 2026" — a child's window. */
function childWindowLabel(period, dateStr) {
  const m = moment(dateStr, DAY_FORMAT);
  if (!m.isValid()) return dateStr || '';
  if (period === 'day') return m.format('ddd, D MMM YYYY');
  return rangeLabel(period, dateStr);
}

/**
 * The short tag on a linked row. A month's weeks are numbered by their place in
 * the grid; a week the grid does not hold is named by its Friday instead of a
 * wrong "W1".
 */
function linkedLabelFor(period, dateStr, index) {
  if (period === 'month' && index === -1) {
    const m = moment(dateStr, DAY_FORMAT);
    return m.isValid() ? m.format('D MMM') : '';
  }
  return unitLabel(period, dateStr, Math.max(index, 0)).label;
}

/**
 * The child goals hung off the cascade item, oldest window first, each with
 * the detail its collapsible summary expands to.
 *
 * Sorted by the child Goal document's DATE (the end of its window: the day
 * itself, a week's Friday, a month's last day), so the list reads in calendar
 * order — Mon → Sun, W1 → W5, Jan → Dec — whatever order the server returned
 * the documents in. Items sharing a window keep their stored order.
 */
export function linkedGoals({
  period, children, unitDates = [], date,
}) {
  const viewed = moment(date, DAY_FORMAT);
  const rows = [];
  (children || []).forEach((goal) => {
    if (!goal) return;
    const at = moment(goal.date, DAY_FORMAT);
    const index = unitDates.indexOf(goal.date);
    (goal.goalItems || []).forEach((child, order) => {
      if (!child) return;
      const done = !!child.isComplete;
      const childPeriod = goal.period || (CASCADE_META[period] || {}).stepDown || '';
      // A window that closed before the viewed day without the tick is missed.
      const ended = at.isValid() && viewed.isValid()
        && at.isBefore(viewed, CASCADE_UNIT_GRANULARITY[period] || 'day');
      let status = 'Open';
      if (done) status = 'Done';
      else if (ended) status = 'Missed';
      rows.push({
        id: String(child.id || `${goal.date}-${order}`),
        label: linkedLabelFor(period, goal.date, index),
        body: child.body || '',
        isComplete: done,
        sortKey: at.isValid() ? at.valueOf() : Number.MAX_SAFE_INTEGER,
        order: rows.length,
        detail: {
          period: PERIOD_NAME[childPeriod] || '',
          window: childWindowLabel(childPeriod, goal.date),
          status,
          tags: (child.tags || []).filter(Boolean),
        },
      });
    });
  });
  return rows
    .sort((a, b) => (a.sortKey - b.sortKey) || (a.order - b.order))
    .map(({ sortKey, order, ...row }) => row);
}

/**
 * Build the cascade panel payload for one period.
 *
 * @param {Object} params
 * @param {string} params.period week | month | year
 * @param {Array}  params.goals  optimizedDailyGoals (all periods)
 * @param {Object} params.focusRow the focused routine row
 * @param {string} params.date   viewed day, DD-MM-YYYY
 * @param {Array}  params.children goalsByGoalRef result, already scoped
 */
export function buildCascade({
  period, goals, focusRow, date, children = [],
}) {
  const meta = CASCADE_META[period];
  if (!meta) return null;
  const item = pickCascadeItem({ goals, period, focusRow });
  if (!item) return null;

  const today = moment(date, DAY_FORMAT);
  const days = Array.isArray(item.milestoneDays) ? item.milestoneDays : [];
  const units = days.map((day, index) => styleUnit({
    ...unitLabel(period, day.date, index),
    state: unitState(day.status, day.date, period, today),
  }));

  const limit = threshold[meta.thresholdKey];
  const done = units.filter((unit) => unit.state === 'done').length;
  const complete = !!item.isComplete || done >= limit;

  const linked = linkedGoals({
    period, children, unitDates: days.map((day) => day.date), date,
  }).slice(0, 12);

  return {
    title: item.body,
    range: rangeLabel(period, item.date || date),
    unitName: meta.unitName,
    done,
    threshold: limit,
    complete,
    statusLabel: complete ? 'Done' : 'Active',
    statusColor: complete ? '#4CAF50' : '#FF9800',
    pct: Math.min(100, Math.round((done / Math.max(limit, 1)) * 100)),
    rule: `${period[0].toUpperCase()}${period.slice(1)} auto-ticks after ${limit} ${meta.stepDown} goals`,
    cols: meta.cols,
    units,
    linked,
    linkedLabel: meta.linkedLabel,
    goalItemId: item.id,
    parent: item.goalRef ? 'Rolls up into the next period’s goal' : 'Top of the cascade',
  };
}

export default {
  toMinutes,
  findCurrentRoutine,
  tickButtonFor,
  stateIconFor,
  buildRoutineRows,
  primaryStimulus,
  focusWindow,
  pickCascadeItem,
  linkedGoals,
  buildCascade,
};
