/* eslint-env jest */
/**
 * The Related Goals timeline groups a day's goals under one date instead of
 * repeating the date on every row.
 */
const Timeline = require('./RelatedTasksTimeline.vue').default;

const groups = (tasks) => Timeline.computed.dayGroups.call({ tasks });

describe('MoleculeRelatedTasksTimeline day groups', () => {
  const tasks = [
    { id: 'a', body: 'Evening review', date: '14-10-2026', time: '20:00', isComplete: true },
    { id: 'b', body: 'Morning run', date: '14-10-2026', time: '06:30', isComplete: false },
    { id: 'c', body: 'No routine', date: '14-10-2026', isComplete: true },
    { id: 'd', body: 'Yesterday', date: '13-10-2026', time: '09:00', isComplete: true },
  ];

  it('makes one group per date, newest day first as given', () => {
    const result = groups(tasks);
    expect(result.map((g) => g.date)).toEqual(['14-10-2026', '13-10-2026']);
    expect(result[0].tasks).toHaveLength(3);
    expect(result[1].tasks.map((t) => t.id)).toEqual(['d']);
  });

  it('orders a day by routine time, untimed goals last', () => {
    expect(groups(tasks)[0].tasks.map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('marks a day complete only when every goal in it is done', () => {
    const [today, yesterday] = groups(tasks);
    expect(today.allComplete).toBe(false);
    expect(yesterday.allComplete).toBe(true);
  });

  it('keeps undated goals together in their own group', () => {
    const result = groups([{ id: 'x', body: 'x' }, { id: 'y', body: 'y' }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ key: 'undated', date: '' });
    expect(result[0].tasks.map((t) => t.id)).toEqual(['x', 'y']);
  });

  it('copes with no tasks', () => {
    expect(groups(undefined)).toEqual([]);
  });
});
