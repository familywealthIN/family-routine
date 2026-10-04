/* eslint-env jest */
/**
 * The Goals cascade model — the whole behaviour of the rebuilt page.
 *
 * Pinned to Saturday 12 September 2026, which is the date Goals.dc.html draws:
 * week 37 runs 6–12 Sep, the month has 30 days and starts on a Tuesday, and the
 * design's own walkthrough ("tick both Start Work tasks → Ship the dashboard
 * reaches 5/5 days and auto-ticks → September goes to 2/3") is a test below.
 */
const moment = require('moment');

const {
  blockedTickToast,
  buildCascade,
  calendarCells,
  currentRoutineId,
  formHintFor,
  goalDateFor,
  groupByRoutine,
  itemsFor,
  manualTickBlocked,
  normaliseTab,
  periodCount,
  periodDone,
  planRowTick,
  routineCleared,
  ruleFor,
  tickDayOutcome,
  titleFor,
  yearAverageOf,
} = require('../goalCascade');

const TODAY = '12-09-2026';
const WEEK_DATE = '11-09-2026';
const MONTH_DATE = '30-09-2026';
const YEAR_DATE = '31-12-2026';
const LIFE_DATE = '01-01-1970';
const NOW = moment('10:00', 'HH:mm');

const ROUTINES = [
  // Deliberately out of time order — the model is what sorts them.
  { id: 'sw', name: 'Start Work', time: '09:00' },
  { id: 'mp', name: 'Morning Pages', time: '06:30' },
  { id: 'dw', name: 'Deep Work', time: '15:00' },
];

const goalsFor = ({
  day = [], week = [], month = [], year = [], life = [],
}) => [
  {
    id: 'gd', period: 'day', date: TODAY, goalItems: day,
  },
  {
    id: 'gw', period: 'week', date: WEEK_DATE, goalItems: week,
  },
  {
    id: 'gm', period: 'month', date: MONTH_DATE, goalItems: month,
  },
  {
    id: 'gy', period: 'year', date: YEAR_DATE, goalItems: year,
  },
  {
    id: 'gl', period: 'lifetime', date: LIFE_DATE, goalItems: life,
  },
];

const view = (goals, overrides = {}) => buildCascade({
  tab: 'day',
  goals,
  routines: ROUTINES,
  selectedDate: TODAY,
  today: TODAY,
  now: NOW,
  ...overrides,
});

// The design's Start Work day: two tasks, neither done yet.
const SW_DAY = [
  {
    id: 'd1', body: 'Ship dashboard PR', taskRef: 'sw', isComplete: false,
  },
  {
    id: 'd2', body: 'Reply to Ana', taskRef: 'sw', isComplete: false,
  },
];

