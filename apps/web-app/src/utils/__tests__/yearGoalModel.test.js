/* eslint-env jest */
/**
 * The Year Goals arithmetic. Everything the three shells agree on lives here, so
 * everything that could silently disagree is pinned here.
 */
const moment = require('moment');

const {
  TH,
  STATUS,
  buildYearGoal,
  monthTile,
  monthTiles,
  planTick,
  createDraft,
  yearPercent,
  yearRule,
  periodStatus,
  yearGoalRows,
  aboutBullets,
  treeItems,
  itemForRow,
  nextWeekDate,
} = require('../yearGoalModel');

/** 12-09-2026 is a Saturday in week 38; September is month index 8. */
const TODAY = '12-09-2026';
const SEP = 8;

const dayGoal = (id, date, done) => ({
  id, body: `Day ${id}`, period: 'day', date, isComplete: !!done, status: done ? 'done' : 'todo',
});

const weekGoal = (id, date, days, done) => ({
  id,
  body: `Week ${id}`,
  period: 'week',
  date,
  isComplete: !!done,
  milestones: days || [],
});

const monthGoal = (id, date, weeks, done) => ({
  id,
  body: `Month ${id}`,
  period: 'month',
  date,
  isComplete: !!done,
  milestones: weeks || [],
});

const yearGoal = (months, extra) => ({
  id: 'y1',
  body: 'Ship v2 of Routine Notes',
  period: 'year',
  date: '31-12-2026',
  contribution: 'Rebuild around the routine you are in.\nShip from one codebase.',
  milestones: months || [],
  ...extra,
});

/** n done months, placed in the earliest calendar slots, each marked complete. */
const doneMonths = (n) => {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(monthGoal(`m${i}`, moment({ year: 2026, month: i, day: 1 }).endOf('month').format('DD-MM-YYYY'), [], true));
  }
  return out;
};

describe('thresholds come from the existing constant', () => {
  it('re-keys autoCheckThreshold by the period it ticks', () => {
    // eslint-disable-next-line global-require
    const { PROFILE_SETTINGS } = require('@routine-notes/ui/constants/settings');
    const auto = PROFILE_SETTINGS.autoCheckThreshold;
    expect(TH).toEqual({ week: auto.day, month: auto.week, year: auto.month });
    expect(TH).toEqual({ week: 5, month: 3, year: 6 });
  });
});

describe('the year percentage', () => {
  it('rounds the ratio, so 5 of 6 months is 83% and not 84%', () => {
    expect(yearPercent(5)).toBe(83);
    // The mistake this guards against is rounding 83.33 up, or ceil-ing it.
    expect(yearPercent(5)).not.toBe(84);
  });

  it('matches the ring the hero paints', () => {
    const tree = buildYearGoal(yearGoal(doneMonths(5)), TODAY);
    expect(tree.monthsDone).toBe(5);
    expect(tree.percent).toBe(83);
  });

  it('never exceeds 100', () => {
    expect(yearPercent(9)).toBe(100);
  });

  it('reads 0% with nothing done', () => {
    expect(yearPercent(0)).toBe(0);
  });
});

describe('the one rule line under the ring', () => {
  it('counts down while the year is open', () => {
    expect(yearRule(5, false)).toBe('Ticks after 6 month goals · 1 to go');
    expect(yearRule(0, false)).toBe('Ticks after 6 month goals · 6 to go');
  });

  it('says what ticked it once it is done', () => {
    expect(yearRule(6, true)).toBe('Auto-ticked by 6 month goals');
  });

  it('is the only line the tree carries — there is no second alert', () => {
    const open = buildYearGoal(yearGoal(doneMonths(5)), TODAY);
    expect(open.rule).toBe('Ticks after 6 month goals · 1 to go');
    const closed = buildYearGoal(yearGoal(doneMonths(6)), TODAY);
    expect(closed.rule).toBe('Auto-ticked by 6 month goals');
    expect(closed.percent).toBe(100);
    expect(closed.isComplete).toBe(true);
  });
});

