/* eslint-env jest */
import moment from 'moment';
import {
  findCurrentRoutine,
  buildRoutineRows,
  focusWindow,
  primaryStimulus,
  pickCascadeItem,
  buildCascade,
  routineSlotCount,
} from '../routineFocusModel';

const stimuli = (dSplit, kSplit, gSplit, earned = {}) => [
  { name: 'D', splitRate: dSplit, earned: earned.D || 0 },
  { name: 'K', splitRate: kSplit, earned: earned.K || 0 },
  { name: 'G', splitRate: gSplit, earned: earned.G || 0 },
];

const TASKS = [
  {
    id: 'mp', name: 'Morning Pages', time: '06:30', points: 10, ticked: true, passed: true, stimuli: stimuli(4, 1, 0),
  },
  {
    id: 'wo', name: 'Workout', time: '07:15', points: 12, ticked: false, passed: true, stimuli: stimuli(4, 1, 2),
  },
  {
    id: 'sw', name: 'Start Work', time: '09:00', points: 12, ticked: false, passed: false, stimuli: stimuli(6, 1, 3),
  },
  {
    id: 'lw', name: 'Lunch Walk', time: '12:30', points: 8, ticked: false, passed: false, stimuli: stimuli(4, 1, 0),
  },
];

const at = (time) => moment(time, 'HH:mm');

describe('findCurrentRoutine', () => {
  it('picks the routine whose window contains now', () => {
    expect(findCurrentRoutine(TASKS, at('09:30')).id).toBe('sw');
    expect(findCurrentRoutine(TASKS, at('13:10')).id).toBe('lw');
  });

  // Before the day starts there is still something to concentrate on.
  it('falls back to the first routine before the day has begun', () => {
    expect(findCurrentRoutine(TASKS, at('05:00')).id).toBe('mp');
  });

  it('returns null for an empty day', () => {
    expect(findCurrentRoutine([], at('09:30'))).toBeNull();
    expect(findCurrentRoutine(undefined, at('09:30'))).toBeNull();
  });
});

describe('primaryStimulus', () => {
  it('names G when the routine earns focused output', () => {
    expect(primaryStimulus(TASKS[2])).toBe('G');
  });

  it('falls back through K to D', () => {
    expect(primaryStimulus(TASKS[1])).toBe('G');
    expect(primaryStimulus(TASKS[3])).toBe('K');
    expect(primaryStimulus(TASKS[0])).toBe('K');
    expect(primaryStimulus({ stimuli: [{ name: 'D', splitRate: 4 }] })).toBe('D');
  });
});

