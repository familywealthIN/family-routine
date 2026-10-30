const fs = require('fs');
const path = require('path');
const {
  deviceTokens, deadTokens, sendToUser, HAS_DEVICE,
  buildLiveActivityMessage, liveActivityStarts, localAlarmDevices,
} = require('../src/utils/push');

const makeDb = () => {
  const updateOne = jest.fn(() => Promise.resolve());
  return { db: { collection: () => ({ updateOne }) }, updateOne };
};

describe('deviceTokens', () => {
  it('unions the device list with the legacy token, dropping placeholders', () => {
    expect(deviceTokens({ notificationIds: ['a', 'b'], notificationId: 'c' })).toEqual(['a', 'b', 'c']);
    expect(deviceTokens({ notificationIds: ['a'], notificationId: 'a' })).toEqual(['a']);
    expect(deviceTokens({ notificationId: 'undefined' })).toEqual([]);
  });
});

describe('deadTokens', () => {
  it('only treats unregistered / invalid tokens as dead', () => {
    const batch = {
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: false, error: { code: 'messaging/internal-error' } },
        { success: false, error: { code: 'messaging/invalid-registration-token' } },
      ],
    };
    expect(deadTokens(['a', 'b', 'c', 'd'], batch)).toEqual(['b', 'd']);
  });
});

