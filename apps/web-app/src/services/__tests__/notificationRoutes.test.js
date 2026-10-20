import {
  routeFor, actionTypeFor, ACTION_TYPES, CATEGORIES,
} from '../notificationRoutes';

describe('notification buttons per AI level', () => {
  const ids = (category) => ACTION_TYPES.find((t) => t.id === category).actions.map((a) => a.id);

  it('no AI / AI without context: Do now and Complete', () => {
    expect(ids(CATEGORIES.ROUTINE)).toEqual(expect.arrayContaining(['DO_NOW', 'COMPLETE']));
  });
  it('AI with an agent: Start agent', () => {
    expect(ids(CATEGORIES.AGENT_START)).toContain('START_AGENT');
  });
  it('AI with context: Build agent', () => {
    expect(ids(CATEGORIES.AGENT_BUILD)).toContain('BUILD_AGENT');
  });

  it('re-posts a foreground push with the category the server chose', () => {
    expect(actionTypeFor({ category: 'AGENT_START_ACTIONS' })).toBe('AGENT_START_ACTIONS');
    expect(actionTypeFor({ category: 'bogus' })).toBe('ROUTINE_ACTIONS');
    expect(actionTypeFor()).toBe('ROUTINE_ACTIONS');
  });
});

describe('routeFor', () => {
  const data = { routineId: 'r1', route: '/home/r1/start?src=push' };

  it.each([
    ['DO_NOW', '/home/r1/focus?src=push'],
    ['COMPLETE', '/home/r1/complete?src=push'],
    ['START_AGENT', '/home/r1/start?src=push'],
    ['BUILD_AGENT', '/home/r1/build?src=push'],
  ])('%s → %s', (actionId, route) => {
    expect(routeFor(actionId, data)).toBe(route);
  });

  it('a body tap follows the server route, else opens the routine without acting', () => {
    expect(routeFor('tap', { route: '/goals' })).toBe('/goals');
    expect(routeFor('tap', { routineId: 'r1' })).toBe('/home/r1/focus?src=push');
    expect(routeFor('tap', {})).toBe('/home');
  });

  it('snooze and skip do not navigate', () => {
    expect(routeFor('SNOOZE', data)).toBeNull();
    expect(routeFor('SKIP', data)).toBeNull();
  });
});