describe('buildRoutineRows — tick button states', () => {
  const rowsAt = (time, overrides = {}) => buildRoutineRows(TASKS, {
    now: at(time), isToday: true, ...overrides,
  });

  // These two were inverted against the classic dashboard (`getButtonIcon`),
  // where `alarm` means the window is OPEN and tickable and `more_horiz` means
  // it has not opened yet. Because `buttonDisabled` already disables `wait`, the
  // inversion put the disabled state on the alarm clock and left the routine you
  // CAN tick wearing the inert three dots. The assertions encoded the inversion,
  // so they passed.
  it('gives the current unticked routine the alarm glyph, enabled', () => {
    const sw = rowsAt('09:30').find((r) => r.id === 'sw');
    expect(sw.isCurrent).toBe(true);
    expect(sw.buttonGlyph).toBe('alarm');
    expect(sw.buttonDisabled).toBe(false);
  });

  it('gives a WAITING routine the three-dot glyph, disabled', () => {
    const waiting = TASKS.map((t) => (t.id === 'lw' ? { ...t, wait: true } : t));
    const lw = buildRoutineRows(waiting, { now: at('09:30'), isToday: true })
      .find((r) => r.id === 'lw');
    expect(lw.buttonGlyph).toBe('more_horiz');
    expect(lw.buttonDisabled).toBe(true);
  });

  // Not yet flagged `wait` but still later today: the window is open as far as the
  // server is concerned, so it keeps the alarm — the classic dashboard's rule.
  it('leaves an unflagged later routine on the alarm glyph', () => {
    const lw = rowsAt('09:30').find((r) => r.id === 'lw');
    expect(lw.buttonGlyph).toBe('alarm');
  });

  // A future date has not arrived, so nothing on it is a miss. `passed` cannot
  // be trusted there: `passedTime` compares the routine's `HH:mm` parsed into
  // TODAY against now, so a morning routine on a future day reads as passed and
  // was drawing the `close` cross of a locked miss.
  it('gives every routine on a FUTURE day the three-dot glyph, never a cross', () => {
    const rows = buildRoutineRows(
      TASKS.map((t) => ({ ...t, ticked: false, passed: true })),
      { now: at('09:30'), isToday: false, isPastDay: false },
    );
    rows.forEach((row) => {
      expect(row.buttonGlyph).toBe('more_horiz');
      expect(row.passed).toBe(false);
      expect(row.wait).toBe(true);
      expect(row.past).toBe(false);
      expect(row.redeemable).toBe(false);
      expect(row.buttonDisabled).toBe(true);
      expect(row.stateIcon).toBe('radio_button_unchecked');
    });
  });

  it('still crosses a locked miss on a PAST day', () => {
    const rows = buildRoutineRows(TASKS, {
      now: at('09:30'), isToday: false, isPastDay: true,
    });
    // A ticked routine keeps its check; every unticked one is a locked miss.
    expect(rows.filter((r) => !r.ticked).every((r) => r.buttonGlyph === 'close')).toBe(true);
    expect(rows.find((r) => r.id === 'mp').buttonGlyph).toBe('check');
  });

  it('gives a ticked routine the green check', () => {
    const mp = rowsAt('09:30').find((r) => r.id === 'mp');
    expect(mp.buttonGlyph).toBe('check');
    expect(mp.buttonBg).toBe('#4CAF50');
  });

  // Redemption is today-only: the diamond must not appear on a past date.
  it('offers the diamond on a passed routine today', () => {
    const wo = rowsAt('09:30').find((r) => r.id === 'wo');
    expect(wo.redeemable).toBe(true);
    expect(wo.buttonGlyph).toBe('diamond');
    expect(wo.buttonDisabled).toBe(false);
  });

  it('locks a passed routine on a past date', () => {
    const wo = buildRoutineRows(TASKS, { now: at('09:30'), isToday: false, isPastDay: true })
      .find((r) => r.id === 'wo');
    expect(wo.redeemable).toBe(false);
    expect(wo.buttonGlyph).toBe('close');
    expect(wo.buttonDisabled).toBe(true);
  });

  it('locks an already-redeemed routine', () => {
    const list = TASKS.map((t) => (t.id === 'wo' ? { ...t, redeemed: true } : t));
    const wo = buildRoutineRows(list, { now: at('09:30'), isToday: true })
      .find((r) => r.id === 'wo');
    expect(wo.redeemable).toBe(false);
    expect(wo.buttonGlyph).toBe('close');
  });

  it('counts the routine’s own checklist', () => {
    const rows = buildRoutineRows(TASKS, {
      now: at('09:30'),
      itemsByTask: {
        sw: [{ id: 'a', isComplete: true }, { id: 'b', isComplete: false }],
      },
    });
    const sw = rows.find((r) => r.id === 'sw');
    expect(sw.doneCount).toBe(1);
    // Total is the server slot count (D 6 / K 1) when it exceeds the items.
    expect(sw.totalCount).toBe(6);
    expect(rows.find((r) => r.id === 'lw').totalCount).toBe(4);
  });
});

describe('focusWindow', () => {
  const rows = buildRoutineRows(TASKS, { now: at('09:30'), isToday: true });
  const indexOf = (id) => rows.findIndex((r) => r.id === id);

  it('runs the window to the next routine and reports what is left', () => {
    const w = focusWindow(rows, indexOf('sw'), at('09:30'));
    expect(w.endTime).toBe('12:30');
    expect(w.statusLabel).toBe('In progress');
    expect(w.statusColor).toBe('#FF9800');
    expect(w.leftLabel).toBe('3h 00m left');
    // 30 of 210 minutes gone.
    expect(w.elapsedPct).toBe(14);
  });

  it('runs the last routine of the day to midnight', () => {
    const w = focusWindow(rows, rows.length - 1, at('13:00'));
    expect(w.endTime).toBe('23:59');
  });

  it('says when an upcoming routine starts', () => {
    const w = focusWindow(rows, indexOf('lw'), at('09:30'));
    expect(w.statusLabel).toBe('Up next');
    expect(w.leftLabel).toBe('starts in 3h 00m');
    expect(w.elapsedPct).toBe(0);
  });

  // A routine stays current for its whole window but the server marks it
  // `passed` 30 min in, which freezes a redeem price — the status has to carry
  // both facts or it contradicts the diamond on the button.
  it('says times up on a current routine that already costs points', () => {
    const live = buildRoutineRows(
      TASKS.map((t) => (t.id === 'sw' ? { ...t, passed: true } : t)),
      { now: at('09:30'), isToday: true },
    );
    const w = focusWindow(live, live.findIndex((r) => r.id === 'sw'), at('09:30'));
    expect(live.find((r) => r.id === 'sw').redeemable).toBe(true);
    expect(w.statusLabel).toBe('In progress · times up');
    expect(w.statusColor).toBe('#FF9800');
  });

  it('offers redemption on a missed routine and marks a done one done', () => {
    expect(focusWindow(rows, indexOf('wo'), at('09:30')).statusLabel)
      .toBe('Missed · redeem with points');
    expect(focusWindow(rows, indexOf('mp'), at('09:30')).statusLabel).toBe('Done');
    expect(focusWindow(rows, indexOf('wo'), at('09:30')).elapsedPct).toBe(100);
  });

  it('degrades to an empty window when there is no routine', () => {
    const w = focusWindow([], 0, at('09:30'));
    expect(w.endTime).toBe('23:59');
    expect(w.statusLabel).toBe('');
  });
});