describe('sendToUser', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => console.log.mockRestore());

  it('sends one multicast to every device the user is signed in on', async () => {
    const messaging = {
      sendEachForMulticast: jest.fn(() => Promise.resolve({
        successCount: 2, responses: [{ success: true }, { success: true }],
      })),
    };
    const { db, updateOne } = makeDb();
    const user = { _id: 'u', email: 'x@y', notificationIds: ['phone', 'tablet'] };
    const result = await sendToUser({
      messaging, db, user, title: 'T', body: 'B', data: { a: '1' },
    });
    expect(result).toEqual({ sent: 2, pruned: 0 });
    const [message] = messaging.sendEachForMulticast.mock.calls[0];
    expect(message.tokens).toEqual(['phone', 'tablet']);
    expect(message.notification).toEqual({ title: 'T', body: 'B' });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('prunes dead devices, including a dead legacy token', async () => {
    const messaging = {
      sendEachForMulticast: jest.fn(() => Promise.resolve({
        successCount: 1,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      })),
    };
    const { db, updateOne } = makeDb();
    const user = { _id: 'u', notificationIds: ['phone'], notificationId: 'old' };
    await expect(sendToUser({
      messaging, db, user, title: 'T', body: 'B',
    })).resolves.toEqual({ sent: 1, pruned: 1 });
    expect(updateOne).toHaveBeenCalledWith({ _id: 'u' }, {
      $pull: {
        notificationIds: { $in: ['old'] },
        notificationActionTokens: { $in: ['old'] },
        liveActivityTokens: { device: { $in: ['old'] } },
        alarmDevices: { device: { $in: ['old'] } },
      },
    });
    expect(updateOne).toHaveBeenCalledWith({ _id: 'u' }, { $unset: { notificationId: 1 } });
  });

  it('skips users with no device and survives an FCM failure', async () => {
    const messaging = { sendEachForMulticast: jest.fn(() => Promise.reject(new Error('down'))) };
    const { db } = makeDb();
    await expect(sendToUser({
      messaging, db, user: {}, title: 'T', body: 'B',
    })).resolves.toEqual({ sent: 0, pruned: 0 });
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
    await expect(sendToUser({
      messaging, db, user: { notificationIds: ['a'] }, title: 'T', body: 'B',
    })).resolves.toEqual({ sent: 0, pruned: 0 });
  });

  describe('Android devices that draw the cue themselves', () => {
    const ok = (n) => ({ successCount: n, responses: Array.from({ length: n }, () => ({ success: true })) });
    const user = {
      _id: 'u', email: 'x@y', notificationIds: ['iphone', 'old-android', 'new-android'], notificationActionTokens: ['new-android'],
    };

    it('get a cue with buttons data-only; every other device the usual message', async () => {
      const messaging = { sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))) };
      const { db } = makeDb();
      await expect(sendToUser({
        messaging, db, user, title: 'T', body: 'B', data: { routineId: 'r1' }, category: 'AGENT_START_ACTIONS', channel: 'routine-alarms',
      })).resolves.toEqual({ sent: 3, pruned: 0 });
      const messages = messaging.sendEachForMulticast.mock.calls.map(([m]) => m);
      const usual = messages.find((m) => m.notification);
      const drawn = messages.find((m) => !m.notification);
      expect(usual.tokens).toEqual(['iphone', 'old-android']);
      expect(usual.apns.payload.aps.category).toBe('AGENT_START_ACTIONS');
      expect(drawn.tokens).toEqual(['new-android']);
      expect(drawn.data).toEqual({
        routineId: 'r1', title: 'T', body: 'B', category: 'AGENT_START_ACTIONS', channel: 'routine-alarms', display: 'app',
      });
      expect(drawn.android.priority).toBe('high');
      expect(drawn.apns).toBeUndefined();
    });

    it('get the usual message when there are no buttons (lifecycle notifications)', async () => {
      const messaging = { sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))) };
      const { db } = makeDb();
      await sendToUser({
        messaging, db, user, title: 'Good morning', body: 'B',
      });
      expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
      expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['iphone', 'old-android', 'new-android']);
    });

    it('a failed batch does not stop the other', async () => {
      const messaging = {
        sendEachForMulticast: jest.fn((m) => (m.notification ? Promise.reject(new Error('down')) : Promise.resolve(ok(1)))),
      };
      const { db } = makeDb();
      await expect(sendToUser({
        messaging, db, user, title: 'T', body: 'B', category: 'ROUTINE_ACTIONS',
      })).resolves.toEqual({ sent: 1, pruned: 0 });
    });

    it('a flag for a token the user no longer has sends nothing extra', async () => {
      const messaging = { sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))) };
      const { db } = makeDb();
      await sendToUser({
        messaging, db, user: { ...user, notificationIds: ['iphone'] }, title: 'T', body: 'B', category: 'ROUTINE_ACTIONS',
      });
      expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
      expect(messaging.sendEachForMulticast.mock.calls[0][0].notification).toBeDefined();
    });
  });

  describe('iPhones with a Live Activity', () => {
    const ok = (n) => ({ successCount: n, responses: Array.from({ length: n }, () => ({ success: true })) });
    const START = 'ab'.repeat(32);
    const user = {
      _id: 'u',
      email: 'x@y',
      notificationIds: ['iphone', 'old-iphone'],
      liveActivityTokens: [{ device: 'iphone', start: START }, { device: 'signed-out', start: 'cd'.repeat(32) }],
    };
    const now = new Date('2026-10-30T11:00:00Z');
    const cue = {
      title: 'Yoga: fresh start', body: 'Yoga mat — the whole start.', data: { routineId: 'r1' }, category: 'ROUTINE_ACTIONS',
      liveActivity: { routineId: 'r1', name: 'Yoga', time: '07:00' }, now,
    };
    const messagingWith = (live) => ({
      sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))),
      sendEach: jest.fn(live || ((ms) => Promise.resolve(ok(ms.length)))),
    });

    it('start the activity instead of the notification; other devices get the usual one', async () => {
      const messaging = messagingWith();
      const { db } = makeDb();
      await expect(sendToUser({
        messaging, db, user, ...cue,
      })).resolves.toEqual({ sent: 2, pruned: 0 });
      expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['old-iphone']);
      const [[messages]] = messaging.sendEach.mock.calls;
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(buildLiveActivityMessage({
        token: 'iphone', startToken: START, title: cue.title, body: cue.body, category: 'ROUTINE_ACTIONS', liveActivity: cue.liveActivity, now,
      }));
      expect(messages[0].apns.payload.aps).toMatchObject({
        timestamp: 1793358000,
        event: 'start',
        'attributes-type': 'RoutineActivityAttributes',
        attributes: { routineId: 'r1', name: 'Yoga', time: '07:00' },
        'content-state': { title: cue.title, body: cue.body, category: 'ROUTINE_ACTIONS' },
        'stale-date': 1793358000 + 3600,
      });
    });

    it('a failed start falls back to the notification, and a refused token is dropped', async () => {
      const messaging = messagingWith(() => Promise.resolve({
        successCount: 0, responses: [{ success: false, error: { code: 'messaging/invalid-argument' } }],
      }));
      const { db, updateOne } = makeDb();
      await expect(sendToUser({
        messaging, db, user, ...cue,
      })).resolves.toEqual({ sent: 2, pruned: 0 });
      const tokens = messaging.sendEachForMulticast.mock.calls.map(([m]) => m.tokens).flat().sort();
      expect(tokens).toEqual(['iphone', 'old-iphone']);
      expect(updateOne).toHaveBeenCalledWith({ _id: 'u' }, { $pull: { liveActivityTokens: { device: { $in: ['iphone'] } } } });
    });

    it('a transient failure falls back but keeps the token', async () => {
      const messaging = messagingWith(() => Promise.reject(new Error('unavailable')));
      const { db, updateOne } = makeDb();
      await sendToUser({
        messaging, db, user, ...cue,
      });
      expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
      expect(updateOne).not.toHaveBeenCalled();
    });

    it('only for a routine cue: alarms, batches and lifecycle notifications stay notifications', async () => {
      const messaging = messagingWith();
      const { db } = makeDb();
      await sendToUser({
        messaging, db, user, ...cue, liveActivity: undefined,
      });
      await sendToUser({
        messaging, db, user, title: 'Good morning', body: 'B', liveActivity: cue.liveActivity,
      });
      expect(messaging.sendEach).not.toHaveBeenCalled();
    });

    it('is a message firebase-admin accepts', () => {
      const message = buildLiveActivityMessage({
        token: 'iphone', startToken: START, title: 'T', body: 'B', category: 'AGENT_START_ACTIONS', liveActivity: cue.liveActivity, now,
      });
      const main = require.resolve('firebase-admin');
      const root = main.slice(0, main.lastIndexOf(`node_modules${path.sep}firebase-admin`) + 'node_modules/firebase-admin'.length);
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const { validateMessage } = require(path.join(root, 'lib/messaging/messaging-internal.js'));
      expect(() => validateMessage(message)).not.toThrow();
      expect(message.apns.live_activity_token).toBe(START);
    });

    it('stays matched to the iOS ActivityAttributes', () => {
      const swift = fs.readFileSync(path.join(__dirname, '../../ios/App/Shared/RoutineActivity.swift'), 'utf8');
      expect(swift).toMatch(/struct RoutineActivityAttributes: ActivityAttributes/);
      ['routineId', 'name', 'time', 'title', 'body', 'category'].forEach((key) => {
        expect(swift).toMatch(new RegExp(`var ${key}: String`));
      });
    });
  });

  describe('iPhones ringing their own alarms', () => {
    const ok = (n) => ({ successCount: n, responses: Array.from({ length: n }, () => ({ success: true })) });
    const now = new Date('2026-10-30T11:00:00Z');
    const user = {
      _id: 'u',
      email: 'x@y',
      notificationIds: ['iphone', 'android', 'lapsed-iphone'],
      alarmDevices: [
        { device: 'iphone', through: new Date('2026-11-06T04:00:00Z'), routines: ['r1@07:00'] },
        { device: 'lapsed-iphone', through: new Date('2026-10-30T10:00:00Z'), routines: ['r1@07:00'] },
      ],
    };
    const alarmCue = {
      title: '⏰ Yoga · 07:00', body: 'B', category: 'ROUTINE_ACTIONS', timeSensitive: true, now,
    };

    it('get no push for an alarm they scheduled, while their schedule lasts', async () => {
      const messaging = { sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))) };
      const { db } = makeDb();
      await sendToUser({
        messaging, db, user, ...alarmCue, alarm: { routineId: 'r1', time: '07:00' },
      });
      expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['android', 'lapsed-iphone']);
    });

    it('still get an alarm they did not schedule: set to Alarm or moved since', async () => {
      const messaging = { sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))) };
      const { db } = makeDb();
      await sendToUser({
        messaging, db, user, ...alarmCue, alarm: { routineId: 'r1', time: '07:30' },
      });
      await sendToUser({
        messaging, db, user, ...alarmCue, alarm: { routineId: 'r2', time: '07:00' },
      });
      messaging.sendEachForMulticast.mock.calls.forEach(([m]) => {
        expect(m.tokens).toEqual(['iphone', 'android', 'lapsed-iphone']);
      });
    });

    it('still get every other notification', async () => {
      const messaging = { sendEachForMulticast: jest.fn((m) => Promise.resolve(ok(m.tokens.length))) };
      const { db } = makeDb();
      await sendToUser({
        messaging, db, user, title: 'Yoga', body: 'B', category: 'ROUTINE_ACTIONS', now,
      });
      expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['iphone', 'android', 'lapsed-iphone']);
      expect(localAlarmDevices(user, { routineId: 'r1', time: '07:00' }, now)).toEqual(new Set(['iphone']));
    });
  });

  it('a dead device also loses its Live Activity and alarm entries', async () => {
    const messaging = {
      sendEachForMulticast: jest.fn(() => Promise.resolve({
        successCount: 0, responses: [{ success: false, error: { code: 'messaging/registration-token-not-registered' } }],
      })),
    };
    const { db, updateOne } = makeDb();
    await sendToUser({
      messaging, db, user: { _id: 'u', email: 'x@y', notificationIds: ['gone'] }, title: 'T', body: 'B',
    });
    expect(updateOne.mock.calls[0][1].$pull).toEqual({
      notificationIds: { $in: ['gone'] },
      notificationActionTokens: { $in: ['gone'] },
      liveActivityTokens: { device: { $in: ['gone'] } },
      alarmDevices: { device: { $in: ['gone'] } },
    });
    expect(liveActivityStarts({ liveActivityTokens: [{ device: 'undefined', start: 'x' }] }).size).toBe(0);
  });

  it('HAS_DEVICE matches either field', () => {
    expect(HAS_DEVICE.$or).toHaveLength(2);
  });
});
