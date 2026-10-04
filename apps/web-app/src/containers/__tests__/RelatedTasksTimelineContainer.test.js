/* eslint-env jest */
/**
 * Contract test for RelatedTasksTimelineContainer.relatedTasks.
 *
 * Regression: the goal-action modal listed every day a goalRef was planned
 * for, so on a later day the timeline showed day one's milestone instead of
 * the day being viewed ("Related Goals" vs the modal body disagreeing).
 */

// Keep the require light: the molecule is presentational and plays no part in
// the derivation under test.
jest.mock(
  '@routine-notes/ui/molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue',
  () => ({ __esModule: true, default: { name: 'RelatedTasksTimeline', render() {} } }),
);

const Container = require('../RelatedTasksTimelineContainer.vue').default;

const relatedGoalsData = () => [
  {
    id: 'goal-16',
    date: '16-08-2026',
    period: 'day',
    goalItems: [{
      id: 'item-16', body: 'Weekly Grounding and Focus Setup', goalRef: 'week-1', taskRef: 't1',
    }],
  },
  {
    id: 'goal-22',
    date: '22-08-2026',
    period: 'day',
    goalItems: [{
      id: 'item-22', body: 'Active Recovery and Holistic Reflection', goalRef: 'week-1', taskRef: 't1',
    }],
  },
];

const makeCtx = (over = {}) => ({
  goalRef: 'week-1',
  date: '22-08-2026',
  tasklist: [{ id: 't1', time: '06:40' }],
  relatedGoalsData: relatedGoalsData(),
  ...over,
});

describe('RelatedTasksTimelineContainer.relatedTasks', () => {
  it('lists only the viewed day, not the earlier days under the same goalRef', () => {
    const tasks = Container.computed.relatedTasks.call(makeCtx());

    expect(tasks.map((task) => task.id)).toEqual(['item-22']);
    expect(tasks[0].date).toBe('22-08-2026');
  });

  it('follows the viewed day when the dashboard moves to another date', () => {
    const tasks = Container.computed.relatedTasks.call(makeCtx({ date: '16-08-2026' }));

    expect(tasks.map((task) => task.id)).toEqual(['item-16']);
  });

  it('reads through to the network so days added later are not hidden by the cached list', () => {
    expect(Container.apollo.relatedGoalsData.fetchPolicy).toBe('cache-and-network');
  });
});