describe('pickCascadeItem', () => {
  const goals = [{
    id: 'wk',
    period: 'week',
    date: '12-09-2026',
    goalItems: [
      { id: 'wg_other', body: 'Run 20 km', taskRef: 'wo' },
      { id: 'wg_sw', body: 'Ship the dashboard', taskRef: 'sw' },
    ],
  }];

  // The goal today's checklist actually rolls up into beats every heuristic.
  it('prefers the goal the focused routine’s day items link to', () => {
    const linked = [{
      ...goals[0],
      goalItems: [
        { id: 'wg_first', body: 'Created against sw first', taskRef: 'sw' },
        { id: 'wg_free', body: 'No routine', taskRef: '' },
      ],
    }];
    const focusRow = { id: 'sw', items: [{ goalRef: 'wg_free' }] };
    expect(pickCascadeItem({ goals: linked, period: 'week', focusRow }).id).toBe('wg_free');
  });

  // A stray goalRef must not drag another routine's goal onto this one's tab.
  it('ignores a linked goal that belongs to another routine', () => {
    const focusRow = { id: 'lw', items: [{ goalRef: 'wg_sw' }] };
    expect(pickCascadeItem({ goals, period: 'week', focusRow })).toBeNull();
  });

  it('falls back to a goal created against this routine', () => {
    const focusRow = { id: 'wo', items: [] };
    expect(pickCascadeItem({ goals, period: 'week', focusRow }).id).toBe('wg_other');
  });

  // The reported bug: with no goal of its own the tab showed another
  // routine's. It is empty instead.
  it('never falls back to another routine’s goal for the period', () => {
    const focusRow = { id: 'nope', items: [] };
    expect(pickCascadeItem({ goals, period: 'week', focusRow })).toBeNull();
    expect(buildCascade({
      period: 'week', goals, focusRow, date: '12-09-2026',
    })).toBeNull();
  });

  it('shows nothing when no routine is focused', () => {
    expect(pickCascadeItem({ goals, period: 'week', focusRow: null })).toBeNull();
  });

  it('returns null when the period has no goal', () => {
    expect(pickCascadeItem({ goals, period: 'month', focusRow: null })).toBeNull();
  });
});