describe('the cascade ladder is the navigation', () => {
  it('draws the five steps in order, Today through Life', () => {
    expect(view(goalsFor({})).ladder.map((step) => step.label))
      .toEqual(['Today', 'Week', 'Month', 'Year', 'Life']);
  });

  it('puts the roll-up threshold BETWEEN two steps, and none after Year', () => {
    const chips = view(goalsFor({})).ladder.map((step) => [step.key, step.threshold]);
    expect(chips).toEqual([
      ['day', '×5'],
      ['week', '×3'],
      ['month', '×6'],
      ['year', ''],
      ['lifetime', ''],
    ]);
  });

  it('counts each level done-of-total, and the Year step as a percentage', () => {
    const built = view(goalsFor({
      day: [{ id: 'd1', taskRef: 'sw', isComplete: true }, { id: 'd2', taskRef: 'sw', isComplete: false }],
      week: [{ id: 'w1', taskRef: 'sw', progress: 5 }, { id: 'w2', taskRef: 'mp', progress: 1 }],
      // 5 of 6 months is 83%, not 84% — chassis.md § the goal cascade.
      year: [{ id: 'y1', taskRef: 'sw', progress: 5 }],
    }));
    const num = (key) => built.ladder.find((step) => step.key === key).num;
    expect(num('day')).toBe('1/2');
    expect(num('week')).toBe('1/2');
    expect(num('year')).toBe('83%');
    expect(built.yearAverage).toBe(83);
  });

  it('marks only the active step and swaps the list below it', () => {
    const built = view(goalsFor({
      week: [{
        id: 'w1', taskRef: 'sw', body: 'Ship it', progress: 2,
      }],
    }), { tab: 'week' });
    expect(built.ladder.filter((step) => step.active).map((step) => step.key)).toEqual(['week']);
    expect(built.listTitle).toBe('This week');
    expect(built.groups[0].rows[0].body).toBe('Ship it');
  });

  it('relabels the day step when the calendar selected another day', () => {
    const built = view(goalsFor({}), { selectedDate: '08-09-2026' });
    expect(built.ladder[0].label).toBe('8 Sep');
    expect(built.listTitle).toBe('Tuesday 8 Sep');
  });

  it('pops only the steps a cascade just closed', () => {
    const built = view(goalsFor({}), { pop: ['week', 'month'] });
    expect(built.ladder.filter((step) => step.pop).map((step) => step.key)).toEqual(['week', 'month']);
  });

  it('names the roll-up rule for the level showing', () => {
    expect(ruleFor('day', { selectedDate: TODAY, today: TODAY }))
      .toContain('5 days auto-tick it');
    expect(ruleFor('week', { selectedDate: TODAY, today: TODAY }))
      .toBe('Week 37 · 6–12 Sep. A week goal auto-ticks after 5 day goals.');
    expect(ruleFor('month', { selectedDate: TODAY, today: TODAY }))
      .toBe('September 2026. A month goal auto-ticks after 3 week goals.');
    expect(ruleFor('year', { selectedDate: TODAY, today: TODAY }))
      .toBe('2026. A year goal auto-ticks after 6 month goals. Tap one to open it.');
    expect(ruleFor('lifetime', { selectedDate: TODAY, today: TODAY }))
      .toContain('tick them by hand');
  });

  it('shows the selected day itself as the rule when it is not today', () => {
    expect(ruleFor('day', { selectedDate: '08-09-2026', today: TODAY })).toBe('Tuesday, 8 September');
  });

  it('falls back to the day step for a level nobody defined', () => {
    expect(normaliseTab('fortnight')).toBe('day');
    expect(normaliseTab('lifetime')).toBe('lifetime');
  });
});

describe('a day goal reaches the week only once its routine is cleared', () => {
  it('does not advance the week while a sibling task is still open', () => {
    const outcome = tickDayOutcome({
      dayItems: SW_DAY,
      weekItems: [{
        id: 'w1', body: 'Ship the dashboard', taskRef: 'sw', progress: 4, period: 'week', date: WEEK_DATE,
      }],
      item: SW_DAY[0],
      routines: ROUTINES,
      isToday: true,
    });
    expect(outcome.toast).toBeNull();
    expect(outcome.ticks).toEqual([]);
    expect(outcome.pop).toEqual([]);
  });

  it('advances it on the tick that completes the LAST task of the routine', () => {
    const outcome = tickDayOutcome({
      dayItems: [{ ...SW_DAY[0], isComplete: true }, SW_DAY[1]],
      weekItems: [{
        id: 'w1', body: 'Ship the dashboard', taskRef: 'sw', progress: 2, period: 'week', date: WEEK_DATE,
      }],
      item: SW_DAY[1],
      routines: ROUTINES,
      isToday: true,
    });
    expect(outcome.toast.title).toBe('Start Work cleared for today');
    expect(outcome.toast.sub).toBe('“Ship the dashboard” → 3/5 days');
    // Under the threshold: the week is closer, not closed, so nothing is sent.
    expect(outcome.ticks).toEqual([]);
    expect(outcome.pop).toEqual(['week']);
  });

  it('judges clearance on the routine, not on the whole day', () => {
    const dayItems = [
      { id: 'd1', taskRef: 'sw', isComplete: true },
      { id: 'd2', taskRef: 'mp', isComplete: false },
    ];
    expect(routineCleared(dayItems, 'sw')).toBe(true);
    expect(routineCleared(dayItems, 'mp')).toBe(false);
    expect(routineCleared(dayItems, 'mp', 'd2')).toBe(true);
  });

  it('says so plainly when the routine has no week goal to feed', () => {
    const outcome = tickDayOutcome({
      dayItems: [{ ...SW_DAY[0], isComplete: true }, SW_DAY[1]],
      weekItems: [],
      item: SW_DAY[1],
      routines: ROUTINES,
      isToday: true,
    });
    expect(outcome.toast.sub).toBe('No week goal on this routine yet');
    expect(outcome.ticks).toEqual([]);
  });

  it('never cascades off today — a past day cannot close this week', () => {
    const outcome = tickDayOutcome({
      dayItems: [{ ...SW_DAY[0], isComplete: true }, SW_DAY[1]],
      weekItems: [{
        id: 'w1', body: 'Ship it', taskRef: 'sw', progress: 4, period: 'week', date: WEEK_DATE,
      }],
      item: SW_DAY[1],
      routines: ROUTINES,
      isToday: false,
    });
    expect(outcome.toast).toBeNull();
  });
});

