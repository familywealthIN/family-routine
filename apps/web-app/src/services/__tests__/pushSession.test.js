jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn(() => false), getPlatform: jest.fn(() => 'web') },
  registerPlugin: jest.fn(() => ({
    status: jest.fn(() => Promise.resolve({ liveActivities: true, startToken: 'ab12', alarms: 'unsupported' })),
    endLiveActivities: jest.fn(() => Promise.resolve()),
    syncAlarms: jest.fn(() => Promise.resolve({ scheduled: 0 })),
  })),
}));
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

  it('on Android also says this device draws its own buttons', async () => {
    localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
    const web = client();
    await registerDevicePush(web, 'fcm-web');
    expect(web.mutate).toHaveBeenCalledTimes(1);

    Capacitor.getPlatform.mockReturnValue('android');
    const c = client();
    await expect(registerDevicePush(c, 'fcm-phone')).resolves.toBe(true);
    expect(c.mutate.mock.calls.map(([call]) => call.mutation.definitions[0].name.value))
      .toEqual(['registerNotificationToken', 'registerNotificationActions']);
    expect(c.mutate.mock.calls[1][0].variables).toEqual({ notificationId: 'fcm-phone' });
  });

  it('a server without the buttons call still registers the device', async () => {
    localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
    Capacitor.getPlatform.mockReturnValue('android');
    const c = { mutate: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Unknown field')) };
    await expect(registerDevicePush(c, 'fcm-phone')).resolves.toBe(true);
  });

  it('on iOS also registers its Live Activity token; a failure there costs nothing', async () => {
    localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
    Capacitor.getPlatform.mockReturnValue('ios');
    const c = client();
    await expect(registerDevicePush(c, 'fcm-iphone')).resolves.toBe(true);
    expect(c.mutate.mock.calls.map(([call]) => call.mutation.definitions[0].name.value))
      .toEqual(['registerNotificationToken', 'registerLiveActivity']);
    expect(c.mutate.mock.calls[1][0].variables).toEqual({ notificationId: 'fcm-iphone', startToken: 'ab12' });

    const failing = { mutate: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Unknown field')) };
    await expect(registerDevicePush(failing, 'fcm-iphone')).resolves.toBe(true);
  });
});