describe('buildCascade', () => {
  const weekGoals = [{
    id: 'wk',
    period: 'week',
    date: '12-09-2026',
    goalItems: [{
      id: 'wg_sw',
      body: 'Ship the dashboard',
      date: '12-09-2026',
      isComplete: false,
      taskRef: 'sw',
      milestoneDays: [
        { date: '06-09-2026', status: 'none' },
        { date: '07-09-2026', status: 'complete' },
        { date: '08-09-2026', status: 'complete' },
        { date: '09-09-2026', status: 'complete' },
        { date: '10-09-2026', status: 'complete' },
        { date: '11-09-2026', status: 'missed' },
        { date: '12-09-2026', status: 'upcoming' },
      ],
    }],
  }];

  const cascade = buildCascade({
    period: 'week',
    goals: weekGoals,
    focusRow: { id: 'sw', items: [] },
    date: '12-09-2026',
    children: [{
      id: 'd1', period: 'day', date: '10-09-2026', goalItems: [{ id: 'x', body: 'Current task card', isComplete: true }],
    }],
  });

  it('counts met day milestones against the week threshold', () => {
    expect(cascade.done).toBe(4);
    expect(cascade.threshold).toBe(5);
    expect(cascade.complete).toBe(false);
    expect(cascade.statusLabel).toBe('Active');
    expect(cascade.pct).toBe(80);
    expect(cascade.rule).toBe('Week auto-ticks after 5 day goals');
  });

  it('lays the week out as seven labelled day cells', () => {
    expect(cascade.cols).toBe(7);
    expect(cascade.units).toHaveLength(7);
    expect(cascade.units.map((u) => u.label))
      .toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });

  // 'upcoming' is ambiguous on its own: the cell holding the viewed day is the
  // live one, later cells are merely future.
  it('marks the viewed day active and keeps misses red', () => {
    expect(cascade.units[6].state).toBe('active');
    expect(cascade.units[6].color).toBe('#FF9800');
    expect(cascade.units[5].state).toBe('missed');
    expect(cascade.units[1].state).toBe('done');
    expect(cascade.units[0].state).toBe('none');
  });

  it('lists the linked lower-level goals it was given, with a detail summary', () => {
    expect(cascade.linkedLabel).toBe('Linked day goals');
    expect(cascade.linked).toEqual([{
      id: 'x',
      label: 'Thu',
      body: 'Current task card',
      isComplete: true,
      detail: {
        period: 'Day goal', window: 'Thu, 10 Sep 2026', status: 'Done', tags: [],
      },
    }]);
  });

  it('sorts linked goals by their window, oldest first, and flags misses', () => {
    const sorted = buildCascade({
      period: 'week',
      goals: weekGoals,
      focusRow: { id: 'sw', items: [] },
      date: '12-09-2026',
      children: [
        {
          id: 'd3', period: 'day', date: '11-09-2026', goalItems: [{ id: 'c', body: 'Fri', tags: ['deep'] }],
        },
        {
          id: 'd1', period: 'day', date: '07-09-2026', goalItems: [{ id: 'a', body: 'Mon', isComplete: true }],
        },
        {
          id: 'd4', period: 'day', date: '12-09-2026', goalItems: [{ id: 'd', body: 'Sat' }],
        },
        {
          id: 'd2', period: 'day', date: '09-09-2026', goalItems: [{ id: 'b', body: 'Wed' }],
        },
      ],
    });
    expect(sorted.linked.map((row) => row.body)).toEqual(['Mon', 'Wed', 'Fri', 'Sat']);
    expect(sorted.linked.map((row) => row.detail.status)).toEqual(['Done', 'Missed', 'Missed', 'Open']);
    expect(sorted.linked[2].detail.tags).toEqual(['deep']);
  });

  it('numbers a month goal’s linked weeks by their place in the grid', () => {
    const month = buildCascade({
      period: 'month',
      goals: [{
        id: 'mo',
        period: 'month',
        date: '30-09-2026',
        goalItems: [{
          id: 'mg',
          body: 'Launch',
          taskRef: 'sw',
          milestoneDays: [
            { date: '04-09-2026', status: 'complete' },
            { date: '11-09-2026', status: 'upcoming' },
          ],
        }],
      }],
      focusRow: { id: 'sw', items: [] },
      date: '12-09-2026',
      children: [
        {
          id: 'w2', period: 'week', date: '11-09-2026', goalItems: [{ id: 'w2i', body: 'Second' }],
        },
        {
          id: 'w1', period: 'week', date: '04-09-2026', goalItems: [{ id: 'w1i', body: 'First', isComplete: true }],
        },
      ],
    });
    expect(month.linked.map((row) => [row.label, row.body])).toEqual([['W1', 'First'], ['W2', 'Second']]);
    expect(month.linked[1].detail.period).toBe('Week goal');
  });

  it('names its range', () => {
    expect(cascade.range).toBe('Week of 6 – 12 Sep');
  });

  it('counts a month in weeks and a year in months', () => {
    const monthGoals = [{
      id: 'mo',
      period: 'month',
      date: '12-09-2026',
      goalItems: [{
        id: 'mg', body: 'Launch mobile dashboard', date: '12-09-2026', taskRef: 'sw', milestoneDays: [{ date: '04-09-2026', status: 'complete' }],
      }],
    }];
    const month = buildCascade({
      period: 'month', goals: monthGoals, focusRow: { id: 'sw', items: [] }, date: '12-09-2026',
    });
    expect(month.unitName).toBe('weeks');
    expect(month.threshold).toBe(3);
    expect(month.cols).toBe(5);
    expect(month.units[0].label).toBe('W1');
    expect(month.range).toBe('September 2026');

    const yearGoals = [{
      id: 'yr',
      period: 'year',
      date: '12-09-2026',
      goalItems: [{
        id: 'yg', body: 'Ship v2', date: '12-09-2026', taskRef: 'sw', milestoneDays: [{ date: '15-03-2026', status: 'complete' }],
      }],
    }];
    const year = buildCascade({
      period: 'year', goals: yearGoals, focusRow: { id: 'sw', items: [] }, date: '12-09-2026',
    });
    expect(year.unitName).toBe('months');
    expect(year.threshold).toBe(6);
    expect(year.cols).toBe(6);
    expect(year.units[0].label).toBe('Mar');
    expect(year.range).toBe('2026');
  });

  it('is null for the day tab and for a period with no goal', () => {
    expect(buildCascade({ period: 'day', goals: weekGoals, date: '12-09-2026' })).toBeNull();
    expect(buildCascade({ period: 'year', goals: weekGoals, date: '12-09-2026' })).toBeNull();
  });

  it('honours a goal the server has already auto-completed', () => {
    const completed = [{
      id: 'wk',
      period: 'week',
      date: '12-09-2026',
      goalItems: [{
        id: 'wg', body: 'Done goal', date: '12-09-2026', isComplete: true, taskRef: 'sw', milestoneDays: [],
      }],
    }];
    const result = buildCascade({
      period: 'week', goals: completed, focusRow: { id: 'sw', items: [] }, date: '12-09-2026',
    });
    expect(result.complete).toBe(true);
    expect(result.statusLabel).toBe('Done');
  });
});

