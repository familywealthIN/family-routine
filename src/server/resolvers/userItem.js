const {
  GraphQLString,
  GraphQLNonNull,
} = require('graphql');

const { UserItemType, UserModel } = require('../schema/UserSchema');
const { authenticateGoogle } = require('../passport');

const query = {

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
              return (new Error('Failed to reach Google: Try Again'));
            default:
              return (new Error('something went wrong'));
          }
        }
        return (Error('server error'));
      } catch (error) {
        return error;
      }
    },
  },
};

module.exports = { query, mutation };
