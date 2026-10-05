/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const UpcomingPastTasks = require('./UpcomingPastTasks.vue').default;

// D-14: the same August month goal, hanging off "Wind-down". Expanding any
// other routine row used to report it missing.
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

const goals = [monthGoal(), weekGoal(), dayGoal('task-breakfast')];

const ctx = (goalPeriod = 'day') => ({ goals, goalPeriod });

const hasMonthGoal = () => UpcomingPastTasks.computed.hasMonthGoal.call(ctx());
const hasWeekGoal = () => UpcomingPastTasks.computed.hasWeekGoal.call(ctx());
const periodGoalsFor = (taskId, goalPeriod) => UpcomingPastTasks.methods
  .filteredPeriodGoalsFor.call(ctx(goalPeriod), taskId);

describe('OrganismUpcomingPastTasks goal period scope', () => {
  it('reports the month and week goals regardless of which row is expanded', () => {
    expect(hasMonthGoal()).toBe(true);
    expect(hasWeekGoal()).toBe(true);
  });

  it('lists the month goal under a row that does not own it', () => {
    expect(periodGoalsFor('task-breakfast', 'month').map((g) => g.id))
      .toEqual(['goal-month-aug']);
    expect(periodGoalsFor('task-breakfast', 'month'))
      .toEqual(periodGoalsFor('task-wind-down', 'month'));
  });

  it('hands the month goal through whole, so its items are not re-projected', () => {
    expect(periodGoalsFor('task-breakfast', 'month')[0]).toBe(goals[0]);
  });

  it('still scopes the day tab to the expanded routine item', () => {
    expect(periodGoalsFor('task-breakfast', 'day').map((g) => g.id))
      .toEqual(['goal-day-task-breakfast']);
    expect(periodGoalsFor('task-wind-down', 'day')).toEqual([]);
  });
});
