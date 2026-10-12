/* eslint-env jest */
/**
 * Native analytics: on iOS/Android every event goes to the Firebase SDK through
 * the @capacitor-firebase/analytics plugin, shaped to Firebase's rules.
 */
const mockCalls = [];
const mockPlugin = {
  logEvent: jest.fn((o) => { mockCalls.push(['logEvent', o]); return Promise.resolve(); }),
  setCurrentScreen: jest.fn((o) => { mockCalls.push(['setCurrentScreen', o]); return Promise.resolve(); }),
  setUserProperty: jest.fn((o) => { mockCalls.push(['setUserProperty', o]); return Promise.resolve(); }),
};

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => mockPlugin,
}));
jest.mock('firebase/app', () => ({ apps: [] }));
jest.mock('firebase/analytics', () => ({}));
jest.mock('firebase/performance', () => ({}));

const analytics = require('../analytics').default;

const events = () => mockCalls.filter(([m]) => m === 'logEvent').map(([, o]) => o);

beforeEach(() => { mockCalls.length = 0; });

describe('analytics on the native apps', () => {
  it('sends business events once, with only Firebase-legal params', () => {
    analytics.trackBusinessEvent('goal_created', {
      period: 'week', is_milestone: true, tags_count: 2, nested: { a: 1 },
    });
    const sent = events().filter((e) => e.name === 'goal_created');
    expect(sent).toHaveLength(1);
    expect(sent[0].params).toMatchObject({
      period: 'week', is_milestone: 'true', tags_count: 2, event_category: 'business',
    });
    expect(sent[0].params.nested).toBeUndefined();
  });

  it('turns a page view into a screen name, logged once', () => {
    analytics.trackPageView('Goals');
    expect(mockCalls.filter(([m]) => m === 'setCurrentScreen')).toEqual([['setCurrentScreen', { screenName: 'Goals' }]]);
    expect(events().filter((e) => e.name === 'page_view')).toHaveLength(0);
  });

  it('renames the reserved "error" event and drops the reserved session_start', () => {
    analytics.trackError(new Error('boom'));
    analytics.trackEvent('session_start', { platform: 'ios' });
    const names = events().map((e) => e.name);
    expect(names).toContain('app_error');
    expect(names).not.toContain('error');
    expect(names).not.toContain('session_start');
  });

  it('caps names at 40 chars and strips characters Firebase rejects', () => {
    analytics.trackEvent('routine-item created! with a very long name that keeps going', {});
    const { name } = events()[0];
    expect(name).toMatch(/^[A-Za-z0-9_]{1,40}$/);
  });

  it('never makes the per-session id a user property', () => {
    analytics.setUserProperty('session_id', 'abc');
    analytics.setUserProperty('plan', 'free');
    const keys = mockCalls.filter(([m]) => m === 'setUserProperty').map(([, o]) => o.key);
    expect(keys).toEqual(['plan']);
  });
});
