/* eslint-env jest */
/**
 * The Priority board model — the rules the page, the container and the organism
 * all read (utils/priorityBoard).
 */
const moment = require('moment');

const { QUADRANTS } = require('@routine-notes/ui/constants/priority');
const {
  quadrantFromTags,
  tagsWithQuadrant,
  delegateAgentState,
  dayGoalItems,
  routineOrder,
  buildPriorityBoard,
  NO_ROUTINE_KEY,
} = require('../priorityBoard');

const TASKLIST = [
  { id: 'sw', name: 'Start Work', time: '09:00' },
  { id: 'mp', name: 'Morning Pages', time: '06:30' },
  { id: 'dw', name: 'Deep Work', time: '15:00' },
];

const item = (over) => ({
  id: 'i1', body: 'A task', isComplete: false, tags: ['priority:do'], subTasks: [], ...over,
});

const goalsWith = (items, extra = []) => [
  {
    id: 'g-day', date: '12-09-2026', period: 'day', goalItems: items,
  },
  ...extra,
];

describe('quadrantFromTags', () => {
  it('reads the one priority tag', () => {
    expect(quadrantFromTags(['area:work', 'priority:delegate'])).toBe('delegate');
  });

  it('is null when the item has never been sorted', () => {
    expect(quadrantFromTags(['area:work'])).toBeNull();
    expect(quadrantFromTags([])).toBeNull();
    expect(quadrantFromTags(null)).toBeNull();
  });

  // A tag the buckets do not know is not a quadrant — it must land in triage
  // rather than vanishing from all four lists.
  it('rejects an unknown bucket', () => {
    expect(quadrantFromTags(['priority:someday'])).toBeNull();
  });
});

describe('tagsWithQuadrant', () => {
  it('replaces any existing priority tag and keeps the rest', () => {
    expect(tagsWithQuadrant(['priority:do', 'area:work'], 'plan'))
      .toEqual(['area:work', 'priority:plan']);
  });

  it('adds one to an untagged item', () => {
    expect(tagsWithQuadrant([], 'automate')).toEqual(['priority:automate']);
  });
});

describe('delegateAgentState', () => {
  it('draws no chip without a routine task to hand over to', () => {
    expect(delegateAgentState(item({ taskRef: '' }), {})).toBe('');
  });

  it('is ready when the task has no badge', () => {
    expect(delegateAgentState(item({ taskRef: 'sw' }), {})).toBe('ready');
  });

  it('is running while the badge says running or listening', () => {
    expect(delegateAgentState(item({ taskRef: 'sw' }), { sw: 'running' })).toBe('running');
    expect(delegateAgentState(item({ taskRef: 'sw' }), { sw: 'listening' })).toBe('running');
  });

  it('is done on a finished badge', () => {
    expect(delegateAgentState(item({ taskRef: 'sw' }), { sw: 'finished' })).toBe('done');
  });

  // The reward-authoritative override: a late START dispatch resolving after the
  // end event must not drag a finished run back to "running".
  it('lets a saved transcript beat a stale listening badge', () => {
    expect(delegateAgentState(item({ taskRef: 'sw', reward: '<p>done</p>' }), { sw: 'listening' }))
      .toBe('done');
  });

  it('falls back to ready after a failure so it can be retried', () => {
    expect(delegateAgentState(item({ taskRef: 'sw' }), { sw: 'failed' })).toBe('ready');
  });
});

describe('dayGoalItems', () => {
  it('takes only the day period and stamps the owning document', () => {
    const items = dayGoalItems([
      {
        id: 'g1', date: '12-09-2026', period: 'day', goalItems: [item({ id: 'a' })],
      },
      {
        id: 'g2', date: '13-09-2026', period: 'week', goalItems: [item({ id: 'b' })],
      },
    ]);
    expect(items.map((i) => i.id)).toEqual(['a']);
    expect(items[0]).toMatchObject({ date: '12-09-2026', period: 'day' });
  });

  // Principle #6: a repeated id gives duplicate :keys and Vue patches the wrong row.
  it('de-dupes by id', () => {
    const items = dayGoalItems(goalsWith([item({ id: 'a' }), item({ id: 'a' }), item({ id: null })]));
    expect(items).toHaveLength(1);
  });
});

describe('routineOrder', () => {
  it('sorts by time and appends the No routine bucket last', () => {
    expect(routineOrder(TASKLIST).map((r) => r.id)).toEqual(['mp', 'sw', 'dw', NO_ROUTINE_KEY]);
  });

  it('keeps the bucket even with no routines at all', () => {
    expect(routineOrder([]).map((r) => r.id)).toEqual([NO_ROUTINE_KEY]);
  });
});