describe('status labels', () => {
  it('uses Done / Active / Inactive, and Inactive for both past and future', () => {
    expect(periodStatus({ isComplete: true }, false).label).toBe('Done');
    expect(periodStatus({ isComplete: false }, true).label).toBe('Active');
    expect(periodStatus({ isComplete: false }, false).label).toBe('Inactive');
    expect(STATUS.inactive.label).toBe('Inactive');
  });

  it('labels a past month with no completion Inactive, and the current one Active', () => {
    const tree = buildYearGoal(yearGoal([
      monthGoal('mJan', '31-01-2026', []),
      monthGoal('mSep', '30-09-2026', []),
      monthGoal('mDec', '31-12-2026', []),
    ]), TODAY);
    expect(tree.months[0].status.label).toBe('Inactive');
    expect(tree.months[SEP].status.label).toBe('Active');
    expect(tree.months[11].status.label).toBe('Inactive');
  });

  it('never calls the year itself Inactive — the year you are in is Active', () => {
    const tree = buildYearGoal(yearGoal([]), TODAY);
    expect(tree.status.label).toBe('Active');
  });
});

describe('the 12-month strip', () => {
  const tree = () => buildYearGoal(yearGoal([
    monthGoal('mMar', '31-03-2026', [], true),
    monthGoal('mSep', '30-09-2026', [weekGoal('w1', '11-09-2026', [], true)]),
  ]), TODAY);

  it('renders a tile for every month, present or not', () => {
    expect(monthTiles(tree(), SEP)).toHaveLength(12);
  });

  it('shows a done month as a solid green disc with a check', () => {
    const tile = monthTile(tree().months[2], SEP);
    expect(tile.state).toBe('done');
    expect(tile.fill).toBe('#4CAF50');
    expect(tile.icon).toBe('check');
    expect(tile.text).toBe('');
  });

  it('shows an active month as a ring reading n/3', () => {
    const tile = monthTile(tree().months[SEP], SEP);
    expect(tile.state).toBe('active');
    expect(tile.text).toBe('1/3');
    // The current month is orange even before it has earned anything.
    expect(tile.ringColor).toBe('#FF9800');
    expect(tile.fill).toBe('transparent');
  });

  it('shows a month with no goal as a dashed track, + ahead and − behind', () => {
    const future = monthTile(tree().months[11], SEP);
    expect(future.state).toBe('empty');
    expect(future.trackDash).toBe('3 3');
    expect(future.icon).toBe('add');

    const past = monthTile(tree().months[0], SEP);
    expect(past.state).toBe('empty');
    expect(past.icon).toBe('remove');
  });

  it('marks only the focused tile selected', () => {
    const tiles = monthTiles(tree(), SEP);
    expect(tiles.filter((t) => t.selected).map((t) => t.index)).toEqual([SEP]);
  });
});

describe('a week ticks from its own days', () => {
  const weekWith = (doneCount, total) => {
    const days = [];
    for (let i = 0; i < total; i += 1) {
      days.push(dayGoal(`d${i}`, `0${i + 6}-09-2026`, i < doneCount));
    }
    return buildYearGoal(yearGoal([
      monthGoal('mSep', '30-09-2026', [weekGoal('w1', '11-09-2026', days)]),
    ]), TODAY);
  };

  it('auto-ticks at 5 done days and refuses the hand tick afterwards', () => {
    const tree = weekWith(5, 6);
    const week = tree.months[SEP].weeks[0];
    expect(week.doneDays).toBe(5);
    expect(week.isComplete).toBe(true);
    expect(week.canTickByHand).toBe(false);

    const plan = planTick(tree, { level: 'week', id: 'w1' });
    expect(plan.blocked).toBe(true);
    expect(plan.ticks).toEqual([]);
    expect(plan.toast.title).toBe('Ticked automatically');
    expect(plan.toast.sub).toBe('5 of 5 day goals are done');
  });

  it('lets a week with fewer than 5 days defined be ticked by hand', () => {
    const tree = weekWith(2, 3);
    const week = tree.months[SEP].weeks[0];
    expect(week.isComplete).toBe(false);
    expect(week.canTickByHand).toBe(true);

    const plan = planTick(tree, { level: 'week', id: 'w1' });
    expect(plan.blocked).toBe(false);
    expect(plan.ticks).toEqual([expect.objectContaining({ id: 'w1', period: 'week', isComplete: true })]);
  });

  it('sends taskRef as an empty string for a period goal, not a routine id', () => {
    const plan = planTick(weekWith(0, 2), { level: 'week', id: 'w1' });
    expect(plan.ticks[0].taskRef).toBe('');
  });

  it('un-ticks a hand-ticked week without cascading anything', () => {
    const tree = buildYearGoal(yearGoal([
      monthGoal('mSep', '30-09-2026', [weekGoal('w1', '11-09-2026', [], true)]),
    ]), TODAY);
    const plan = planTick(tree, { level: 'week', id: 'w1' });
    expect(plan.ticks).toEqual([expect.objectContaining({ id: 'w1', isComplete: false })]);
    expect(plan.events).toEqual([]);
  });
});

