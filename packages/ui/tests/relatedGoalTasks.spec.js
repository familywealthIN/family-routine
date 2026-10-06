/* eslint-env jest */
/**
 * "Related Goals (1)": a week of entries logged under one parent goal showed as
 * a single timeline row.
 *
 * The server was the root cause — `goalsByGoalRef` served every goal item with
 * id:null (see apps/server goalsByGoalRef.test.js) — but the derivation turned
 * that into DATA LOSS rather than a cosmetic glitch, because it deduped rows by
 * id and a null id was treated as proof of a duplicate. The dedupe now keys on
 * identity only, so a client holding an older cached response still renders
 * every entry.
 */
const { relatedGoalTasks, MAX_RELATED_TASKS } = require('../utils/relatedGoalTasks');

const WEEK_REF = 'week-goal-1';

const item = (id, body, overrides = {}) => ({
  id, body, goalRef: WEEK_REF, isComplete: false, ...overrides,
});

const dayGoal = (date, goalItems) => ({ date, period: 'day', goalItems });

// The reported week: four entries under the week's financial-security goal.
const WEEK = [
  dayGoal('28-09-2026', [item('g1', 'Trim a liability')]),
  dayGoal('30-09-2026', [item('g2', 'Add a training sale'), item('g3', 'Save more')]),
  dayGoal('02-10-2026', [item('g4', 'Plan for Citi payment')]),
];

const TODAY = '03-10-2026';

describe('relatedGoalTasks', () => {
  it('returns every entry logged against the ref', () => {
    const tasks = relatedGoalTasks(WEEK, { goalRef: WEEK_REF, date: TODAY });

    expect(tasks).toHaveLength(4);
    expect(tasks.map((t) => t.body)).toEqual([
      'Plan for Citi payment',
      'Add a training sale',
      'Save more',
      'Trim a liability',
    ]);
  });

  // The regression itself: ids the server failed to send must not be read as
  // "this row is a repeat of the last one".
  it('keeps entries whose id the server did not send', () => {
    const idless = [
      dayGoal('28-09-2026', [item(null, 'Trim a liability')]),
      dayGoal('30-09-2026', [item(null, 'Add a training sale'), item(null, 'Save more')]),
      dayGoal('02-10-2026', [item(null, 'Plan for Citi payment')]),
    ];

    expect(relatedGoalTasks(idless, { goalRef: WEEK_REF, date: TODAY })).toHaveLength(4);
  });

  it('still collapses an entry that genuinely repeats', () => {
    const repeated = [
      dayGoal('30-09-2026', [item('g2', 'Add a training sale')]),
      dayGoal('30-09-2026', [item('g2', 'Add a training sale')]),
    ];

    expect(relatedGoalTasks(repeated, { goalRef: WEEK_REF, date: TODAY })).toHaveLength(1);
  });

  it('shows newest first', () => {
    const tasks = relatedGoalTasks(WEEK, { goalRef: WEEK_REF, date: TODAY });

    expect(tasks.map((t) => t.date)).toEqual([
      '02-10-2026', '30-09-2026', '30-09-2026', '28-09-2026',
    ]);
  });

  it('ignores entries belonging to another parent goal', () => {
    const mixed = [
      dayGoal('02-10-2026', [
        item('g4', 'Plan for Citi payment'),
        item('g5', 'Unrelated errand', { goalRef: 'other-ref' }),
      ]),
    ];

    const tasks = relatedGoalTasks(mixed, { goalRef: WEEK_REF, date: TODAY });

    expect(tasks.map((t) => t.body)).toEqual(['Plan for Citi payment']);
  });

  it('hides entries dated after the day being viewed', () => {
    const withFuture = [...WEEK, dayGoal('10-10-2026', [item('g9', 'Next week')])];

    const tasks = relatedGoalTasks(withFuture, { goalRef: WEEK_REF, date: TODAY });

    expect(tasks.map((t) => t.body)).not.toContain('Next week');
    expect(tasks).toHaveLength(4);
  });

  it('keeps today, which is not the future', () => {
    const today = [dayGoal(TODAY, [item('g0', 'Logged this morning')])];

    expect(relatedGoalTasks(today, { goalRef: WEEK_REF, date: TODAY })).toHaveLength(1);
  });

  // The AI task form has no viewed date; it shows the whole history instead.
  it('shows every date when no date is given', () => {
    const withFuture = [...WEEK, dayGoal('10-10-2026', [item('g9', 'Next week')])];

    expect(relatedGoalTasks(withFuture, { goalRef: WEEK_REF })).toHaveLength(5);
  });

  it('labels a row with the time of the routine its task ref points at', () => {
    const goals = [dayGoal('02-10-2026', [
      item('g4', 'Plan for Citi payment', { taskRef: 'wake-up' }),
    ])];
    const tasklist = [{ id: 'wake-up', name: 'Wake Up Brush Invest', time: '05:30' }];

    const [task] = relatedGoalTasks(goals, { goalRef: WEEK_REF, date: TODAY, tasklist });

    expect(task.time).toBe('05:30');
  });

  it('matches a routine on taskId as well as id', () => {
    const goals = [dayGoal('02-10-2026', [item('g4', 'Plan', { taskRef: 'wake-up' })])];
    const tasklist = [{ taskId: 'wake-up', time: '05:30' }];

    expect(relatedGoalTasks(goals, { goalRef: WEEK_REF, date: TODAY, tasklist })[0].time)
      .toBe('05:30');
  });

  it('leaves the time empty when no routine matches', () => {
    const [task] = relatedGoalTasks(WEEK, { goalRef: WEEK_REF, date: TODAY, tasklist: [] });

    expect(task.time).toBeNull();
  });

  it('caps a long history', () => {
    const many = [dayGoal('02-10-2026', Array.from(
      { length: MAX_RELATED_TASKS + 5 },
      (unused, i) => item(`g${i}`, `Entry ${i}`),
    ))];

    expect(relatedGoalTasks(many, { goalRef: WEEK_REF, date: TODAY }))
      .toHaveLength(MAX_RELATED_TASKS);
  });

  it('has nothing to show without a ref or without goals', () => {
    expect(relatedGoalTasks(WEEK, { goalRef: '', date: TODAY })).toEqual([]);
    expect(relatedGoalTasks(null, { goalRef: WEEK_REF, date: TODAY })).toEqual([]);
    expect(relatedGoalTasks(undefined, { goalRef: WEEK_REF })).toEqual([]);
    expect(relatedGoalTasks([], { goalRef: WEEK_REF })).toEqual([]);
  });

  it('survives a goal with no items and a hole in the list', () => {
    const ragged = [
      null,
      { date: '29-09-2026', period: 'day' },
      dayGoal('02-10-2026', [null, item('g4', 'Plan for Citi payment')]),
    ];

    expect(relatedGoalTasks(ragged, { goalRef: WEEK_REF, date: TODAY })
      .map((t) => t.body)).toEqual(['Plan for Citi payment']);
  });

  it('carries the fields the timeline renders', () => {
    const goals = [dayGoal('02-10-2026', [
      item('g4', 'Plan for Citi payment', { isComplete: true, taskRef: 'wake-up', tags: ['area:cfo'] }),
    ])];

    const [task] = relatedGoalTasks(goals, { goalRef: WEEK_REF, date: TODAY });

    expect(task).toEqual({
      id: 'g4',
      body: 'Plan for Citi payment',
      date: '02-10-2026',
      period: 'day',
      time: null,
      isComplete: true,
      goalRef: WEEK_REF,
      taskRef: 'wake-up',
      tags: ['area:cfo'],
    });
  });
});
