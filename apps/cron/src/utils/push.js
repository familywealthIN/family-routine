/**
 * Push to every device a user is signed in on.
 *
 * Tokens live in `users.notificationIds` (one per device, server passport.js
 * registerPushToken); `notificationId` is the legacy single token, still read
 * until that user's next sign-in folds it into the list. A token FCM reports
 * as gone (app uninstalled, token rotated) is pruned so the list does not fill
 * with dead devices.
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
  await users.updateOne({ _id: user._id }, { $pull: { notificationIds: { $in: tokens } } });
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
  try {
    const batch = await messaging.sendEachForMulticast(buildMessage({
      tokens, title, body, data, priority, channel, category, timeSensitive,
    }));
    const dead = deadTokens(tokens, batch);
    await pruneTokens(db, user, dead);
    console.log(`Sent to ${batch.successCount}/${tokens.length} device(s) for ${user.email}${dead.length ? `, pruned ${dead.length}` : ''}`);
    return { sent: batch.successCount, pruned: dead.length };
  } catch (error) {
    console.log('Error sending message:', error);
    return { sent: 0, pruned: 0 };
  }
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
  HAS_DEVICE,
  isRealPushToken,
  deviceTokens,
  deadTokens,
  sendToUser,
};
