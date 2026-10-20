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
    expect(updateOne).toHaveBeenCalledWith({ _id: 'u' }, { $pull: { notificationIds: { $in: ['old'] } } });
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

  it('HAS_DEVICE matches either field', () => {
    expect(HAS_DEVICE.$or).toHaveLength(2);
  });
});