describe('one tick, the whole cascade', () => {
  const week = {
    id: 'w1', body: 'Ship the dashboard', taskRef: 'sw', progress: 4, period: 'week', date: WEEK_DATE,
  };
  const month = {
    id: 'm1', body: 'Launch mobile dashboard', taskRef: 'sw', progress: 2, period: 'month', date: MONTH_DATE,
  };
  const year = {
    id: 'y1', body: 'Ship v2', taskRef: 'sw', progress: 5, period: 'year', date: YEAR_DATE,
  };
  const run = (overrides = {}) => tickDayOutcome({
    dayItems: [{ ...SW_DAY[0], isComplete: true }, SW_DAY[1]],
    weekItems: [week],
    monthItems: [month],
    yearItems: [year],
    item: SW_DAY[1],
    routines: ROUTINES,
    isToday: true,
    ...overrides,
  });

  it('crosses day → week → month → year in a single gesture', () => {
    expect(run().crossings).toEqual(['week', 'month', 'year']);
  });

  it('sends one mutation per crossing, parents in order', () => {
    expect(run().ticks).toEqual([
      {
        id: 'w1', period: 'week', date: WEEK_DATE, taskRef: 'sw', isComplete: true, isMilestone: false,
      },
      {
        id: 'm1', period: 'month', date: MONTH_DATE, taskRef: 'sw', isComplete: true, isMilestone: false,
      },
      {
        id: 'y1', period: 'year', date: YEAR_DATE, taskRef: 'sw', isComplete: true, isMilestone: false,
      },
    ]);
  });

  it('rolls the whole chain into one toast', () => {
    const { toast } = run();
    expect(toast.title).toBe('“Ship the dashboard” auto-ticked · 5/5 days');
    expect(toast.sub).toBe('Launch mobile dashboard → 3/3 weeks · Ship v2 → 6/6 months');
  });

  it('stops at the month when the month has not crossed yet', () => {
    const outcome = run({ monthItems: [{ ...month, progress: 0 }] });
    expect(outcome.crossings).toEqual(['week']);
    expect(outcome.ticks.map((tick) => tick.period)).toEqual(['week']);
    expect(outcome.toast.sub).toBe('Launch mobile dashboard → 1/3 weeks');
  });

  it('pops every step the gesture touched', () => {
    expect(run().pop).toEqual(['week', 'month', 'year']);
  });

  it('refuses to invent a count the server never sent', () => {
    const outcome = run({ weekItems: [{ ...week, progress: null }] });
    expect(outcome.toast.sub).toBe('“Ship the dashboard” → —/5 days');
    expect(outcome.ticks).toEqual([]);
  });
});

