/* eslint-env jest */
/**
 * D-03: the Week Goal Streak card came and went with the time of day.
 *
 * Its visibility was scoped to whichever routine item was current — the card
 * needed `countTaskTotal(currentTask)` plus week goal items whose `taskRef`
 * matched that item — so at 05:45, current item "Wake Up" (no goal item), the
 * whole card was absent, and at 09:10, current item "Start Work", the same data
 * rendered in full. The streak is a property of the WEEK, so the computed that
 * feeds the card must not read `currentTask` at all.
 *
 * Hooks and computeds are exercised against a minimal vm-like context (no
 * mount), matching the loadErrorState convention.
 */
// DashBoard pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the streak.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const DashBoard = require('../DashBoard.vue').default;

const makeWeekGoal = () => ({
  id: 'goal-week-1',
  period: 'week',
  date: '20-09-2026',
  goalItems: [
    {
      id: 'gi-w1',
      body: 'Beta Validation Daily Sweep',
      // Attached to "Start Work", the 09:10 item — never to "Wake Up".
      taskRef: 'task-start-work',
      milestoneDays: [
        { date: '20-09-2026', status: 'complete' },
        { date: '21-09-2026', status: 'upcoming' },
      ],
    },
  ],
});

const makeDayGoal = () => ({
  id: 'goal-day-1',
  period: 'day',
  date: '20-09-2026',
  goalItems: [{ id: 'gi-d1', body: 'Morning checkpoint', taskRef: 'task-wake-up' }],
});

const streakGoals = (ctx) => DashBoard.computed.weekGoalsForStreak.call(ctx);

describe('DashBoard week goal streak visibility', () => {
  it('shows the week goal while the current item carries no goal item', () => {
    const goals = streakGoals({
      displayGoals: [makeDayGoal(), makeWeekGoal()],
      currentTask: { id: 'task-wake-up', stimuli: [] },
    });
    expect(goals.map((goal) => goal.id)).toEqual(['goal-week-1']);
  });

  it('shows the same week goal whichever routine item is current', () => {
    const displayGoals = [makeDayGoal(), makeWeekGoal()];
    const atWakeUp = streakGoals({ displayGoals, currentTask: { id: 'task-wake-up' } });
    const atStartWork = streakGoals({ displayGoals, currentTask: { id: 'task-start-work' } });
    expect(atWakeUp).toEqual(atStartWork);
    expect(atWakeUp).toHaveLength(1);
  });

  it('shows it before the day has a current item at all', () => {
    const goals = streakGoals({ displayGoals: [makeWeekGoal()], currentTask: undefined });
    expect(goals).toHaveLength(1);
  });

  it('passes the milestone days through untouched so the calendar nodes still render', () => {
    const goals = streakGoals({ displayGoals: [makeWeekGoal()], currentTask: undefined });
    expect(goals[0].goalItems[0].milestoneDays).toEqual([
      { date: '20-09-2026', status: 'complete' },
      { date: '21-09-2026', status: 'upcoming' },
    ]);
  });

  it('ignores goals of any other period', () => {
    expect(streakGoals({ displayGoals: [makeDayGoal()], currentTask: undefined })).toEqual([]);
  });

  it('keeps the card hidden for a week goal that has no items', () => {
    const empty = { ...makeWeekGoal(), goalItems: [] };
    expect(streakGoals({ displayGoals: [empty], currentTask: undefined })).toEqual([]);
  });

  it('survives goals that have not loaded yet', () => {
    expect(streakGoals({ displayGoals: null, currentTask: undefined })).toEqual([]);
  });
});

describe('DashBoard daily-goals load error', () => {
  it('flags the failure so the card shows an error instead of vanishing', () => {
    const vm = { weekGoalsLoadError: false };
    DashBoard.apollo.goals.error.call(vm, new Error('Failed to fetch'));
    expect(vm.weekGoalsLoadError).toBe(true);
  });

  it('clears the failure once goals arrive', () => {
    const vm = { weekGoalsLoadError: true, goalsFirstLoad: true };
    DashBoard.apollo.goals.update.call(vm, { optimizedDailyGoals: [] });
    expect(vm.weekGoalsLoadError).toBe(false);
    expect(vm.goalsFirstLoad).toBe(false);
  });
});
