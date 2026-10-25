const { collectPeriodCriteria, buildMilestoneDays, evaluateAutoComplete } = require('./goalCompletionCriteria');

// The reported case: a week goal with seven day milestones, one mid-week day
// never completed. The five-day streak threshold used to close it anyway.
const weekDays = ['06-09-2026', '07-09-2026', '08-09-2026', '09-09-2026', '10-09-2026', '11-09-2026', '12-09-2026'];

const dayGoals = (completeDates, milestoneDates = weekDays) => milestoneDates.map((date) => ({
  date,
  goalItems: [{ goalRef: 'W1', isComplete: completeDates.includes(date) }],
}));

describe('collectPeriodCriteria', () => {
  it('picks up only the children that hang off the goal item', () => {
    const criteria = collectPeriodCriteria([
      { date: '06-09-2026', goalItems: [{ goalRef: 'W1', isComplete: true }, { goalRef: 'W2', isComplete: true }] },
      { date: '07-09-2026', goalItems: [{ goalRef: 'W2', isComplete: false }] },
    ], 'W1');

    expect(criteria).toEqual([{ date: '06-09-2026', isComplete: true, late: false }]);
  });

  it('matches ObjectId-ish ids by string and tolerates empty docs', () => {
    const criteria = collectPeriodCriteria([
      { date: '06-09-2026', goalItems: [{ goalRef: { toString: () => 'W1' } }] },
      { date: '07-09-2026' },
    ], 'W1');

    expect(criteria).toEqual([{ date: '06-09-2026', isComplete: false, late: false }]);
  });
});

// D-11: the streak filled left-to-right by completion count, so the beta week
// (completed 16, 17, 18; MISSED 19; completed 20, 21) rendered as five solid
// nodes in a row — an unbroken run in a control called "Streak".
// D-02, owner's rule: a milestone is met only when it was checked on time.
// goalItemStatus grades a tick after the routine window (or on a later day)
// as 'missed'; that tick is recorded as late and never counts.
// Owner's rule, 11 Oct 2026: a late tick COUNTS. It replaced the on-time-only
// rule (D-02), under which /goals read 4/5 for a night routine ticked every day
// of the week, three of them after 22:30's window.
describe('a late tick counts', () => {
  const lateOn = (date) => weekDays.map((d) => ({
    date: d,
    goalItems: [{ goalRef: 'W1', isComplete: true, status: d === date ? 'missed' : 'done' }],
  }));

  it('counts a late tick as met, and still reports it as late', () => {
    const criteria = collectPeriodCriteria(lateOn('07-09-2026'), 'W1');
    expect(criteria.find((c) => c.date === '07-09-2026')).toEqual({ date: '07-09-2026', isComplete: true, late: true });
    expect(criteria.filter((c) => c.isComplete)).toHaveLength(7);
  });

  it('marks a late-ticked day complete', () => {
    const days = buildMilestoneDays(weekDays, collectPeriodCriteria(lateOn('12-09-2026'), 'W1'), '12-09-2026');
    expect(days[6]).toEqual({ date: '12-09-2026', status: 'complete' });
  });

  it('auto-completes a goal whose last criterion was ticked late', () => {
    const criteria = collectPeriodCriteria(lateOn('09-09-2026'), 'W1');
    const result = evaluateAutoComplete({
      criteria, completionThreshold: 5, stepDownPeriod: 'day', date: '12-09-2026',
    });
    expect(result.isComplete).toBe(true);
  });

  it('keeps today winnable while a goal on it is still open', () => {
    const goals = lateOn('12-09-2026');
    goals[6].goalItems.push({ goalRef: 'W1', isComplete: false, status: 'todo' });
    const days = buildMilestoneDays(weekDays, collectPeriodCriteria(goals, 'W1'), '12-09-2026');
    expect(days[6]).toEqual({ date: '12-09-2026', status: 'upcoming' });
  });
});

