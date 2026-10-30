/**
 * Push notifications belong to a signed-in session.
 *
 * Reminders are sent by the server to the device token stored on the user
 * (`users.notificationId`). Signing out used to clear only local data, so the
 * server kept pushing to the device — a signed-out phone still got every
 * reminder, and on a shared phone the next account got both people's.
 *
 * A user can be signed in on several devices; each one registers its own
 * token (`registerDevicePush`, on app start and whenever the token rotates),
 * and sign-out releases only this device's token, so the others keep their
 * reminders. The device token itself is kept locally (it identifies the
 * device, not the user) so the next sign-in binds it again — and the server
 * moves it to that account exclusively.
 * A release that cannot reach the server (offline) is queued and retried on
 * the next app start; it needs no session, so it still works after sign-out.
 */
import gql from 'graphql-tag';
import { Capacitor } from '@capacitor/core';
import { GC_AUTH_TOKEN, GC_NOTIFICATION_TOKEN } from '../constants/settings';
import { clearRoutineCues, syncRoutineCues } from './routineCues';

export const PENDING_RELEASE_KEY = 'pending-push-release';

const RELEASE = gql`
  mutation releaseNotificationToken($notificationId: String!) {
    releaseNotificationToken(notificationId: $notificationId)
  }
`;

const REGISTER = gql`
  mutation registerNotificationToken($notificationId: String!) {
    registerNotificationToken(notificationId: $notificationId)
  }
`;

const REGISTER_ACTIONS = gql`
  mutation registerNotificationActions($notificationId: String!) {
    registerNotificationActions(notificationId: $notificationId)
  }
`;

export const isRealPushToken = (token) => typeof token === 'string'
  && token.length > 0 && token !== 'undefined' && token !== 'null';

/** Foreground handlers use this: nothing is shown to a signed-out device. */
export const isSignedIn = () => !!localStorage.getItem(GC_AUTH_TOKEN);

async function sendRelease(client, notificationId) {
  try {
    await client.mutate({ mutation: RELEASE, variables: { notificationId } });
    localStorage.removeItem(PENDING_RELEASE_KEY);
    return true;
  } catch (error) {
    console.log('push release failed, will retry', error);
    localStorage.setItem(PENDING_RELEASE_KEY, notificationId);
    return false;
  }
}

/**
 * Cancel what the device would still show on its own: snoozes and other local
 * notifications scheduled for the old session, and any already in the tray.
 */
async function clearDeviceNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Loaded here, not at module top: sign-out is imported by most pages and
    // the plugins only exist on native.
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { notifications = [] } = await LocalNotifications.getPending();
    if (notifications.length) {
      await LocalNotifications.cancel({ notifications: notifications.map(({ id }) => ({ id })) });
    }
    await LocalNotifications.removeAllDeliveredNotifications();
    await PushNotifications.removeAllDeliveredNotifications();
    await clearRoutineCues();
  } catch (error) {
    console.log(error);
  }
}

/** Sign-out step: stop the server pushing to this device. Never throws. */
export async function releasePushOnSignOut(client) {
  await clearDeviceNotifications();
  const token = localStorage.getItem(GC_NOTIFICATION_TOKEN);
  if (!isRealPushToken(token) || !client) return false;
  return sendRelease(client, token);
}

/**
 * App start: finish a release that failed at sign-out — unless someone signed
 * in again since, in which case the sign-in already rebound the token.
 */
export async function retryPendingRelease(client) {
  const token = localStorage.getItem(PENDING_RELEASE_KEY);
  if (!token) return false;
  if (isSignedIn() || !isRealPushToken(token) || !client) {
    localStorage.removeItem(PENDING_RELEASE_KEY);
    return false;
  }
  return sendRelease(client, token);
}

/**
 * Tell the server this signed-in device can receive pushes. Called with each
 * token FCM / APNs hands the app, so a rotated token replaces nothing on the
 * user's other devices. Never throws; a signed-out device registers nothing.
 */
export async function registerDevicePush(client, token) {
  if (!isRealPushToken(token) || !client || !isSignedIn()) return false;
  try {
    await client.mutate({ mutation: REGISTER, variables: { notificationId: token } });
  } catch (error) {
    console.log('push register failed', error);
    return false;
  }
  // This Android build draws routine cues with their buttons itself
  // (RoutineNotification.java), so the server may send them data-only. Its own
  // call, so a server without it fails only this, never the registration.
  if (Capacitor.getPlatform() === 'android') {
    try {
      await client.mutate({ mutation: REGISTER_ACTIONS, variables: { notificationId: token } });
    } catch (error) {
      console.log('push actions register failed', error);
    }
  }
  // An iPhone shows routine cues with their buttons as a Live Activity, and
  // rings alarm routines itself (routineCues.js).
  await syncRoutineCues(client, token, { force: true });
  return true;
}