describe('planRowTick — what one tap sends', () => {
  const items = {
    day: [{ ...SW_DAY[0], isComplete: true }, SW_DAY[1]],
    week: [{
      id: 'w1', body: 'Ship the dashboard', taskRef: 'sw', progress: 4, period: 'week', date: WEEK_DATE,
    }],
    month: [],
    year: [{
      id: 'y1', body: 'Ship v2', taskRef: 'sw', progress: 3, period: 'year', date: YEAR_DATE,
    }],
    lifetime: [],
  };
  const dayRow = {
    id: 'd2', period: 'day', date: TODAY, taskRef: 'sw', done: false, isMilestone: false,
  };

  it('sends the day goal plus every threshold it crossed', () => {
    const plan = planRowTick({
      row: dayRow, items, routines: ROUTINES, isToday: true,
    });
    expect(plan.ticks.map((tick) => [tick.period, tick.isComplete])).toEqual([
      ['day', true], ['week', true],
    ]);
    expect(plan.toast.title).toContain('auto-ticked');
  });

  it('never cascades an UNtick', () => {
    const plan = planRowTick({
      row: { ...dayRow, done: true }, items, routines: ROUTINES, isToday: true,
    });
    expect(plan.ticks).toEqual([{
      id: 'd2', period: 'day', date: TODAY, taskRef: 'sw', isComplete: false, isMilestone: false,
    }]);
    expect(plan.toast).toBeNull();
  });

  it('blocks a hand tick the level below already satisfies', () => {
    const blocked = {
      id: 'w1', period: 'week', date: WEEK_DATE, taskRef: 'sw', done: false,
    };
    const plan = planRowTick({
      row: blocked,
      items: { ...items, week: [{ ...items.week[0], progress: 5 }] },
      routines: ROUTINES,
      isToday: true,
    });
    expect(plan.blocked).toBe(true);
    expect(plan.ticks).toEqual([]);
    expect(plan.toast).toEqual({
      icon: 'info',
      color: '#90caf9',
      title: 'Ticked automatically',
      sub: '5 of 5 day goals are done',
    });
  });

  it('still lets a hand tick through below the threshold', () => {
    const plan = planRowTick({
      row: {
        id: 'w1', period: 'week', date: WEEK_DATE, taskRef: 'sw', done: false,
      },
      items,
      routines: ROUTINES,
      isToday: true,
    });
    expect(plan.blocked).toBe(false);
    expect(plan.ticks.map((tick) => tick.period)).toEqual(['week']);
  });

  it('navigates a year row instead of ticking it', () => {
    const plan = planRowTick({
      row: {
        id: 'y1', period: 'year', date: YEAR_DATE, taskRef: 'sw', done: false,
      },
      items,
      routines: ROUTINES,
      isToday: true,
    });
    expect(plan.navigate).toBe('y1');
    expect(plan.ticks).toEqual([]);
  });

  it('ticks a lifetime goal by hand — it has no level below', () => {
    const plan = planRowTick({
      row: {
        id: 'l1', period: 'lifetime', date: LIFE_DATE, taskRef: '', done: false,
      },
      items,
      routines: ROUTINES,
      isToday: true,
    });
    expect(plan.blocked).toBe(false);
    expect(plan.ticks[0]).toEqual({
      id: 'l1', period: 'lifetime', date: LIFE_DATE, taskRef: '', isComplete: true, isMilestone: false,
    });
  });

  it('blocks nothing at all for a row the toast says is automatic', () => {
    expect(manualTickBlocked('lifetime', { progress: 99 })).toBe(false);
    expect(manualTickBlocked('week', { progress: 5 })).toBe(true);
    expect(manualTickBlocked('week', { progress: null })).toBe(false);
    expect(blockedTickToast('month', { progress: 3 }).sub).toBe('3 of 3 week goals are done');
  });
});