describe('one tick, the whole cascade', () => {
  /**
   * September has its month goal, two weeks already done and a third standing at
   * 4 of 5 days. The year has 4 months done. Ticking the fifth day of that week
   * therefore crosses week, month AND year in one gesture.
   */
  const almostThere = () => {
    const days = [0, 1, 2, 3].map((i) => dayGoal(`d${i}`, `0${i + 6}-09-2026`, true));
    days.push(dayGoal('d4', '11-09-2026', false));
    return buildYearGoal(yearGoal([
      ...doneMonths(4),
      monthGoal('mSep', '30-09-2026', [
        weekGoal('wA', '04-09-2026', [], true),
        weekGoal('wB', '11-09-2026', days),
        weekGoal('wC', '18-09-2026', [], true),
      ]),
    ]), TODAY);
  };

  it('ticks the day, its week, its month and the year, in that order', () => {
    const tree = almostThere();
    expect(tree.monthsDone).toBe(4);
    expect(tree.months[SEP].weeksDone).toBe(2);

    const plan = planTick(tree, { level: 'day', id: 'd4' });
    expect(plan.ticks.map((t) => t.id)).toEqual(['d4', 'wB', 'mSep']);
    expect(plan.ticks.map((t) => t.period)).toEqual(['day', 'week', 'month']);
    expect(plan.ticks.every((t) => t.isComplete)).toBe(true);
  });

  it('posts one chat event per crossing', () => {
    const plan = planTick(almostThere(), { level: 'day', id: 'd4' });
    expect(plan.events.map((e) => e.text)).toEqual([
      'Week wB auto-ticked · 5/5 days',
      'September auto-ticked · 3/3 weeks',
      'Year at 83% · 5/6 months',
    ]);
  });

  it('shows one rollup toast, not three', () => {
    const plan = planTick(almostThere(), { level: 'day', id: 'd4' });
    expect(plan.toast.title).toBe('Week wB auto-ticked · 5/5 days');
    expect(plan.toast.sub)
      .toBe('September auto-ticked · 3/3 weeks · Year at 83% · 5/6 months');
  });

  it('stops at the week when the month is not yet at 3', () => {
    const days = [0, 1, 2, 3].map((i) => dayGoal(`d${i}`, `0${i + 6}-09-2026`, true));
    days.push(dayGoal('d4', '11-09-2026', false));
    const tree = buildYearGoal(yearGoal([
      monthGoal('mSep', '30-09-2026', [weekGoal('wB', '11-09-2026', days)]),
    ]), TODAY);
    const plan = planTick(tree, { level: 'day', id: 'd4' });
    expect(plan.ticks.map((t) => t.id)).toEqual(['d4', 'wB']);
    expect(plan.events.map((e) => e.text)).toEqual(['Week wB auto-ticked · 5/5 days']);
    expect(plan.toast.sub).toBe('September 1/3 weeks');
  });

  it('crowns the year when the sixth month lands', () => {
    const tree = buildYearGoal(yearGoal([
      ...doneMonths(5),
      monthGoal('mSep', '30-09-2026', []),
    ]), TODAY);
    const plan = planTick(tree, { level: 'month', id: 'mSep' });
    expect(plan.ticks.map((t) => t.id)).toEqual(['mSep', 'y1']);
    expect(plan.events[plan.events.length - 1].text)
      .toBe('Year complete · Ship v2 of Routine Notes');
    expect(plan.events[plan.events.length - 1].icon).toBe('emoji_events');
  });

  it('does nothing for an id that is not in the tree', () => {
    const plan = planTick(almostThere(), { level: 'day', id: 'nope' });
    expect(plan.ticks).toEqual([]);
    expect(plan.events).toEqual([]);
  });
});

