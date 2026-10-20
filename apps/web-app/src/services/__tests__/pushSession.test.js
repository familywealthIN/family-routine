jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn(() => false) } }));
jest.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    getPending: jest.fn(() => Promise.resolve({ notifications: [{ id: 7 }] })),
    cancel: jest.fn(() => Promise.resolve()),
    removeAllDeliveredNotifications: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: { removeAllDeliveredNotifications: jest.fn(() => Promise.resolve()) },
}));

/* eslint-disable import/first */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { GC_AUTH_TOKEN, GC_NOTIFICATION_TOKEN } from '../../constants/settings';
import {
  releasePushOnSignOut, retryPendingRelease, PENDING_RELEASE_KEY, isSignedIn, registerDevicePush,
} from '../pushSession';
/* eslint-enable import/first */

const client = (ok = true) => ({
  mutate: jest.fn(() => (ok ? Promise.resolve({}) : Promise.reject(new Error('offline')))),
});

describe('pushSession', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  it('releases the device token on sign-out and keeps the token for the next sign-in', async () => {
    localStorage.setItem(GC_NOTIFICATION_TOKEN, 'fcm-abc');
    const c = client();
    await expect(releasePushOnSignOut(c)).resolves.toBe(true);
    expect(c.mutate.mock.calls[0][0].variables).toEqual({ notificationId: 'fcm-abc' });
    expect(localStorage.getItem(GC_NOTIFICATION_TOKEN)).toBe('fcm-abc');
    expect(localStorage.getItem(PENDING_RELEASE_KEY)).toBeNull();
  });

  it('queues the release when offline and retries it after sign-out', async () => {
    localStorage.setItem(GC_NOTIFICATION_TOKEN, 'fcm-abc');
    await expect(releasePushOnSignOut(client(false))).resolves.toBe(false);
    expect(localStorage.getItem(PENDING_RELEASE_KEY)).toBe('fcm-abc');

    const c = client();
    await expect(retryPendingRelease(c)).resolves.toBe(true);
    expect(c.mutate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(PENDING_RELEASE_KEY)).toBeNull();
  });

  it('drops a queued release once someone has signed in again', async () => {
    localStorage.setItem(PENDING_RELEASE_KEY, 'fcm-abc');
    localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
    const c = client();
    await expect(retryPendingRelease(c)).resolves.toBe(false);
    expect(c.mutate).not.toHaveBeenCalled();
    expect(localStorage.getItem(PENDING_RELEASE_KEY)).toBeNull();
    expect(isSignedIn()).toBe(true);
  });

  it('skips the server call for a placeholder token', async () => {
    localStorage.setItem(GC_NOTIFICATION_TOKEN, 'undefined');
    const c = client();
    await expect(releasePushOnSignOut(c)).resolves.toBe(false);
    expect(c.mutate).not.toHaveBeenCalled();
  });

  it('cancels scheduled and delivered local notifications on native', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    await releasePushOnSignOut(client());
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 7 }] });
    expect(LocalNotifications.removeAllDeliveredNotifications).toHaveBeenCalled();
  });

  it('registers this device only while signed in', async () => {
    const c = client();
    await expect(registerDevicePush(c, 'fcm-tablet')).resolves.toBe(false);
    expect(c.mutate).not.toHaveBeenCalled();

    localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
    await expect(registerDevicePush(c, 'fcm-tablet')).resolves.toBe(true);
    expect(c.mutate.mock.calls[0][0].variables).toEqual({ notificationId: 'fcm-tablet' });
    await expect(registerDevicePush(client(false), 'fcm-tablet')).resolves.toBe(false);
  });
});
