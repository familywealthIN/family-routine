const {
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLInt,
} = require('graphql');

const uniqid = require('uniqid');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { UserItemType, UserModel } = require('../schema/UserSchema');
const {
  NotificationPrefsType, NotificationPrefsInput, withDefaults, sanitizePrefs,
} = require('../schema/NotificationPrefsSchema');
const {
  authenticateGoogle, authenticateApple, isRealPushToken, unbindPushToken, registerPushToken,
} = require('../passport');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const ApiError = require('../utils/ApiError');
const { RoutineModel } = require('../schema/RoutineSchema');
const { RoutineItemModel } = require('../schema/RoutineItemSchema');
const { GoalModel } = require('../schema/GoalSchema');
const { ProgressModel } = require('../schema/ProgressSchema');
const { ReferralModel } = require('../schema/ReferralSchema');
const { AgentModel } = require('../schema/AgentSchema');
const { RoutineChatMessageModel } = require('../schema/RoutineChatSchema');
const { XpTransactionModel } = require('../schema/XpTransactionSchema');
const { grantWelcomePoints } = require('../utils/xpLedger');
const { getLocalDate } = require('../utils/timezone');
const {
  DEFAULT_DAYS, MAX_ALARMS, aiLevel, addDays, planDeviceAlarms,
} = require('../utils/deviceAlarms');

/** `sendInvite` stores the session email as typed — match addresses case-insensitively. */
const sameEmail = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();

