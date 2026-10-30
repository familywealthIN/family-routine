/**
 * Push to every device a user is signed in on.
 *
 * Tokens live in `users.notificationIds` (one per device, server passport.js
 * registerPushToken); `notificationId` is the legacy single token, still read
 * until that user's next sign-in folds it into the list. A token FCM reports
 * as gone (app uninstalled, token rotated) is pruned so the list does not fill
 * with dead devices.
 *
 * Routine cues carry action buttons. iOS draws them from `aps.category`;
 * Android has no equivalent, so devices whose app draws cues itself
 * (`users.notificationActionTokens`, the Android build with
 * RoutineNotification.java) get the cue data-only and show it with its
 * buttons. Every other device, older Android builds included, gets the usual
 * notification message.
 *
 * iOS shows a notification's buttons only on a long-press, so an iPhone that
 * registered an ActivityKit push-to-start token (`users.liveActivityTokens`,
 * iOS 17.2+) gets a routine cue as a Live Activity instead: a lock-screen card
 * with the buttons on it. If that start fails, the device gets the usual
 * notification. An iPhone that rings an alarm routine itself with AlarmKit
 * (`users.alarmDevices`: that routine at that time, while its schedule lasts)
 * gets no alarm push for it.
 */

// Errors meaning the token will never work again — anything else (quota,
// unavailable, internal) is transient and must not cost the user a device.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const isRealPushToken = (token) => typeof token === 'string'
  && token.length > 0 && token !== 'undefined' && token !== 'null';

/** Every real device token on a user document, legacy field included. */
const deviceTokens = (user) => Array.from(new Set([
  ...((user && user.notificationIds) || []),
  user && user.notificationId,
])).filter(isRealPushToken);

/** Tokens from a sendEachForMulticast batch that FCM says are dead. */
function deadTokens(tokens, batch) {
  return ((batch && batch.responses) || [])
    .map((r, i) => (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code) ? tokens[i] : null))
    .filter(Boolean);
}

async function pruneTokens(db, user, tokens) {
  if (!tokens.length) return;
  const users = db.collection('users');
  await users.updateOne({ _id: user._id }, {
    $pull: {
      notificationIds: { $in: tokens },
      notificationActionTokens: { $in: tokens },
      liveActivityTokens: { device: { $in: tokens } },
      alarmDevices: { device: { $in: tokens } },
    },
  });
  if (tokens.includes(user.notificationId)) {
    await users.updateOne({ _id: user._id }, { $unset: { notificationId: 1 } });
  }
}

const DEFAULT_CHANNEL = 'routine-notifications';
const ALARM_CHANNEL = 'routine-alarms';

// FCM data values must be strings.
const stringData = (data) => Object.keys(data).reduce((out, key) => (
  data[key] === undefined || data[key] === null ? out : { ...out, [key]: String(data[key]) }
), {});

// Web: the Firebase SDK shows the notification and opens this link on click.
function webLink(data) {
  if (!data.route || !/^https:\/\//.test(data.click_action || '')) return {};
  try {
    return { webpush: { fcmOptions: { link: new URL(data.route, data.click_action).href } } };
  } catch {
    return {};
  }
}

/** The FCM multicast message, per platform. */
function buildMessage({
  tokens, title, body, data = {}, priority = 'high', channel = DEFAULT_CHANNEL,
  category, timeSensitive = false,
}) {
  const aps = { sound: 'default' };
  if (category) aps.category = category;
  if (timeSensitive) aps['interruption-level'] = 'time-sensitive';
  return {
    tokens,
    notification: { title, body },
    data: stringData({ ...data, category }),
    android: {
      priority,
      ttl: 60 * 60 * 1000,
      notification: { channelId: channel, sound: 'default' },
    },
    apns: { payload: { aps } },
    ...webLink(data),
  };
}

/** Tokens whose app draws routine cues with their buttons itself. */
const appDrawnTokens = (user) => new Set(((user && user.notificationActionTokens) || []).filter(isRealPushToken));

/**
 * The same cue as a data-only message, for an app that draws it with its
 * buttons itself (display=app). High priority: it has to wake the app to be
 * shown at all.
 */
function buildAppDrawnMessage({
  tokens, title, body, data = {}, channel = DEFAULT_CHANNEL, category,
}) {
  return {
    tokens,
    data: stringData({
      ...data, title, body, category, channel, display: 'app',
    }),
    android: { priority: 'high', ttl: 60 * 60 * 1000 },
  };
}

/** Device token → ActivityKit push-to-start token, for iPhones showing cues as a Live Activity. */
const liveActivityStarts = (user) => new Map(((user && user.liveActivityTokens) || [])
  .filter((t) => t && isRealPushToken(t.device) && typeof t.start === 'string' && t.start)
  .map((t) => [t.device, t.start]));

/** How a device names an alarm it rings itself (server utils/deviceAlarms.js alarmKey). */
const alarmKey = ({ routineId, time }) => `${routineId}@${time}`;

/**
 * Devices that ring this alarm themselves (AlarmKit): they scheduled this
 * routine at this time, and their schedule runs past `now`.
 */
const localAlarmDevices = (user, alarm, now = new Date()) => new Set(((user && user.alarmDevices) || [])
  .filter((d) => d && d.through && new Date(d.through) > now && (d.routines || []).includes(alarmKey(alarm)))
  .map((d) => d.device));

// The app's ActivityAttributes type (apps/ios/App/Shared/RoutineActivity.swift).
const LIVE_ACTIVITY_TYPE = 'RoutineActivityAttributes';
const LIVE_ACTIVITY_STALE_MIN = 60;

// A start the device will never accept again: stop trying; the app registers
// a fresh token on its next start.
const DEAD_START_CODES = new Set([...DEAD_TOKEN_CODES, 'messaging/invalid-argument']);

/**
 * Start a routine's Live Activity on one iPhone. `content-state` and
 * `attributes` must decode into RoutineActivityAttributes and its
 * ContentState, key for key. The alert makes it arrive like a notification.
 */
function buildLiveActivityMessage({
  token, startToken, title, body, category, liveActivity, now = new Date(),
}) {
  const timestamp = Math.floor(now.getTime() / 1000);
  return {
    token,
    apns: {
      liveActivityToken: startToken,
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          timestamp,
          event: 'start',
          'content-state': { title, body, category },
          'attributes-type': LIVE_ACTIVITY_TYPE,
          attributes: {
            routineId: String(liveActivity.routineId),
            name: String(liveActivity.name || ''),
            time: String(liveActivity.time || ''),
          },
          alert: { title, body, sound: 'default' },
          'stale-date': timestamp + LIVE_ACTIVITY_STALE_MIN * 60,
        },
      },
    },
  };
}