describe('creating a child locks its parent', () => {
  const tree = () => buildYearGoal(yearGoal([
    monthGoal('mSep', '30-09-2026', [
      weekGoal('w1', '11-09-2026', [dayGoal('d1', '07-09-2026', true)]),
    ]),
  ]), TODAY);

  it('locks a month goal to the year goal and dates it to the month end', () => {
    const draft = createDraft(tree(), 'month', { monthIndex: SEP, today: TODAY });
    expect(draft.goalRef).toBe('y1');
    expect(draft.parentLabel).toBe('Ship v2 of Routine Notes');
    expect(draft.date).toBe('30-09-2026');
    expect(draft.periodLabel).toBe('September 2026');
  });

  it('locks a week goal to the focused month goal', () => {
    const draft = createDraft(tree(), 'week', { monthIndex: SEP, today: TODAY });
    expect(draft.goalRef).toBe('mSep');
    expect(draft.parentLabel).toBe('Month mSep');
    expect(draft.period).toBe('week');
  });

  it('numbers a new week after the month’s last planned one, on a Friday', () => {
    const draft = createDraft(tree(), 'week', { monthIndex: SEP, today: TODAY });
    // The month's last week is 11-09 (a Friday), so the next is 18-09.
    expect(draft.date).toBe('18-09-2026');
    expect(moment(draft.date, 'DD-MM-YYYY').day()).toBe(5);
  });

  it('locks a day goal to its week and takes the first free day', () => {
    const draft = createDraft(tree(), 'day', { weekId: 'w1', today: TODAY });
    expect(draft.goalRef).toBe('w1');
    expect(draft.parentLabel).toBe('Week w1');
    expect(draft.period).toBe('day');
    // Today is Saturday 12-09; Sunday 06 is the only taken slot, so 12 is free.
    expect(draft.date).toBe('12-09-2026');
  });

  it('refuses a week under a month that has no goal', () => {
    expect(createDraft(tree(), 'week', { monthIndex: 0, today: TODAY })).toBeNull();
  });
});

/**
 * A week belongs to a month when its Sun–Sat span overlaps it — the same rule
 * the server uses to gather a month's week docs (`periodChildDates('month')`).
 */
describe('a new week never leaves its month', () => {
  const OCT = 9;
  const october = (weeks) => buildYearGoal(yearGoal([
    monthGoal('mOct', '31-10-2026', weeks),
  ]), '03-10-2026');

  it('keeps a week that straddles the month end — 27 Sep – 3 Oct is still September’s', () => {
    const tree = buildYearGoal(yearGoal([
      monthGoal('mSep', '30-09-2026', [weekGoal('w1', '25-09-2026', [])]),
    ]), TODAY);
    expect(nextWeekDate(2026, tree.months[SEP], TODAY)).toBe('02-10-2026');
  });

  it('offers no week once the last one reaches the month end — never 1 – 7 Nov', () => {
    const tree = october([weekGoal('w1', '30-10-2026', [])]);
    expect(nextWeekDate(2026, tree.months[OCT], '03-10-2026')).toBeNull();
    expect(createDraft(tree, 'week', { monthIndex: OCT, today: '03-10-2026' })).toBeNull();
  });

  it('still offers the last week of the month', () => {
    const tree = october([weekGoal('w1', '23-10-2026', [])]);
    expect(nextWeekDate(2026, tree.months[OCT], '03-10-2026')).toBe('30-10-2026');
  });
});