describe('every period is grouped by routine in time order', () => {
  const rows = [
    { key: 'a', taskRef: 'dw', done: false },
    { key: 'b', taskRef: 'sw', done: true },
    { key: 'c', taskRef: 'mp', done: false },
    { key: 'd', taskRef: '', done: false },
    { key: 'e', taskRef: 'deleted-routine', done: true },
  ];

  it('orders the buckets by the routine clock, No routine last', () => {
    const groups = groupByRoutine(rows, ROUTINES);
    expect(groups.map((group) => group.name))
      .toEqual(['Morning Pages', 'Start Work', 'Deep Work', 'No routine']);
    expect(groups[groups.length - 1].time).toBe('—');
  });

  it('sweeps a goal whose routine no longer exists into No routine', () => {
    const groups = groupByRoutine(rows, ROUTINES);
    const orphans = groups[groups.length - 1];
    expect(orphans.rows.map((row) => row.key)).toEqual(['d', 'e']);
    expect(orphans.count).toBe('1/2');
  });

  it('drops a routine with nothing in it rather than drawing an empty header', () => {
    const groups = groupByRoutine([{ key: 'a', taskRef: 'sw', done: false }], ROUTINES);
    expect(groups.map((group) => group.name)).toEqual(['Start Work']);
  });

  it('badges exactly one routine NOW, and only on today', () => {
    const nowId = currentRoutineId(ROUTINES, NOW);
    expect(nowId).toBe('sw');
    const badged = groupByRoutine(rows, ROUTINES, { nowId, showNow: true });
    expect(badged.filter((group) => group.isNow).map((group) => group.name)).toEqual(['Start Work']);
    const silent = groupByRoutine(rows, ROUTINES, { nowId, showNow: false });
    expect(silent.filter((group) => group.isNow)).toEqual([]);
    // The orange clock stays even when the badge is suppressed.
    expect(silent.find((group) => group.key === 'sw').current).toBe(true);
  });

  it('suppresses the badge when the selected day is not today', () => {
    const built = view(goalsFor({ day: SW_DAY }), { selectedDate: '08-09-2026' });
    expect(built.groups.some((group) => group.isNow)).toBe(false);
  });

  it('keeps the badge on the Today tab for today', () => {
    const built = view(goalsFor({ day: SW_DAY }));
    expect(built.groups.filter((group) => group.isNow).length).toBe(1);
  });

  it('never badges a routine off the Today tab', () => {
    const built = view(goalsFor({
      day: SW_DAY,
      week: [{ id: 'w1', taskRef: 'sw', progress: 1 }],
    }), { tab: 'week' });
    expect(built.groups.some((group) => group.isNow)).toBe(false);
  });
});

describe('the rows each level draws', () => {
  it('gives a day goal a plain checkbox that strikes through when done', () => {
    const built = view(goalsFor({
      day: [{
        id: 'd1', body: 'Write 3 pages', taskRef: 'mp', isComplete: true,
      }],
    }));
    expect(built.groups[0].rows[0]).toMatchObject({
      kind: 'check', strike: true, done: true, body: 'Write 3 pages',
    });
  });

  it('gives a week goal a streak bar against the threshold', () => {
    const built = view(goalsFor({
      week: [{
        id: 'w1', body: 'Ship it', taskRef: 'sw', progress: 4,
      }],
    }), { tab: 'week' });
    const row = built.groups[0].rows[0];
    expect(row.kind).toBe('bar');
    expect(row.barLabel).toBe('4/5 days');
    expect(row.barPct).toBe(80);
    expect(row.status.label).toBe('Active');
  });

  it('prints an em dash, never a 0, for a streak the read did not carry', () => {
    const built = view(goalsFor({
      week: [{ id: 'w1', body: 'Ship it', taskRef: 'sw' }],
    }), { tab: 'week' });
    expect(built.groups[0].rows[0].barLabel).toBe('—/5 days');
    expect(built.groups[0].rows[0].barPct).toBe(0);
  });

  it('calls a week goal Done once the level below satisfies it', () => {
    const built = view(goalsFor({
      week: [{
        id: 'w1', body: 'Ship it', taskRef: 'sw', progress: 5,
      }],
    }), { tab: 'week' });
    expect(built.groups[0].rows[0].status.label).toBe('Done');
    expect(built.groups[0].rows[0].blocked).toBe(true);
  });

  it('gives a year goal a ring row, not a checkbox', () => {
    const built = view(goalsFor({
      year: [{
        id: 'y1', body: 'Ship v2', taskRef: 'sw', progress: 5,
      }],
    }), { tab: 'year' });
    expect(built.groups[0].rows[0]).toMatchObject({
      kind: 'year', pct: 83, pctLabel: '83%', meta: '5/6 months · Active',
    });
  });

  it('shows a lifetime goal where it came from, or says it came from nowhere', () => {
    const built = view(goalsFor({
      year: [{
        id: 'y1', body: 'Run a half marathon', taskRef: 'mp', progress: 2,
      }],
      life: [
        {
          id: 'l1', body: 'Run a marathon', taskRef: 'mp', goalRef: 'y1',
        },
        { id: 'l2', body: 'Visit 30 countries', taskRef: '' },
      ],
    }), { tab: 'lifetime' });
    const metas = built.groups.reduce((all, group) => all.concat(group.rows.map((row) => row.meta)), []);
    expect(metas).toEqual(['↑ From year goal: Run a half marathon', 'No linked year goal yet']);
  });

  it('says what an empty level means rather than showing nothing', () => {
    expect(view(goalsFor({})).emptyText).toBe('No goals here yet.');
    expect(view(goalsFor({}), { selectedDate: '20-09-2026' }).emptyText)
      .toBe('Nothing planned yet for this day.');
  });

  it('names the add row after the level showing', () => {
    expect(view(goalsFor({})).addLabel).toBe('Add day goal');
    expect(view(goalsFor({}), { tab: 'lifetime' }).addLabel).toBe('Add lifetime goal');
    expect(view(goalsFor({}), { tab: 'month' }).addLabel).toBe('Add month goal');
  });
});

