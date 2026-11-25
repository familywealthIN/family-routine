jest.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }));
jest.mock('../analytics', () => ({ trackEvent: jest.fn() }));

/* eslint-disable import/first */
import analytics from '../analytics';
import {
  tickTapped, tickDropped, tickSent, tickSaved, tickFailed,
  appHidden, checkServerDay, watchRows, LOST_AFTER_MS,
} from '../tickTelemetry';
/* eslint-enable import/first */

const DATE = '25-11-2026';
const ask = { taskId: 'office', date: DATE, routineId: 'doc25' };
const events = (name) => analytics.trackEvent.mock.calls.filter(([n]) => n === name).map(([, p]) => p);

beforeEach(() => {
  localStorage.clear();
  analytics.trackEvent.mockClear();
});

describe('tickTelemetry', () => {
  it('sends each stage with the ids, the platform and no personal data', () => {
    tickTapped(ask);
    tickSent(ask);
    tickSaved(ask);
    const [tap] = events('tick_tap');
    expect(tap).toMatchObject({
      kind: 'tick', task_id: 'office', date: DATE, routine_id: 'doc25', platform: 'ios',
    });
    expect(events('tick_sent')).toHaveLength(1);
    expect(events('tick_saved')[0].ms).toEqual(expect.any(Number));
    expect(JSON.stringify(analytics.trackEvent.mock.calls)).not.toMatch(/@/);
  });

  it('reports a tick the server still has unticked, once, after the grace period', () => {
    tickTapped(ask);
    tickSent(ask);
    tickSaved(ask);
    const tasklist = [{ id: 'office', ticked: false, passed: true }];
    checkServerDay({ date: DATE, routineId: 'doc25', tasklist });
    expect(events('tick_lost')).toHaveLength(0);

    const later = Date.now() + LOST_AFTER_MS + 1000;
    checkServerDay({
      date: DATE, routineId: 'doc25', tasklist, now: later,
    });
    checkServerDay({
      date: DATE, routineId: 'doc25', tasklist, now: later + 1000,
    });
    const lost = events('tick_lost');
    expect(lost).toHaveLength(1);
    expect(lost[0]).toMatchObject({
      task_id: 'office', sent: true, saved: true, passed: true,
    });
  });

  it('closes the ask when the server shows the tick', () => {
    tickTapped(ask);
    checkServerDay({ date: DATE, tasklist: [{ id: 'office', ticked: true }] });
    checkServerDay({
      date: DATE, tasklist: [{ id: 'office', ticked: false }], now: Date.now() + LOST_AFTER_MS * 2,
    });
    expect(events('tick_lost')).toHaveLength(0);
  });

  it('survives a reload: the ask is kept on the device', () => {
    tickTapped(ask);
    tickSent(ask);
    // A fresh page has nothing in memory; only localStorage carries the ask.
    checkServerDay({
      date: DATE, tasklist: [{ id: 'office', ticked: false }], now: Date.now() + LOST_AFTER_MS + 1,
    });
    expect(events('tick_lost')[0]).toMatchObject({ sent: true, saved: false });
  });

  it('forgets an ask that was refused or failed, so it is not reported as lost', () => {
    tickTapped(ask);
    tickDropped({ ...ask, reason: 'passed' });
    tickTapped({ ...ask, taskId: 'gym' });
    tickSent({ ...ask, taskId: 'gym' });
    tickFailed({ ...ask, taskId: 'gym', error: new Error('Network error') });
    checkServerDay({
      date: DATE,
      tasklist: [{ id: 'office', ticked: false }, { id: 'gym', ticked: false }],
      now: Date.now() + LOST_AFTER_MS + 1,
    });
    expect(events('tick_lost')).toHaveLength(0);
    expect(events('tick_dropped')[0].reason).toBe('passed');
    expect(events('tick_failed')[0].error).toBe('Network error');
  });

  it('reports an unconfirmed tick when the app goes to the background', () => {
    tickTapped(ask);
    tickSent(ask);
    tickTapped({ ...ask, taskId: 'gym' });
    tickSent({ ...ask, taskId: 'gym' });
    tickSaved({ ...ask, taskId: 'gym' });
    appHidden({ date: DATE, routineId: 'doc25' });
    const hidden = events('tick_hidden');
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toMatchObject({ task_id: 'office', sent: true });
  });

  it('reports a routine that goes from ticked to unticked on screen', () => {
    tickTapped(ask);
    let seen = watchRows({ date: DATE, rows: [{ id: 'office', ticked: false }] });
    seen = watchRows({ date: DATE, prev: seen, rows: [{ id: 'office', ticked: true }] });
    expect(events('tick_reverted')).toHaveLength(0);
    watchRows({ date: DATE, prev: seen, rows: [{ id: 'office', ticked: false }] });
    const [reverted] = events('tick_reverted');
    expect(reverted).toMatchObject({ task_id: 'office', had_ask: true, from_placeholder: false });
  });

  it('does not call a new day a revert', () => {
    const seen = watchRows({ date: '24-11-2026', rows: [{ id: 'office', ticked: true }] });
    watchRows({ date: DATE, prev: seen, rows: [{ id: 'office', ticked: false }] });
    expect(events('tick_reverted')).toHaveLength(0);
  });

  it('marks a revert out of the placeholder', () => {
    const seen = watchRows({
      date: DATE, rows: [{ id: 'office', ticked: true }], fromPlaceholder: true,
    });
    watchRows({ date: DATE, prev: seen, rows: [{ id: 'office', ticked: false }] });
    expect(events('tick_reverted')[0].from_placeholder).toBe(true);
  });

  it('never throws when analytics does', () => {
    analytics.trackEvent.mockImplementationOnce(() => { throw new Error('boom'); });
    expect(() => tickTapped(ask)).not.toThrow();
  });
});