describe('the goal switcher rows', () => {
  const goals = [{
    id: 'g-2026',
    date: '31-12-2026',
    period: 'year',
    goalItems: [
      {
        id: 'y1',
        body: 'Ship v2',
        date: '31-12-2026',
        routine: { id: 'r1', name: 'Start Work' },
        milestones: doneMonths(5),
      },
      {
        id: 'y2',
        body: 'Run a half marathon',
        date: '31-12-2026',
        routine: { id: 'r2', name: 'Workout' },
        milestones: doneMonths(1),
      },
    ],
  }];

  it('derives every row from the one full read', () => {
    const rows = yearGoalRows(goals, { activeId: 'y1', today: TODAY });
    const ids = rows.filter((r) => !r.header).map((r) => r.id);
    expect(ids).toEqual(['y1', 'y2']);
  });

  it('marks the open goal active and carries its percentage', () => {
    const rows = yearGoalRows(goals, { activeId: 'y1', today: TODAY })
      .filter((r) => !r.header);
    expect(rows[0]).toMatchObject({ id: 'y1', isActive: true, percent: 83 });
    expect(rows[1]).toMatchObject({ id: 'y2', isActive: false, percent: 17 });
  });

  it('leaves the routine time unknown rather than inventing one', () => {
    const rows = yearGoalRows(goals, { today: TODAY }).filter((r) => !r.header);
    expect(rows.every((r) => r.routineTime === '')).toBe(true);
  });

  it('searches titles and routine names', () => {
    const rows = yearGoalRows(goals, { query: 'workout', today: TODAY })
      .filter((r) => !r.header);
    expect(rows.map((r) => r.id)).toEqual(['y2']);
  });

  // grvpanchal@gmail.com: every 2026 year goal hangs off a lifetime goal, so each
  // is stored with isMilestone: true — and the switcher used to show none.
  it('lists a year goal that is a milestone of a lifetime goal, not a step of a sibling', () => {
    const linked = [{
      ...goals[0],
      goalItems: [
        { ...goals[0].goalItems[0], isMilestone: true, goalRef: 'life-1' },
        {
          id: 'y3', body: 'Step toward Ship v2', date: '31-12-2026', isMilestone: true, goalRef: 'y1',
        },
      ],
    }];
    const rows = yearGoalRows(linked, { today: TODAY }).filter((r) => !r.header);
    expect(rows.map((r) => r.id)).toEqual(['y1']);
  });

  it('sorts lowest progress first on the progress chip', () => {
    const rows = yearGoalRows(goals, { sort: 'progress', today: TODAY });
    expect(rows[0].header).toBe('LOWEST PROGRESS FIRST');
    expect(rows.filter((r) => !r.header).map((r) => r.id)).toEqual(['y2', 'y1']);
  });
});

describe('the about bullets', () => {
  it('splits the stored contribution into lines', () => {
    expect(aboutBullets('One thing.\n- Another thing.')).toEqual(['One thing.', 'Another thing.']);
  });

  it('is empty when nothing is stored, so the card can say so', () => {
    expect(aboutBullets('')).toEqual([]);
    expect(aboutBullets(null)).toEqual([]);
  });
});

describe('the tree itself', () => {
  it('derives progress client-side, because the server never sends it', () => {
    const tree = buildYearGoal(yearGoal(doneMonths(2)), TODAY);
    // `progress` is absent from the payload on purpose — see yearGoalQueries.js.
    expect(tree.monthsDone).toBe(2);
  });

  it('drops a duplicated milestone id rather than rendering it twice', () => {
    const dup = monthGoal('mSep', '30-09-2026', []);
    const tree = buildYearGoal(yearGoal([dup, { ...dup }]), TODAY);
    expect(tree.months.filter((m) => m.goal).length).toBe(1);
  });

  it('ignores a milestone of the wrong period at every level', () => {
    const tree = buildYearGoal(yearGoal([
      monthGoal('mSep', '30-09-2026', [
        weekGoal('w1', '11-09-2026', [
          dayGoal('d1', '07-09-2026', true),
          {
            id: 'x', period: 'week', date: '11-09-2026', body: 'not a day',
          },
        ]),
        {
          id: 'z', period: 'day', date: '11-09-2026', body: 'not a week',
        },
      ]),
    ]), TODAY);
    expect(tree.months[SEP].weeks).toHaveLength(1);
    expect(tree.months[SEP].weeks[0].days).toHaveLength(1);
  });

  it('returns null for a missing goal, so the page can say so', () => {
    expect(buildYearGoal(null, TODAY)).toBeNull();
    expect(buildYearGoal({}, TODAY)).toBeNull();
  });
});

