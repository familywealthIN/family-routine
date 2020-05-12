const {
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
} = require('graphql');

const uniqid = require('uniqid');

const { UserItemType, UserModel } = require('../schema/UserSchema');
const { authenticateGoogle } = require('../passport');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const ApiError = require('../utils/ApiError');

const query = {
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
};

const mutation = {
  authGoogle: {
    type: UserItemType,
    args: {
      accessToken: { type: GraphQLNonNull(GraphQLString) },
      notificationId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args) => {
      const req = {};
      req.body = {
        refresh_token: '1//04d_9GYHHnr8qCgYIARAAGAQSNwF-L9IrOWpiBFvg_ok6Vvf6BtkySJg5Ezv7LDfdfXKfYE7aJa0A9lxMZMZq_4WvCPNy-tHjrgI',
        access_token: args.accessToken,
      };

      try {
        // data contains the accessToken, refreshToken and profile from passport
        const { data, info } = await authenticateGoogle(req);
        if (data) {
          const user = await UserModel.upsertGoogleUser(data, args.notificationId);
          if (user) {
            return ({
              id: user.id,
              email: user.email,
              name: user.name,
              // eslint-disable-next-line no-underscore-dangle
              picture: data.profile._json.picture,
              token: user.generateJWT(),
              isNew: user.isNew || false,
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
        return (ApiError(500, '500:server error'));
      } catch (error) {
        return error;
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
};

module.exports = { query, mutation };
