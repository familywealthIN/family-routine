const {
  deviceTokens, deadTokens, sendToUser, HAS_DEVICE,
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
      $pull: { notificationIds: { $in: ['old'] }, notificationActionTokens: { $in: ['old'] } },
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

  it('HAS_DEVICE matches either field', () => {
    expect(HAS_DEVICE.$or).toHaveLength(2);
  });
});