/**
 * A row draws a title, a date and a checkbox. The day-goal EDITOR needs the whole
 * record — contribution, tags, subtasks, the milestone link — plus the `period` +
 * `date` of the Goal document that owns it, which is the address its mutations
 * are sent to. One pure resolution of row → record, so the page's two edit paths
 * cannot disagree about which goal (or which address) a row means.
 */
describe('the complete record behind a row', () => {
  const fullDay = {
    id: 'd1',
    body: 'Write release notes',
    period: 'day',
    date: '07-09-2026',
    isComplete: false,
    status: 'todo',
    contribution: '## Why\nIt ships the week.',
    tags: ['work', 'work/release'],
    subTasks: [{ id: 's1', body: 'Draft', isComplete: true }],
    deadline: '08-09-2026',
    reward: 'coffee',
    taskRef: 'r1',
    goalRef: 'w1',
    isMilestone: true,
  };
  const tree = () => buildYearGoal(yearGoal([
    monthGoal('mSep', '30-09-2026', [weekGoal('w1', '11-09-2026', [fullDay])]),
  ]), TODAY);

  it('hands back everything the row dropped', () => {
    const t = tree();
    const row = t.months[SEP].weeks[0].days[0];
    // What the ROW carries — proof the row alone cannot feed the editor.
    expect(row.contribution).toBeUndefined();
    expect(row.subTasks).toBeUndefined();

    const item = itemForRow(t, row);
    expect(item.id).toBe('d1');
    expect(item.contribution).toBe('## Why\nIt ships the week.');
    expect(item.tags).toEqual(['work', 'work/release']);
    expect(item.subTasks).toEqual([{ id: 's1', body: 'Draft', isComplete: true }]);
    expect(item.deadline).toBe('08-09-2026');
    expect(item.reward).toBe('coffee');
    expect(item.goalRef).toBe('w1');
  });

  it('stamps the owning Goal document’s period and date — the mutation address', () => {
    const t = tree();
    const item = itemForRow(t, t.months[SEP].weeks[0].days[0]);
    expect(item.period).toBe('day');
    expect(item.date).toBe('07-09-2026');
  });

  it('resolves a week and a month row from the same index', () => {
    const t = tree();
    expect(itemForRow(t, t.months[SEP].weeks[0]).id).toBe('w1');
    expect(itemForRow(t, t.months[SEP].weeks[0]).period).toBe('week');
    expect(itemForRow(t, t.months[SEP].goal).id).toBe('mSep');
    expect(itemForRow(t, t.months[SEP].goal).period).toBe('month');
  });

  it('copies rather than handing out Apollo’s own record', () => {
    const payload = yearGoal([
      monthGoal('mSep', '30-09-2026', [weekGoal('w1', '11-09-2026', [fullDay])]),
    ]);
    const item = itemForRow(buildYearGoal(payload, TODAY), { id: 'd1', period: 'day' });
    expect(item).not.toBe(fullDay);
    expect(item.tags).toEqual(fullDay.tags);
  });

  it('resolves nothing for a row it cannot place, instead of guessing', () => {
    const t = tree();
    expect(itemForRow(t, { id: 'ghost', period: 'day' })).toBeNull();
    // A year row has no record in the index: this page IS the year goal.
    expect(itemForRow(t, { id: 'y1', period: 'year' })).toBeNull();
    expect(itemForRow(t, { id: 'd1' })).toBeNull();
    expect(itemForRow(t, null)).toBeNull();
    expect(itemForRow(null, { id: 'd1', period: 'day' })).toBeNull();
  });

  it('indexes every level of the tree, and nothing at all for no goal', () => {
    const items = treeItems(yearGoal([
      monthGoal('mSep', '30-09-2026', [weekGoal('w1', '11-09-2026', [fullDay])]),
    ]));
    expect(items.month.map((i) => i.id)).toEqual(['mSep']);
    expect(items.week.map((i) => i.id)).toEqual(['w1']);
    expect(items.day.map((i) => i.id)).toEqual(['d1']);
    expect(treeItems(null)).toEqual({ month: [], week: [], day: [] });
  });
});