describe('the calendar', () => {
  const cells = () => calendarCells({
    monthDate: TODAY,
    dayGoals: [
      {
        id: 'g1', period: 'day', date: '10-09-2026', goalItems: [{ id: 'a', isComplete: true }, { id: 'b', isComplete: false }],
      },
      {
        id: 'g2', period: 'day', date: '11-09-2026', goalItems: [{ id: 'c', isComplete: true }],
      },
    ],
    selectedDate: TODAY,
    today: TODAY,
  });

  it('pads September 2026 to whole Sunday-first weeks', () => {
    const grid = cells();
    expect(grid.length).toBe(35);
    // 1 September 2026 is a Tuesday, so two blanks lead the grid.
    expect(grid.slice(0, 2).every((cell) => cell.blank)).toBe(true);
    expect(grid[2]).toMatchObject({ day: 1, date: '01-09-2026' });
  });

  it('fills a day ring from its own goals, not from the month', () => {
    const grid = cells();
    expect(grid.find((cell) => cell.day === 10)).toMatchObject({ total: 2, done: 1, value: 50 });
    expect(grid.find((cell) => cell.day === 11)).toMatchObject({ total: 1, done: 1, value: 100 });
  });

  it('leaves a day with no goals at nothing rather than at zero per cent of one', () => {
    expect(cells().find((cell) => cell.day === 5)).toMatchObject({ total: 0, done: 0, value: 0 });
  });

  it('marks the selected day, today and the days that have not happened', () => {
    const grid = cells();
    expect(grid.filter((cell) => cell.selected).map((cell) => cell.day)).toEqual([12]);
    expect(grid.filter((cell) => cell.today).map((cell) => cell.day)).toEqual([12]);
    expect(grid.find((cell) => cell.day === 13).future).toBe(true);
    expect(grid.find((cell) => cell.day === 12).future).toBe(false);
  });

  it('returns nothing at all for a date it cannot read', () => {
    expect(calendarCells({ monthDate: 'not-a-date', selectedDate: '', dayGoals: [] })).toEqual([]);
  });
});