// The server only stamps `passed` while the day is live, so on a past day a
// routine that was never marked would read as "Up next · starts in 1m" with a
// live Tick button — driven by today's clock against a day that is over.
describe('past and future days ignore the live clock', () => {
  const unmarked = TASKS.map((t) => ({ ...t, passed: false }));

  it('treats every routine on a past day as passed and locks unticked ones', () => {
    const rows = buildRoutineRows(unmarked, {
      now: at('09:30'), isToday: false, isPastDay: true,
    });
    const lw = rows.find((r) => r.id === 'lw');
    expect(lw.past).toBe(true);
    expect(lw.passed).toBe(true);
    expect(lw.isCurrent).toBe(false);
    expect(lw.redeemable).toBe(false);
    expect(lw.buttonDisabled).toBe(true);
    expect(lw.buttonGlyph).toBe('close');
    const w = focusWindow(rows, rows.indexOf(lw), at('09:30'), { isToday: false });
    expect(w.statusLabel).toBe('Missed');
    expect(w.leftLabel).toBe('passed');
    // A ticked routine on a past day is still done.
    expect(rows.find((r) => r.id === 'mp').stateIcon).toBe('check_circle');
  });

  it('does not count down to a future day\'s routine with today\'s clock', () => {
    const rows = buildRoutineRows(unmarked, { now: at('12:29'), isToday: false });
    const lw = rows.find((r) => r.id === 'lw');
    expect(lw.past).toBe(false);
    const w = focusWindow(rows, rows.indexOf(lw), at('12:29'), { isToday: false });
    expect(w.statusLabel).toBe('Up next');
    expect(w.leftLabel).toBe('starts 12:30');
  });
});

describe('routineSlotCount (server equation: round(D / K))', () => {
  const task = (d) => ({ stimuli: [{ name: 'D', splitRate: d }, { name: 'K', splitRate: 2 }] });
  it('gives one slot to a short window, including 2h20m', () => {
    expect(routineSlotCount(task(2))).toBe(1);
    expect(routineSlotCount(task(7 / 3))).toBe(1);
  });
  it('gives two slots to a 4h30m window', () => {
    expect(routineSlotCount(task(4.5))).toBe(2);
  });
  it('is 0 before stimuli load', () => {
    expect(routineSlotCount({})).toBe(0);
    expect(routineSlotCount({ stimuli: [] })).toBe(0);
  });
});

describe('buildRoutineRows totalCount', () => {
  it('reads "0 of 1" for a routine with no checklist items yet', () => {
    const [row] = buildRoutineRows([{
      id: 'a', time: '06:00', stimuli: [{ name: 'D', splitRate: 2 }, { name: 'K', splitRate: 2 }],
    }], { now: moment('06:30', 'HH:mm'), itemsByTask: {}, isToday: true });
    expect(row.doneCount).toBe(0);
    expect(row.totalCount).toBe(1);
  });
});