describe('buildPriorityBoard', () => {
  const build = (items, over = {}) => buildPriorityBoard({
    goals: goalsWith(items),
    tasklist: TASKLIST,
    quadrants: QUADRANTS,
    now: moment('09:30', 'HH:mm'),
    rule: 'every day',
    ...over,
  });

  it('buckets by tag and counts open / done / ring', () => {
    const board = build([
      item({ id: 'a', tags: ['priority:do'] }),
      item({ id: 'b', tags: ['priority:do'], isComplete: true }),
      item({ id: 'c', tags: ['priority:plan'] }),
    ]);
    const byKey = board.quadrants.reduce((acc, q) => Object.assign(acc, { [q.key]: q }), {});
    expect(byKey.do).toMatchObject({
      total: 2, done: 1, open: 1, pct: 50,
    });
    expect(byKey.plan).toMatchObject({
      total: 1, done: 0, open: 1, pct: 0,
    });
    expect(byKey.automate).toMatchObject({ total: 0, open: 0, pct: 0 });
    expect(board.openTotal).toBe(2);
  });

  it('puts untagged items in the triage queue, not in a quadrant', () => {
    const board = build([item({ id: 'x', tags: [] }), item({ id: 'a' })]);
    expect(board.triage.map((r) => r.id)).toEqual(['x']);
    expect(board.quadrants.reduce((n, q) => n + q.total, 0)).toBe(1);
  });

  // "Skip" defers to the BACK of the queue and assigns no quadrant.
  it('moves a skipped item to the back of the triage queue', () => {
    const items = [
      item({ id: 'x1', tags: [] }),
      item({ id: 'x2', tags: [] }),
      item({ id: 'x3', tags: [] }),
    ];
    expect(build(items).triage.map((r) => r.id)).toEqual(['x1', 'x2', 'x3']);
    const skipped = build(items, { skipped: ['x1'] });
    expect(skipped.triage.map((r) => r.id)).toEqual(['x2', 'x3', 'x1']);
    expect(skipped.triage.every((r) => r.quadrant === null)).toBe(true);
  });

  it('groups by routine in time order with a trailing No routine bucket', () => {
    const board = build([
      item({ id: 'a', taskRef: 'dw' }),
      item({ id: 'b', taskRef: 'mp' }),
      item({ id: 'c', taskRef: '' }),
      item({ id: 'd', taskRef: 'sw' }),
    ]);
    const { groups } = board.quadrants[0];
    expect(groups.map((g) => g.key)).toEqual(['mp', 'sw', 'dw', NO_ROUTINE_KEY]);
    expect(groups[3].name).toBe('No routine');
  });

  it('files a row linked to a routine not on the day under No routine instead of dropping it', () => {
    const board = build([
      item({ id: 'a', taskRef: 'sw' }),
      item({ id: 'orphan', taskRef: 'gone-routine' }),
    ]);
    const { groups } = board.quadrants[0];
    expect(groups.map((g) => g.key)).toEqual(['sw', NO_ROUTINE_KEY]);
    expect(groups[1].rows.map((r) => r.id)).toEqual(['orphan']);
  });

  it('badges only the routine whose window contains now', () => {
    const board = build([
      item({ id: 'a', taskRef: 'mp' }),
      item({ id: 'b', taskRef: 'sw' }),
      item({ id: 'c', taskRef: 'dw' }),
    ]);
    const now = board.quadrants[0].groups.filter((g) => g.isNow);
    expect(now).toHaveLength(1);
    expect(now[0].key).toBe('sw');
    expect(board.nowRoutineId).toBe('sw');
  });

  it('skips empty routines rather than drawing an empty header', () => {
    const board = build([item({ id: 'a', taskRef: 'sw' })]);
    expect(board.quadrants[0].groups.map((g) => g.key)).toEqual(['sw']);
  });

  it('builds the row meta from the linked parent goal and the subtask counter', () => {
    const board = buildPriorityBoard({
      goals: goalsWith(
        [item({
          id: 'a',
          goalRef: 'w1',
          subTasks: [{ id: 's1', isComplete: true }, { id: 's2', isComplete: false }],
        })],
        [{
          id: 'g-week', date: '12-09-2026', period: 'week', goalItems: [{ id: 'w1', body: 'Ship the dashboard' }],
        }],
      ),
      tasklist: TASKLIST,
      quadrants: QUADRANTS,
      now: moment('09:30', 'HH:mm'),
    });
    expect(board.rows[0].meta).toBe('↑ Ship the dashboard · 1/2 subtasks');
  });

  it('stamps the chip inputs through the supplied resolvers', () => {
    const board = build(
      [item({ id: 'a', tags: ['priority:delegate'], taskRef: 'sw' })],
      {
        agentStateFor: () => 'running',
        automatedFor: () => true,
      },
    );
    expect(board.rows[0]).toMatchObject({ agentState: 'running', automated: true, rule: 'every day' });
  });
});