describe('where a goal is filed, and what that means', () => {
  it('files each period on the period date the server uses', () => {
    expect(goalDateFor('day', TODAY)).toBe(TODAY);
    expect(goalDateFor('week', TODAY)).toBe(WEEK_DATE);
    expect(goalDateFor('month', TODAY)).toBe(MONTH_DATE);
    expect(goalDateFor('year', TODAY)).toBe(YEAR_DATE);
    expect(goalDateFor('lifetime', TODAY)).toBe(LIFE_DATE);
  });

  it('tells the new-goal sheet what date its choice implies', () => {
    const at = (period, selectedDate = TODAY) => formHintFor(period, { selectedDate, today: TODAY });
    expect(at('day')).toBe('For today · counts toward the week');
    expect(at('day', '08-09-2026')).toBe('For 8 Sep');
    expect(at('week')).toBe('Week 37 · 6–12 Sep');
    expect(at('month')).toBe('September 2026');
    expect(at('year')).toBe('2026 · opens as its own Year Goals page');
    expect(at('lifetime')).toBe('No date');
  });

  it('stamps every goal item with the document that owns it', () => {
    const items = itemsFor(goalsFor({ week: [{ id: 'w1', body: 'Ship it' }] }), 'week');
    expect(items[0]).toMatchObject({ id: 'w1', period: 'week', date: WEEK_DATE });
  });

  it('de-dupes by id, because a repeated key renders one goal twice', () => {
    const goals = [
      {
        id: 'g1', period: 'week', date: WEEK_DATE, goalItems: [{ id: 'w1' }, { id: 'w1' }],
      },
      {
        id: 'g2', period: 'week', date: '04-09-2026', goalItems: [{ id: 'w1' }, { id: 'w2' }],
      },
    ];
    expect(itemsFor(goals, 'week').map((item) => item.id)).toEqual(['w1', 'w2']);
  });
});

describe('the figures the rest of the app reads', () => {
  it('averages the year ring over the year goals that have a count', () => {
    expect(yearAverageOf([{ progress: 6 }, { progress: 3 }])).toBe(75);
    expect(yearAverageOf([{ progress: 5 }])).toBe(83);
    // A goal with no count must not drag the average to zero.
    expect(yearAverageOf([{ progress: 6 }, { progress: null }])).toBe(100);
    expect(yearAverageOf([])).toBe(0);
  });

  it('clamps a period count so a manual tick cannot print 100 of 5', () => {
    expect(periodCount({ progress: 100 }, 'week')).toBe(5);
    expect(periodCount({ progress: 3 }, 'week')).toBe(3);
    expect(periodCount({ progress: null }, 'week')).toBeNull();
    expect(periodCount(null, 'week')).toBeNull();
  });

  it('treats a goal as done when the server ticked it OR the level below did', () => {
    expect(periodDone({ isComplete: true }, 'week')).toBe(true);
    expect(periodDone({ progress: 5 }, 'week')).toBe(true);
    expect(periodDone({ progress: 4 }, 'week')).toBe(false);
    expect(periodDone({ isComplete: true }, 'lifetime')).toBe(true);
  });

  it('titles each level the way the design does', () => {
    const at = (tab, selectedDate = TODAY) => titleFor(tab, { selectedDate, today: TODAY });
    expect(at('day')).toBe('Today');
    expect(at('week')).toBe('This week');
    expect(at('month')).toBe('September');
    expect(at('year')).toBe('2026');
    expect(at('lifetime')).toBe('Lifetime');
  });

  it('only calls the selected week "This week" when it is this week', () => {
    const at = (selectedDate) => titleFor('week', { selectedDate, today: TODAY });
    const plus = (weeks) => moment(TODAY, 'DD-MM-YYYY').add(weeks, 'weeks').format('DD-MM-YYYY');
    expect(at(TODAY)).toBe('This week');
    expect(at(plus(1))).toBe('Next week');
    expect(at(plus(-1))).toBe('Last week');
    expect(at(plus(3))).toBe(`Week ${moment(plus(3), 'DD-MM-YYYY').week()}`);
  });

  it('leaves milestone items off the Year step, as the year-goal sidebar does', () => {
    const built = view(goalsFor({
      year: [
        {
          id: 'y1', body: 'Ship v2', taskRef: 'sw', progress: 3,
        },
        {
          id: 'y2', body: 'Orphan milestone', taskRef: 'sw', progress: 6, isMilestone: true, goalRef: null,
        },
      ],
    }), { tab: 'year' });
    const ids = built.groups.reduce((all, group) => all.concat(group.rows.map((row) => row.id)), []);
    expect(ids).toEqual(['y1']);
    expect(built.listTotal).toBe(1);
    expect(built.yearAverage).toBe(50);
  });
});