/** An exact, case-insensitive email match for a Mongo filter (regex-escaped). */
const emailMatcher = (email) => {
  const escaped = String(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
};

/**
 * The only fields an inviter may see of the person they invited — the invitee
 * has not joined yet, so nothing beyond what the pending row draws.
 */
const inviteeView = (user) => ({
  email: user.email,
  name: user.name || '',
  picture: user.picture || '',
});

const DeviceAlarmType = new GraphQLObjectType({
  name: 'DeviceAlarm',
  fields: {
    routineId: { type: GraphQLString },
    time: { type: GraphQLString },
    date: { type: GraphQLString },
    fireAt: { type: GraphQLString },
    title: { type: GraphQLString },
    button: { type: GraphQLString },
    buttonTitle: { type: GraphQLString },
    repeat: { type: GraphQLBoolean },
  },
});

const DeviceAlarmPlanType = new GraphQLObjectType({
  name: 'DeviceAlarmPlan',
  fields: {
    through: { type: GraphQLString },
    alarms: { type: new GraphQLList(DeviceAlarmType) },
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTEXT_DAYS = 30; // as apps/cron send-notification.js
// An ActivityKit push-to-start token: hex, 32 bytes or so.
const isStartToken = (token) => typeof token === 'string' && /^[0-9a-f]{32,256}$/i.test(token);

/** Per routine, how much AI it has: what decides its notification button. */
async function aiLevels(email, routineIds, now) {
  if (!routineIds.length) return {};
  const [agents, chats, goals] = await Promise.all([
    AgentModel.find({ email, taskRef: { $in: routineIds } }, { taskRef: 1 }).lean().exec(),
    RoutineChatMessageModel.find({
      email, taskRef: { $in: routineIds }, from: 'me', createdAt: { $gte: new Date(now.getTime() - CONTEXT_DAYS * DAY_MS) },
    }, { taskRef: 1 }).lean().exec(),
    GoalModel.find({ email, 'goalItems.taskRef': { $in: routineIds } }, { 'goalItems.taskRef': 1 }).lean().exec(),
  ]);
  const withAgent = new Set(agents.map((a) => String(a.taskRef)));
  const withContext = new Set([
    ...chats.map((c) => String(c.taskRef)),
    ...goals.flatMap((g) => (g.goalItems || []).map((i) => String(i.taskRef))),
  ]);
  return Object.fromEntries(routineIds.map((id) => [id, aiLevel({
    hasAgent: withAgent.has(id), hasAiContext: withContext.has(id),
  })]));
}

const query = {
  /**
   * The alarms this user's iPhone should ring itself over the next days
   * (AlarmKit), for routines set to Alarm. See utils/deviceAlarms.js.
   */
  deviceAlarms: {
    type: DeviceAlarmPlanType,
    args: {
      days: { type: GraphQLInt },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      if (!email) throw new ApiError(401, '401:Authentication required');
      const days = Math.min(Math.max(args.days || DEFAULT_DAYS, 1), 14);
      const now = new Date();
      const user = await UserModel.findOne({ email }, { timezone: 1 }).lean().exec();
      const timezone = user && user.timezone;
      const today = getLocalDate(timezone, now);
      const items = await RoutineItemModel.find({ email, notifyMode: 'alarm' }).exec();
      const dates = Array.from({ length: days }, (_, n) => addDays(today, n));
      const routines = items.length
        ? await RoutineModel.find(
          { email, date: { $in: dates } },
          { date: 1, skip: 1, 'tasklist._id': 1, 'tasklist.ticked': 1 },
        ).lean().exec()
        : [];
      const levels = await aiLevels(email, items.map((i) => String(i._id)), now);
      const plan = planDeviceAlarms({
        items, routines, levels, today, timezone, now, days,
      });
      return { through: plan.through.toISOString(), alarms: plan.alarms };
    },
  },
  notificationPrefs: {
    type: NotificationPrefsType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const user = await UserModel.findOne({ email }, { notificationPrefs: 1 }).exec();
      return withDefaults(user && user.notificationPrefs);
    },
  },
  getUserTags: {
    type: UserItemType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const user = await UserModel.findOne({ email }).exec();
      if (!user) return null;

      // Check if OAuth is connected
      const oauthConnected = !!(user.oauth && user.oauth.accessToken);

      return {
        ...user.toObject(),
        oauthConnected,
      };
    },
  },
  showInvite: {
    type: UserItemType,
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return UserModel.findOne({ email }).exec();
    },
  },
  getUsersByGroupId: {
    type: GraphQLList(UserItemType),
    args: {
      groupId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      await validateGroupUser(UserModel, email, args.groupId);

      if (!args.groupId) {
        return [];
      }

      return UserModel.find({ groupId: args.groupId }).exec();
    },
  },
  /**
   * Invites the caller has sent that are still open: users whose
   * `inviterEmail` is the caller and who have not joined the caller's group.
   * Accepting or declining clears `inviterEmail`, so a declined invite drops
   * out here and stops holding a member slot. Only email/name/picture leave.
   */
  pendingInvites: {
    type: GraphQLList(UserItemType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const me = await UserModel.findOne({ email }).exec();
      const groupId = (me && me.groupId) || '';

      const invitees = await UserModel.find(
        { inviterEmail: emailMatcher(email) },
        'email name picture groupId inviterEmail',
      ).exec();

      return (invitees || [])
        .filter((user) => user && user.email && !sameEmail(user.email, email))
        .filter((user) => sameEmail(user.inviterEmail, email))
        .filter((user) => !groupId || user.groupId !== groupId)
        .map(inviteeView);
    },
  },
};

const mutation = {
  authGoogle: {
    type: UserItemType,
    args: {
      accessToken: { type: GraphQLNonNull(GraphQLString) },
      notificationId: { type: GraphQLNonNull(GraphQLString) },
      timezone: { type: GraphQLString },
    },
    resolve: async (root, args) => {
      const req = {};
      req.body = {
        credential: args.accessToken, // Use the JWT credential from Google Identity Services
      };

      try {
        // data contains the profile from Google Identity Services
        const { data, info } = await authenticateGoogle(req);
        if (data) {
          const user = await UserModel.upsertGoogleUser(data, args.notificationId, args.timezone);
          console.log('new user', user.tags);
          if (user) {
            return ({
              id: user.id,
              email: user.email,
              name: user.name,
              // eslint-disable-next-line no-underscore-dangle
              picture: data.profile._json.picture,
              token: user.generateJWT(),
              needsOnboarding: user.needsOnboarding || false,
              motto: [],
              tags: user.tags || [],
            });
          }
        }

        if (info) {
          switch (info.code) {
            case 'ETIMEDOUT':
              return (new ApiError(500, '500:Failed to reach Google: Try Again'));
            default:
              return (new ApiError(500, '500:something went wrong'));
          }
        }
        return (new ApiError(500, '500:server error'));
      } catch (error) {
        return error;
      }
    },
  },

  authApple: {
    type: UserItemType,
    args: {
      identityToken: { type: GraphQLNonNull(GraphQLString) },
      notificationId: { type: GraphQLNonNull(GraphQLString) },
      timezone: { type: GraphQLString },
      /**
       * Apple's real name, which only the client ever sees: it comes back in
       * the authorization response of the FIRST sign-in for an Apple ID and is
       * never in the identity token. Optional — on every later sign-in, and on
       * a reinstall, there is nothing to send.
       */
      name: { type: GraphQLString },
    },
    resolve: async (root, args) => {
      const req = {};
      req.body = {
        identityToken: args.identityToken,
        name: args.name,
      };

      try {
        const { data, info } = await authenticateApple(req);
        if (data) {
          const user = await UserModel.upsertAppleUser(data, args.notificationId, args.timezone);
          console.log('new apple user', user.tags);
          if (user) {
            return ({
              id: user.id,
              email: user.email,
              name: user.name,
              picture: (data.profile._json && data.profile._json.picture) || '', // eslint-disable-line no-underscore-dangle
              token: user.generateJWT(),
              needsOnboarding: user.needsOnboarding || false,
              motto: [],
              tags: user.tags || [],
            });
          }
        }

        if (info) {
          switch (info.code) {
            case 'ETIMEDOUT':
              return (new ApiError(500, '500:Failed to reach Apple: Try Again'));
            default:
              return (new ApiError(500, '500:something went wrong'));
          }
        }
        return (new ApiError(500, '500:server error'));
      } catch (error) {
        console.error('Apple auth error:', error);
        return new ApiError(500, `500:Apple authentication failed: ${error.message}`);
      }
    },
  },
  sendInvite: {
    type: UserItemType,
    args: {
      invitedEmail: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const invitedUser = await UserModel.findOne({ email: args.invitedEmail }).exec();

      if (!invitedUser) {
        throw new ApiError(403, '403:User Not Found');
      }
      const { groupId } = await UserModel.findOne({ email }).exec();

      if (!groupId) {
        const newGroupId = uniqid();
        await UserModel.findOneAndUpdate(
          { email },
          { groupId: newGroupId },
          { new: true },
        );
      }

      return UserModel.findOneAndUpdate(
        { email: args.invitedEmail },
        { inviterEmail: email },
        { new: true },
      );
    },
  },
  /**
   * Withdraw an invite the caller sent. Clears the invitee's `inviterEmail`
   * only when the caller is the one who invited them; never touches anyone's
   * `groupId`. Unknown address or someone else's invite -> 403.
   */
  cancelInvite: {
    type: UserItemType,
    args: {
      invitedEmail: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const invitee = await UserModel.findOne({ email: emailMatcher(args.invitedEmail) }).exec();

      if (!invitee || !sameEmail(invitee.inviterEmail, email)) {
        throw new ApiError(403, '403:Invite Not Found');
      }

      // Conditional on the invite still being ours: an accept/decline (or a
      // re-invite from someone else) racing this must not be overwritten.
      const updated = await UserModel.findOneAndUpdate(
        { _id: invitee._id, inviterEmail: invitee.inviterEmail },
        { inviterEmail: '' },
        { new: true },
      );

      if (!updated) {
        throw new ApiError(403, '403:Invite Not Found');
      }

      return { ...inviteeView(updated), inviterEmail: '' };
    },
  },
  acceptInvite: {
    type: UserItemType,
    args: {
      inviterEmail: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const { inviterEmail } = await UserModel.findOne({ email }).exec();

      if (inviterEmail !== args.inviterEmail) {
        throw new ApiError(403, '403:Group Not Found');
      }

      const { groupId } = await UserModel.findOne({ email: inviterEmail }).exec();

      if (!groupId) {
        throw new ApiError(403, '403:Group Not Found');
      }

      // Record the referral (points reward). One lifetime referral per
      // invitee (unique inviteeEmail) — re-invites and group-hopping never
      // create a second pending reward. Credited only after the invitee has
      // 3 settled nonzero-earning days (see xpLedger.maybeRewardReferral).
      if (inviterEmail !== email) {
        try {
          await ReferralModel.updateOne(
            { inviteeEmail: email },
            { $setOnInsert: { inviterEmail, status: 'pending', createdAt: new Date() } },
            { upsert: true },
          ).exec();
        } catch (err) {
          if (!err || err.code !== 11000) throw err;
        }
      }

      return UserModel.findOneAndUpdate(
        { email },
        { groupId, inviterEmail: '' },
        { new: true },
      );
    },
  },
  declineInvite: {
    type: UserItemType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      return UserModel.findOneAndUpdate(
        { email },
        { inviterEmail: '' },
        { new: true },
      );
    },
  },
  leaveGroup: {
    type: UserItemType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      return UserModel.findOneAndUpdate(
        { email },
        { groupId: '' },
        { new: true },
      );
    },
  },
  generateApiKey: {
    type: UserItemType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (!email) {
        throw new ApiError(401, '401:Authentication required');
      }

      // Generate a unique API key
      const apiKey = `frt_${uuidv4()}`;

      return UserModel.findOneAndUpdate(
        { email },
        { apiKey },
        { new: true },
      );
    },
  },
  generateOAuthCode: {
    type: new GraphQLObjectType({
      name: 'OAuthCodeType',
      fields: {
        authCode: { type: GraphQLString },
        expiresAt: { type: GraphQLString },
      },
    }),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (!email) {
        throw new ApiError(401, '401:Authentication required');
      }

      // Generate a unique authorization code
      const authCode = `oac_${crypto.randomBytes(32).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store the auth code temporarily
      await UserModel.findOneAndUpdate(
        { email },
        {
          oauth: {
            authCode,
            expiresAt,
          },
        },
        { new: true },
      );

      return {
        authCode,
        expiresAt: expiresAt.toISOString(),
      };
    },
  },
  /**
   * Sign-out: stop pushing to this device. Deliberately needs no session —
   * the device is signing out, its JWT may already be expired (60 days), and a
   * release queued while offline is retried after the token is gone. Only this
   * exact device token is removed, so the user's other signed-in devices keep
   * their reminders, and knowing a token silences that one device only.
   */
  releaseNotificationToken: {
    type: GraphQLBoolean,
    args: {
      notificationId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args) => {
      if (!isRealPushToken(args.notificationId)) return false;
      await unbindPushToken(UserModel, args.notificationId);
      return true;
    },
  },
  /**
   * A signed-in device reports its push token: on every app start (so devices
   * signed in before multi-device support register themselves) and whenever
   * FCM / APNs rotates it. Sign-in registers it too, via authGoogle/authApple.
   */
  registerNotificationToken: {
    type: GraphQLBoolean,
    args: {
      notificationId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      if (!email) throw new ApiError(401, '401:Authentication required');
      if (!isRealPushToken(args.notificationId)) return false;
      const user = await UserModel.findOne(
        { email },
        { _id: 1, notificationId: 1, notificationIds: 1 },
      ).exec();
      if (!user) return false;
      await registerPushToken(UserModel, user, args.notificationId);
      return true;
    },
  },
  /**
   * This device's app draws routine cues with their buttons itself (the
   * Android build with RoutineNotification.java), so the cron may send it
   * cues data-only. Its own mutation so an app calling it on an older server
   * only loses this, never the device registration. Only for a token already
   * registered to this user.
   */
  registerNotificationActions: {
    type: GraphQLBoolean,
    args: {
      notificationId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      if (!email) throw new ApiError(401, '401:Authentication required');
      if (!isRealPushToken(args.notificationId)) return false;
      await UserModel.updateOne(
        { email, notificationIds: args.notificationId },
        { $addToSet: { notificationActionTokens: args.notificationId } },
      ).exec();
      return true;
    },
  },
  /**
   * This iPhone shows routine cues as a Live Activity with tappable buttons
   * (iOS 17.2+), started by the cron with this ActivityKit push-to-start token.
   * No token (Live Activities turned off) takes it back, and the phone gets
   * the plain notification again. Only for a device already registered here.
   */
  registerLiveActivity: {
    type: GraphQLBoolean,
    args: {
      notificationId: { type: GraphQLNonNull(GraphQLString) },
      startToken: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      if (!email) throw new ApiError(401, '401:Authentication required');
      const device = args.notificationId;
      if (!isRealPushToken(device)) return false;
      if (args.startToken && !isStartToken(args.startToken)) return false;
      // $pull then $push: one update cannot do both to the same array.
      await UserModel.updateOne(
        { email },
        { $pull: { liveActivityTokens: { device } } },
      ).exec();
      if (!args.startToken) return true;
      await UserModel.updateOne(
        { email, notificationIds: device },
        { $push: { liveActivityTokens: { device, start: args.startToken.toLowerCase() } } },
      ).exec();
      return true;
    },
  },
  /**
   * This iPhone has the alarms from deviceAlarms scheduled up to `through`
   * (AlarmKit, iOS 26+) for `routines`, each "routineId@HH:mm" (alarmKey).
   * Until then the cron sends it no alarm push for those. A routine set to
   * Alarm or moved since is not on the list, so its push still comes. No
   * `through` (alarms not allowed) takes it back.
   */
  registerAlarmDevice: {
    type: GraphQLBoolean,
    args: {
      notificationId: { type: GraphQLNonNull(GraphQLString) },
      through: { type: GraphQLString },
      routines: { type: new GraphQLList(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      if (!email) throw new ApiError(401, '401:Authentication required');
      const device = args.notificationId;
      if (!isRealPushToken(device)) return false;
      const through = args.through ? new Date(args.through) : null;
      if (through && Number.isNaN(through.getTime())) return false;
      await UserModel.updateOne(
        { email },
        { $pull: { alarmDevices: { device } } },
      ).exec();
      if (!through) return true;
      await UserModel.updateOne(
        { email, notificationIds: device },
        {
          $push: {
            alarmDevices: {
              device,
              through,
              routines: (args.routines || []).filter((r) => typeof r === 'string').slice(0, MAX_ALARMS),
            },
          },
        },
      ).exec();
      return true;
    },
  },
  updateNotificationPrefs: {
    type: NotificationPrefsType,
    args: {
      prefs: { type: GraphQLNonNull(NotificationPrefsInput) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const clean = sanitizePrefs(args.prefs);
      const set = Object.keys(clean).reduce(
        (out, key) => ({ ...out, [`notificationPrefs.${key}`]: clean[key] }),
        {},
      );
      const user = Object.keys(set).length
        ? await UserModel.findOneAndUpdate({ email }, { $set: set }, { new: true }).exec()
        : await UserModel.findOne({ email }, { notificationPrefs: 1 }).exec();
      return withDefaults(user && user.notificationPrefs);
    },
  },
  updateUserTimezone: {
    type: UserItemType,
    args: {
      timezone: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (!email) {
        throw new ApiError(401, '401:Authentication required');
      }

      return UserModel.findOneAndUpdate(
        { email },
        { timezone: args.timezone },
        { new: true },
      );
    },
  },
  completeOnboarding: {
    type: UserItemType,
    args: {
      name: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (!email) {
        throw new ApiError(401, '401:Authentication required');
      }

      const update = { needsOnboarding: false };
      const trimmedName = (args.name || '').trim();
      // Only persist a supplied name if it's a real name, not the Apple
      // placeholder. Keeps the server side idempotent when the wizard
      // runs without a name capture step.
      if (trimmedName && trimmedName.toLowerCase() !== 'apple user') {
        update.name = trimmedName;
      }

      const user = await UserModel.findOneAndUpdate(
        { email },
        update,
        { new: true },
      );

      // Welcome grant: 300 pre-settled points so the first passed task is a
      // working diamond moment, not a paywall. Idempotent (refKey 'welcome')
      // even if the wizard re-submits.
      try {
        await grantWelcomePoints(email, user && user.timezone);
      } catch (err) {
        // Never block onboarding on a ledger hiccup.
        console.error('welcome grant failed:', err.message);
      }

      return user;
    },
  },
  deleteAccount: {
    type: new GraphQLObjectType({
      name: 'DeleteAccountResponse',
      fields: {
        success: { type: GraphQLString },
        message: { type: GraphQLString },
      },
    }),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (!email) {
        throw new ApiError(401, '401:Authentication required');
      }

      try {
        // Every collection keyed by the user's email. The privacy policy
        // promises deletion removes all of it, so a new user-owned collection
        // must be added here too.
        await Promise.all([
          RoutineModel.deleteMany({ email }),
          RoutineItemModel.deleteMany({ email }),
          GoalModel.deleteMany({ email }),
          ProgressModel.deleteMany({ email }),
          AgentModel.deleteMany({ email }),
          RoutineChatMessageModel.deleteMany({ email }),
          XpTransactionModel.deleteMany({ email }),
          ReferralModel.deleteMany({ $or: [{ inviterEmail: email }, { inviteeEmail: email }] }),
          UserModel.deleteOne({ email }),
        ]);

        console.log(`Account deleted successfully for user: ${email}`);

        return {
          success: 'true',
          message: 'Your account and all associated data have been permanently deleted.',
        };
      } catch (error) {
        console.error('Error deleting account:', error);
        throw new ApiError(500, '500:Failed to delete account');
      }
    },
  },
};

module.exports = { query, mutation };
