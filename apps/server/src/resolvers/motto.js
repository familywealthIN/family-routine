const {
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
} = require('graphql');

const { UserModel } = require('../schema/UserSchema');
const { MottoItemType } = require('../schema/MottoSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
// const ApiError = require('../utils/ApiError');

const query = {
  motto: {
    type: GraphQLList(MottoItemType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const user = await UserModel.findOne({ email }).exec();

      if (!user.motto) {
        UserModel.findOneAndUpdate(
          { email },
          { motto: [] },
          { new: true },
        ).exec();
      }
      return user.motto;
    },
  },
};

const mutation = {
  addMottoItem: {
    type: MottoItemType,
    args: {
      mottoItem: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const user = await UserModel.findOneAndUpdate(
        { email },
        {
          $push: {
            motto: { mottoItem: args.mottoItem },
          },
        },
        { new: true },
      ).exec();
      return user.motto && user.motto.length ? user.motto[user.motto.length - 1] : {};
    },
  },
  updateMottoItem: {
    type: MottoItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      mottoItem: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      await UserModel.findOneAndUpdate(
        { email, 'motto._id': args.id },
        {
          $set: {
            'motto.$.mottoItem': args.mottoItem,
          },
        },
        { new: true },
      ).exec();
      return { id: args.id, mottoItem: args.mottoItem };
    },
  },
  deleteMottoItem: {
    type: MottoItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      await UserModel.findOneAndUpdate(
        { email },
        {
          $pull: {
            motto: { _id: args.id },
          },
        },
        { new: true },
      ).exec();
      return { id: args.id };
    },
  },
};

module.exports = { query, mutation };
