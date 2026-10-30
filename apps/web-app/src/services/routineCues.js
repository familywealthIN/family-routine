/**
 * iPhone routine cues with their buttons showing, no long-press needed
 * (Asana "User Experience Notification", 30 Oct 2026). Native side:
 * apps/ios/App/App/RoutineCuesPlugin.swift.
 *
 * - Live Activity (iOS 17.2+): the cron starts a lock-screen card with the
 *   buttons instead of sending the notification, using the push-to-start
 *   token this device registers (registerLiveActivity). Turned off in
 *   Settings, it registers no token and gets the notification again.
 * - Alarm (iOS 26+): routines set to Alarm ring like the Clock app with Stop
 *   and the routine's button. The server plans the next days (deviceAlarms);
 *   the phone schedules them and says which, so the cron sends no alarm push
 *   for them (registerAlarmDevice).
 *
 * A button on either opens the app; it arrives here as an `action` and goes
 * where the notification button of the same id goes (notificationRoutes.js).
 */
import gql from 'graphql-tag';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { GC_AUTH_TOKEN, GC_NOTIFICATION_TOKEN } from '../constants/settings';
import { routeFor } from './notificationRoutes';

// Registered on first use: most of the app imports this (through sign-out)
// and never needs the native side.
let plugin;
export const RoutineCues = () => {
  if (!plugin) plugin = registerPlugin('RoutineCues');
  return plugin;
};

const REGISTER_LIVE = gql`
  mutation registerLiveActivity($notificationId: String!, $startToken: String) {
    registerLiveActivity(notificationId: $notificationId, startToken: $startToken)
  }
`;

const REGISTER_ALARMS = gql`
  mutation registerAlarmDevice($notificationId: String!, $through: String, $routines: [String]) {
    registerAlarmDevice(notificationId: $notificationId, through: $through, routines: $routines)
  }
`;

const DEVICE_ALARMS = gql`
  query deviceAlarms {
    deviceAlarms {
      through
      alarms { routineId time date fireAt title button buttonTitle repeat }
    }
  }
`;

const RESYNC_MS = 60 * 1000;

export const isIos = () => Capacitor.getPlatform() === 'ios';
const signedIn = () => !!localStorage.getItem(GC_AUTH_TOKEN);
const deviceToken = () => {
  const token = localStorage.getItem(GC_NOTIFICATION_TOKEN);
  return token && token !== 'undefined' && token !== 'null' ? token : null;
};

/** How the server names an alarm this phone rings (server utils/deviceAlarms.js alarmKey). */
export const alarmKey = ({ routineId, time }) => `${routineId}@${time}`;

/** Tell the server whether to start Live Activities on this device. */
export async function registerLiveActivity(client, device, status) {
  const startToken = status.liveActivities && status.startToken ? status.startToken : null;
  await client.mutate({ mutation: REGISTER_LIVE, variables: { notificationId: device, startToken } });
}

/**
 * Schedule this device's alarms and tell the server which. Asks for the
 * alarm permission the first time there is an alarm routine to ring.
 * Returns the permission state.
 */
export async function syncAlarms(client, device, status) {
  if (!status.alarms || status.alarms === 'unsupported') return 'unsupported';
  const { data } = await client.query({ query: DEVICE_ALARMS, fetchPolicy: 'network-only' });
  const plan = (data && data.deviceAlarms) || { alarms: [] };
  const alarms = plan.alarms || [];

  let state = status.alarms;
  if (state === 'notDetermined' && alarms.length) {
    ({ alarms: state } = await RoutineCues().requestAlarmAuthorization());
  }
  if (state !== 'authorized') {
    // Not allowed: the alarm push keeps coming instead.
    await client.mutate({ mutation: REGISTER_ALARMS, variables: { notificationId: device, through: null } });
    return state;
  }

  await RoutineCues().syncAlarms({
    alarms: alarms.map(({
      fireAt, title, routineId, button, buttonTitle,
    }) => ({
      fireAt, title, routineId, button, buttonTitle,
    })),
  });
  await client.mutate({
    mutation: REGISTER_ALARMS,
    variables: {
      notificationId: device,
      through: plan.through,
      routines: Array.from(new Set(alarms.map(alarmKey))),
    },
  });
  return state;
}

let lastSync = 0;

/**
 * Bring this device's Live Activity token and alarms up to date. On every
 * push-token registration, and when the app comes back to the front (at most
 * once a minute unless `force`). Never throws.
 */
export async function syncRoutineCues(client, device = deviceToken(), { force = false } = {}) {
  if (!isIos() || !client || !device || !signedIn()) return false;
  if (!force && Date.now() - lastSync < RESYNC_MS) return false;
  lastSync = Date.now();
  try {
    const status = await RoutineCues().status();
    await registerLiveActivity(client, device, status);
    await syncAlarms(client, device, status);
    return true;
  } catch (error) {
    console.log('routine cues sync failed', error);
    return false;
  }
}

/** Sign-out: ring nothing and show no card for the old session. Never throws. */
export async function clearRoutineCues() {
  if (!isIos()) return;
  try {
    await RoutineCues().endLiveActivities();
    const { alarms } = await RoutineCues().status();
    if (alarms === 'authorized') await RoutineCues().syncAlarms({ alarms: [] });
  } catch (error) {
    console.log(error);
  }
}

/** Where a card or alarm button (or a tap on the card) takes the app. */
export const routeForCue = ({ button, routineId } = {}) => routeFor(button || 'tap', { routineId });

/**
 * App start on iOS: route button taps, keep the token current, and clear the
 * cards and resync whenever the app comes back to the front.
 */
export function startRoutineCues(client, { router = () => window.app && window.app.$router } = {}) {
  if (!isIos()) return;
  RoutineCues().addListener('action', (action) => {
    if (!signedIn()) return;
    const route = routeForCue(action);
    const r = router();
    if (route && r) r.push(route).catch(() => {});
  });
  RoutineCues().addListener('liveActivityToken', ({ token }) => {
    const device = deviceToken();
    if (!device || !signedIn()) return;
    registerLiveActivity(client, device, { liveActivities: true, startToken: token })
      .catch((error) => console.log('live activity token register failed', error));
  });
  const onFront = () => {
    if (document.visibilityState !== 'visible') return;
    // The app is open: the routine cards have done their job.
    RoutineCues().endLiveActivities().catch(() => {});
    syncRoutineCues(client);
  };
  document.addEventListener('visibilitychange', onFront);
  onFront();
}
