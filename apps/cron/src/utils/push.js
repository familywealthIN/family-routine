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
    $pull: { notificationIds: { $in: tokens }, notificationActionTokens: { $in: tokens } },
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
 */
async function sendToUser({
  messaging, db, user, title, body, data = {}, priority = 'high',
  channel = DEFAULT_CHANNEL, category, timeSensitive = false,
}) {
  const tokens = deviceTokens(user);
  if (!tokens.length) return { sent: 0, pruned: 0 };
  // Only a cue with buttons is worth drawing in the app.
  const drawn = category ? appDrawnTokens(user) : new Set();
  const opts = {
    title, body, data, priority, channel, category, timeSensitive,
  };
  const batches = [
    [tokens.filter((t) => !drawn.has(t)), buildMessage],
    [tokens.filter((t) => drawn.has(t)), buildAppDrawnMessage],
  ].filter(([group]) => group.length);

  let sent = 0;
  const dead = [];
  // One failing batch must not cost the other its send.
  await Promise.all(batches.map(async ([group, build]) => {
    try {
      const batch = await messaging.sendEachForMulticast(build({ tokens: group, ...opts }));
      sent += batch.successCount;
      dead.push(...deadTokens(group, batch));
    } catch (error) {
      console.log('Error sending message:', error);
    }
  }));
  try {
    await pruneTokens(db, user, dead);
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
  HAS_DEVICE,
  isRealPushToken,
  deviceTokens,
  deadTokens,
  sendToUser,
};
