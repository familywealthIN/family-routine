import fs from 'fs';
import path from 'path';
import {
  routeFor, actionTypeFor, buttonOf, isDrawnByApp, ACTION_TYPES, CATEGORIES,
} from '../notificationRoutes';

describe('notification buttons per AI level', () => {
  const ids = (category) => ACTION_TYPES.find((t) => t.id === category).actions.map((a) => a.id);

  // Exactly the planned buttons (Asana "User Experience Notification").
  it('no AI / AI without context: Do now and Complete', () => {
    expect(ids(CATEGORIES.ROUTINE)).toEqual(['DO_NOW', 'COMPLETE']);
  });
  it('AI with an agent: Start agent', () => {
    expect(ids(CATEGORIES.AGENT_START)).toEqual(['START_AGENT']);
  });
  it('AI with context: Build agent', () => {
    expect(ids(CATEGORIES.AGENT_BUILD)).toEqual(['BUILD_AGENT']);
  });

  it('every button opens the app (iOS never runs a background one)', () => {
    ACTION_TYPES.forEach((t) => t.actions.forEach((a) => expect(a.foreground).toBe(true)));
  });

  it('the Android app draws the same buttons (RoutineNotification.java)', () => {
    const java = fs.readFileSync(path.resolve(__dirname,
      '../../../../android/app/src/main/java/com/routine/note/RoutineNotification.java'), 'utf8');
    ACTION_TYPES.forEach(({ id, actions }) => {
      const pairs = actions.map((a) => `{ "${a.id}", "${a.title}" }`).join(', ');
      expect(java).toContain(`"${id}".equals(category)`);
      expect(java).toContain(`new String[][] { ${pairs} }`);
    });
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

  it('an Android-drawn button routes as the iOS button of the same id', () => {
    expect(buttonOf('tap', { button: 'START_AGENT' })).toBe('START_AGENT');
    expect(buttonOf('tap', {})).toBe('tap');
    expect(buttonOf('COMPLETE', { button: 'START_AGENT' })).toBe('COMPLETE');
    expect(routeFor(buttonOf('tap', { ...data, button: 'COMPLETE' }), data)).toBe('/home/r1/complete?src=push');
    expect(isDrawnByApp({ display: 'app' })).toBe(true);
    expect(isDrawnByApp({})).toBe(false);
  });

  it('a body tap follows the server route, else opens the routine without acting', () => {
    expect(routeFor('tap', { route: '/goals' })).toBe('/goals');
    expect(routeFor('tap', { routineId: 'r1' })).toBe('/home/r1/focus?src=push');
    expect(routeFor('tap', {})).toBe('/home');
  });

  it("a dismissal, or an old build's Snooze or Skip, does not navigate", () => {
    expect(routeFor('dismiss', data)).toBeNull();
    expect(routeFor('SNOOZE', data)).toBeNull();
    expect(routeFor('SKIP', data)).toBeNull();
  });
});
