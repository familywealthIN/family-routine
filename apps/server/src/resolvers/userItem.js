const {
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLObjectType,
} = require('graphql');

const uniqid = require('uniqid');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { UserItemType, UserModel } = require('../schema/UserSchema');
const { authenticateGoogle, authenticateApple } = require('../passport');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const ApiError = require('../utils/ApiError');
const { RoutineModel } = require('../schema/RoutineSchema');
const { RoutineItemModel } = require('../schema/RoutineItemSchema');
const { GoalModel } = require('../schema/GoalSchema');
const { ProgressModel } = require('../schema/ProgressSchema');
const { ReferralModel } = require('../schema/ReferralSchema');
const { grantWelcomePoints } = require('../utils/xpLedger');

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

const query = {
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
        // Delete all user data in parallel
        await Promise.all([
          // Delete user routines
          RoutineModel.deleteMany({ email }),
          // Delete user routine items
          RoutineItemModel.deleteMany({ email }),
          // Delete user goals
          GoalModel.deleteMany({ email }),
          // Delete user progress
          ProgressModel.deleteMany({ email }),
          // Finally, delete the user account
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