/**
 * Send one notification to all of a user's devices.
 *
 * @param {Object} opts
 * @param {Object} opts.messaging admin.messaging()
 * @param {Object} opts.db mongoose connection (for pruning dead tokens)
 * @param {Object} opts.user user doc with _id, notificationIds, notificationId
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {Object} [opts.data] string values only (FCM requirement)
 * @param {string} [opts.priority] 'high' | 'normal'
 * @param {string} [opts.channel] Android channel: 'routine-notifications' or
 *   'routine-alarms' (created by the app, App.vue)
 * @param {string} [opts.category] iOS category → the action buttons shown
 * @param {boolean} [opts.timeSensitive] iOS: break through Focus (alarms)
 * @param {Object} [opts.liveActivity] {routineId, name, time}: iPhones with a
 *   push-to-start token show this routine cue as a Live Activity
 * @param {Object} [opts.alarm] {routineId, time} of an alarm cue: none to the
 *   devices ringing that alarm themselves
 * @param {Date} [opts.now]
 */
async function sendToUser({
  messaging, db, user, title, body, data = {}, priority = 'high',
  channel = DEFAULT_CHANNEL, category, timeSensitive = false,
  liveActivity, alarm, now = new Date(),
}) {
  const ringsItself = alarm ? localAlarmDevices(user, alarm, now) : new Set();
  const tokens = deviceTokens(user).filter((t) => !ringsItself.has(t));
  if (!tokens.length) return { sent: 0, pruned: 0 };
  // Only a cue with buttons is worth drawing in the app, or as a Live Activity.
  const drawn = category ? appDrawnTokens(user) : new Set();
  const starts = category && liveActivity ? liveActivityStarts(user) : new Map();
  const live = tokens.filter((t) => starts.has(t));
  const plain = tokens.filter((t) => !starts.has(t));
  const opts = {
    title, body, data, priority, channel, category, timeSensitive,
  };

  let sent = 0;
  const dead = [];
  const stale = [];
  const sendBatch = async (group, build) => {
    if (!group.length) return;
    try {
      const batch = await messaging.sendEachForMulticast(build({ tokens: group, ...opts }));
      sent += batch.successCount;
      dead.push(...deadTokens(group, batch));
    } catch (error) {
      console.log('Error sending message:', error);
    }
  };
  // Each iPhone has its own start token, so one message each. A device whose
  // start fails gets the usual notification instead.
  const sendLive = async () => {
    if (!live.length) return;
    let failed = live;
    try {
      const batch = await messaging.sendEach(live.map((token) => buildLiveActivityMessage({
        token, startToken: starts.get(token), title, body, category, liveActivity, now,
      })));
      sent += batch.successCount;
      failed = live.filter((_, i) => !batch.responses[i].success);
      stale.push(...live.filter((_, i) => {
        const r = batch.responses[i];
        return !r.success && r.error && DEAD_START_CODES.has(r.error.code);
      }));
    } catch (error) {
      console.log('Error starting live activity:', error);
    }
    await sendBatch(failed, buildMessage);
  };

  // One failing batch must not cost the others their send.
  await Promise.all([
    sendBatch(plain.filter((t) => !drawn.has(t)), buildMessage),
    sendBatch(plain.filter((t) => drawn.has(t)), buildAppDrawnMessage),
    sendLive(),
  ]);
  try {
    await pruneTokens(db, user, dead);
    if (stale.length) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $pull: { liveActivityTokens: { device: { $in: stale } } } },
      );
    }
  } catch (error) {
    console.log('Error pruning tokens:', error);
  }
  console.log(`Sent to ${sent}/${tokens.length} device(s) for ${user.email}${dead.length ? `, pruned ${dead.length}` : ''}`);
  return { sent, pruned: dead.length };
}

/** Mongo filter for users that have at least one device to push to. */
const HAS_DEVICE = {
  $or: [
    { 'notificationIds.0': { $exists: true } },
    { notificationId: { $nin: [null, '', 'undefined', 'null'] } },
  ],
};

module.exports = {
  DEFAULT_CHANNEL,
  ALARM_CHANNEL,
  buildMessage,
  buildAppDrawnMessage,
  buildLiveActivityMessage,
  liveActivityStarts,
  localAlarmDevices,
  HAS_DEVICE,
  isRealPushToken,
  deviceTokens,
  deadTokens,
  sendToUser,
};
