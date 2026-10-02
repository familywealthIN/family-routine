/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const CurrentTaskCard = require('./CurrentTaskCard.vue').default;

// D-14: the August month goal from the beta report. Its single item hangs off
// "Wind-down" — the slot that happened to be selected when it was created.
const monthGoal = () => ({
  id: 'goal-month-aug',
  period: 'month',
  date: '01-08-2026',
  goalItems: [{ id: 'gi-m1', body: 'Ship the beta', taskRef: 'task-wind-down' }],
});

const weekGoal = () => ({
  id: 'goal-week-1',
  period: 'week',
  date: '10-08-2026',
  goalItems: [{ id: 'gi-w1', body: 'Daily sweep', taskRef: 'task-wind-down' }],
});

const dayGoal = (taskRef) => ({
  id: `goal-day-${taskRef}`,
  period: 'day',
  date: '16-08-2026',
  goalItems: [{ id: `gi-d-${taskRef}`, body: 'Morning checkpoint', taskRef }],
});

const windDown = { id: 'task-wind-down', name: 'Wind-down' };
const meditation = { id: 'task-meditation', name: 'Meditation' };

const ctx = (props) => ({ goals: [], task: null, goalPeriod: 'day', ...props });

const hasMonthGoal = (props) => {
  const c = ctx(props);
  c.monthGoals = CurrentTaskCard.computed.monthGoals.call(c);
  return CurrentTaskCard.computed.hasMonthGoal.call(c);
};
const hasWeekGoal = (props) => {
  const c = ctx(props);
  c.weekGoals = CurrentTaskCard.computed.weekGoals.call(c);
  return CurrentTaskCard.computed.hasWeekGoal.call(c);
};
const periodGoals = (props) => CurrentTaskCard.computed.filteredPeriodGoals.call(ctx(props));

describe('OrganismCurrentTaskCard goal period scope', () => {
  const goals = [monthGoal(), weekGoal(), dayGoal('task-meditation')];

  it('keeps the month chip green whichever routine item is current', () => {
    expect(hasMonthGoal({ goals, task: windDown })).toBe(true);
    expect(hasMonthGoal({ goals, task: meditation })).toBe(true);
  });

  it('keeps the week chip green whichever routine item is current', () => {
    expect(hasWeekGoal({ goals, task: windDown })).toBe(true);
    expect(hasWeekGoal({ goals, task: meditation })).toBe(true);
  });

  it('shows the chips before the day has a current item at all', () => {
    expect(hasMonthGoal({ goals, task: null })).toBe(true);
    expect(hasWeekGoal({ goals, task: null })).toBe(true);
  });

  it('lists the month goal on the MONTH tab from any routine slot', () => {
    const fromWindDown = periodGoals({ goals, task: windDown, goalPeriod: 'month' });
    const fromMeditation = periodGoals({ goals, task: meditation, goalPeriod: 'month' });
    expect(fromMeditation.map((g) => g.id)).toEqual(['goal-month-aug']);
    expect(fromMeditation).toEqual(fromWindDown);
  });

  it('hands the month goal through whole, so its items are not re-projected', () => {
    const [goal] = periodGoals({ goals, task: meditation, goalPeriod: 'month' });
    expect(goal).toBe(goals[0]);
  });

  it('still scopes the day tab to the current routine item', () => {
    expect(periodGoals({ goals, task: meditation, goalPeriod: 'day' })
      .map((g) => g.id)).toEqual(['goal-day-task-meditation']);
    expect(periodGoals({ goals, task: windDown, goalPeriod: 'day' })).toEqual([]);
  });

  it('reports no month goal when the month genuinely holds none', () => {
    expect(hasMonthGoal({ goals: [weekGoal()], task: windDown })).toBe(false);
    expect(periodGoals({ goals: [weekGoal()], task: windDown, goalPeriod: 'month' }))
      .toEqual([]);
  });

  it('ignores a period goal that carries no items', () => {
    const empty = { id: 'goal-month-empty', period: 'month', goalItems: [] };
    expect(hasMonthGoal({ goals: [empty], task: windDown })).toBe(false);
  });
});