describe('buildMilestoneDays', () => {
  const betaWeek = ['16-08-2026', '17-08-2026', '18-08-2026', '19-08-2026', '20-08-2026', '21-08-2026', '22-08-2026'];
  const betaCriteria = collectPeriodCriteria(
    dayGoals(['16-08-2026', '17-08-2026', '18-08-2026', '20-08-2026', '21-08-2026'], betaWeek),
    'W1',
  );

  it('emits one entry per calendar day, in calendar order', () => {
    const days = buildMilestoneDays(betaWeek, betaCriteria, '21-08-2026');

    expect(days.map((day) => day.date)).toEqual(betaWeek);
  });

  it('breaks on the missed day instead of packing the wins to the left', () => {
    const days = buildMilestoneDays(betaWeek, betaCriteria, '21-08-2026');

    expect(days.map((day) => day.status)).toEqual([
      'complete', 'complete', 'complete', 'missed', 'complete', 'complete', 'upcoming',
    ]);
  });

  it('treats the day being read and anything after it as still winnable', () => {
    const days = buildMilestoneDays(betaWeek, betaCriteria, '19-08-2026');

    expect(days[3].status).toBe('upcoming');
    expect(days[6].status).toBe('upcoming');
  });

  it('keeps a day the user declared no milestone on, so later days do not shift', () => {
    const declared = ['16-08-2026', '18-08-2026'];
    const criteria = collectPeriodCriteria(dayGoals(['16-08-2026'], declared), 'W1');
    const days = buildMilestoneDays(betaWeek, criteria, '22-08-2026');

    expect(days.map((day) => day.status)).toEqual([
      'complete', 'none', 'missed', 'none', 'none', 'none', 'none',
    ]);
  });

  it('only calls a day complete when every milestone on it is met', () => {
    const criteria = [
      { date: '16-08-2026', isComplete: true },
      { date: '16-08-2026', isComplete: false },
    ];

    expect(buildMilestoneDays(['16-08-2026'], criteria, '22-08-2026')[0].status).not.toBe('complete');
  });

  // D-02: the cascade grid drew this day as a red cancel while
  // `milestonesComplete` had already counted the milestone that landed on it.
  it('calls a past day with some milestones met partial, not missed', () => {
    const criteria = [
      { date: '16-08-2026', isComplete: true },
      { date: '16-08-2026', isComplete: false },
      { date: '17-08-2026', isComplete: false },
      { date: '17-08-2026', isComplete: false },
    ];
    const days = buildMilestoneDays(['16-08-2026', '17-08-2026'], criteria, '22-08-2026');

    expect(days.map((day) => day.status)).toEqual(['partial', 'missed']);
  });

  it('does not call a day partial while it is still winnable', () => {
    const criteria = [
      { date: '22-08-2026', isComplete: true },
      { date: '22-08-2026', isComplete: false },
    ];

    expect(buildMilestoneDays(['22-08-2026'], criteria, '22-08-2026')[0].status).toBe('upcoming');
  });
});

describe('evaluateAutoComplete', () => {
  const base = { completionThreshold: 5, stepDownPeriod: 'day', date: '11-09-2026' };

  // Owner's rule, 25 Oct 2026: the threshold ticks the goal. Milestones planned
  // beyond it do not hold it open (D-03 had required every one).
  it('completes at the threshold with a declared milestone still open', () => {
    const criteria = collectPeriodCriteria(dayGoals(weekDays.filter((d) => d !== '09-09-2026')), 'W1');
    const result = evaluateAutoComplete({ ...base, criteria, progress: 6 });

    expect(result.isComplete).toBe(true);
    expect(result.outstanding).toEqual([{ date: '09-09-2026', isComplete: false, late: false }]);
    expect(result.note).toContain('6 of 7 day milestones met');
  });

  it('stays open one milestone short of the threshold', () => {
    const met = weekDays.slice(0, 4);
    const criteria = collectPeriodCriteria(dayGoals(met), 'W1'); // 4 of 7 met

    expect(evaluateAutoComplete({ ...base, criteria, progress: 4 }).isComplete).toBe(false);
  });

  it('completes once every declared milestone is met', () => {
    const criteria = collectPeriodCriteria(dayGoals(weekDays), 'W1');
    const result = evaluateAutoComplete({ ...base, criteria, progress: 7 });

    expect(result.isComplete).toBe(true);
    expect(result.met).toHaveLength(7);
  });

  it('keeps the streak threshold as a floor', () => {
    // Three milestones, all met, but three day-wins is not a week.
    const declared = weekDays.slice(0, 3);
    const criteria = collectPeriodCriteria(dayGoals(declared, declared), 'W1');

    expect(evaluateAutoComplete({ ...base, criteria, progress: 3 }).isComplete).toBe(false);
  });

  it('states which criteria the auto-complete was awarded on', () => {
    const criteria = collectPeriodCriteria(dayGoals(weekDays), 'W1');
    const { note } = evaluateAutoComplete({ ...base, criteria, progress: 7 });

    expect(note).toContain('Auto-completed on 11-09-2026');
    expect(note).toContain('7 of 7 day milestones met');
    weekDays.forEach((date) => expect(note).toContain(date));
  });
});
