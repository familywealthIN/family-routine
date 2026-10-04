/* eslint-env jest */
/**
 * RoutineYearGoalLinksContainer — which year goal each routine works towards.
 *
 * What is locked:
 *   1. it reuses `YEAR_GOALS_LIST_QUERY` rather than declaring a second year
 *      read. That query is one of only two goal reads that do NOT call
 *      `autoCheckTaskPeriod` (which mutates while it reads), so opening
 *      /settings cannot auto-complete somebody's goals as a side effect of
 *      drawing a chip,
 *   2. the percentage rounds the RATIO: 5 of 6 months is 83%, not 84%
 *      (chassis.md § "The goal cascade"),
 *   3. a goal with no `taskRef` links to no routine, and a milestone is not a
 *      year goal — both are skipped rather than mapped onto the wrong row.
 */
const Container = require('../RoutineYearGoalLinksContainer.vue').default;
const { YEAR_GOALS_LIST_QUERY } = require('../../composables/graphql/yearGoalQueries');

const { apollo, computed } = Container;

const month = (index, isComplete) => ({
  id: `m${index}`,
  body: `Month ${index}`,
  period: 'month',
  date: `01-${String(index + 1).padStart(2, '0')}-2026`,
  isComplete,
});

const yearGoal = (over = {}) => ({
  id: 'g1',
  body: 'Ship v2 of Routine Notes',
  period: 'year',
  date: '01-01-2026',
  taskRef: 'sw',
  isComplete: false,
  isMilestone: false,
  milestones: [],
  ...over,
});

const links = (goals) => computed.links.call({ yearGoals: goals });

describe('the read', () => {
  it('reuses the side-effect-free year read, cache-and-network', () => {
    expect(Object.keys(apollo)).toEqual(['yearGoals']);
    expect(apollo.yearGoals.query).toBe(YEAR_GOALS_LIST_QUERY);
    expect(apollo.yearGoals.fetchPolicy).toBe('cache-and-network');
    expect(apollo.yearGoals.update(null)).toEqual([]);
  });
});

describe('the routine -> year goal map', () => {
  it('keys a year goal by the routine it is bound to', () => {
    const map = links([{ date: '01-01-2026', goalItems: [yearGoal()] }]);
    expect(Object.keys(map)).toEqual(['sw']);
    expect(map.sw.id).toBe('g1');
    expect(map.sw.body).toBe('Ship v2 of Routine Notes');
  });

  it('rounds the ratio — 5 of 6 months is 83%', () => {
    const milestones = [0, 1, 2, 3, 4].map((i) => month(i, true));
    const map = links([{ date: '01-01-2026', goalItems: [yearGoal({ milestones })] }]);
    expect(map.sw.pct).toBe(83);
  });

  it('is 100% once the goal itself is done', () => {
    const map = links([{ date: '01-01-2026', goalItems: [yearGoal({ isComplete: true })] }]);
    expect(map.sw.pct).toBe(100);
  });

  it('is 0% with no month goals done', () => {
    const map = links([{ date: '01-01-2026', goalItems: [yearGoal({ milestones: [month(0, false)] })] }]);
    expect(map.sw.pct).toBe(0);
  });

  it('skips a goal that names no routine', () => {
    expect(links([{ date: '01-01-2026', goalItems: [yearGoal({ taskRef: '' })] }])).toEqual({});
  });

  it('skips a milestone that happens to sit in a year document', () => {
    expect(links([{ date: '01-01-2026', goalItems: [yearGoal({ isMilestone: true })] }])).toEqual({});
  });

  it('skips an item with no id', () => {
    expect(links([{ date: '01-01-2026', goalItems: [yearGoal({ id: null })] }])).toEqual({});
  });

  it('keeps the first of two goals naming the same routine — the row holds one', () => {
    const map = links([{
      date: '01-01-2026',
      goalItems: [yearGoal(), yearGoal({ id: 'g2', body: 'Second' })],
    }]);
    expect(map.sw.id).toBe('g1');
  });

  it('survives an empty or absent payload', () => {
    expect(links([])).toEqual({});
    expect(links(null)).toEqual({});
    expect(links([{}])).toEqual({});
  });
});

describe('publishing', () => {
  it('emits the map, once, including on mount', () => {
    expect(Container.watch.links.immediate).toBe(true);
    const emit = jest.fn();
    Container.watch.links.handler.call({ $emit: emit }, { sw: {} });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('links', { sw: {} });
  });

  it('renders nothing when no scoped slot is given', () => {
    expect(Container.render.call({ $scopedSlots: {} })).toBe(null);
  });
});
