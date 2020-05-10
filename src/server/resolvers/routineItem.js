const {
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');

const { RoutineItemModel, RoutineItemType } = require('../schema/RoutineItemSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');


const query = {
  routineItems: {
    type: GraphQLList(RoutineItemType),
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineItemModel.find({ email }).exec();
    },
  },
};

const mutation = {
  addRoutineItem: {
    type: RoutineItemType,
    args: {
      name: { type: GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLNonNull(GraphQLString) },
      time: { type: GraphQLNonNull(GraphQLString) },
      points: { type: GraphQLNonNull(GraphQLInt) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      const routineItem = new RoutineItemModel({
        ...args,
        email,
        passed: false,
        ticked: false,
        wait: true,
      });
      return routineItem.save();
    },
  },
  deleteRoutineItem: {
    type: RoutineItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineItemModel.findOneAndRemove({ _id: args.id, email }).exec();
    },
  },
  updateRoutineItem: {
    type: RoutineItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLNonNull(GraphQLString) },
      time: { type: GraphQLNonNull(GraphQLString) },
      points: { type: GraphQLNonNull(GraphQLInt) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineItemModel.findOneAndUpdate(
        { _id: args.id, email },
        args,
        { new: true },
      ).exec();
    },
  },
};

module.exports = { query, mutation };
