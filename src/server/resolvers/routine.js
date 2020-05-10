/* eslint-disable no-param-reassign */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');

const { RoutineModel, RoutineType } = require('../schema/RoutineSchema');
const { RoutineItemModel } = require('../schema/RoutineItemSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');

const query = {
  routines: {
    type: GraphQLList(RoutineType),
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.find({ email }).exec();
    },
  },
  routine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOne({ id: args.id, email }).exec();
    },
  },
  routineDate: {
    type: RoutineType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const todayTasks = await RoutineModel
        .findOne({ date: args.date, email }).exec();

      const tasklist = await RoutineItemModel.find({ email }).exec();

      if (todayTasks && todayTasks.tasklist && Array.isArray(todayTasks.tasklist)) {
        const todayTasklist = todayTasks.tasklist;

        tasklist.forEach((task) => {
          const foundTask = todayTasklist
            .find((oldTask) => oldTask._id.toString() === task._id.toString());

          if (foundTask) {
            task.passed = foundTask.passed;
            task.wait = foundTask.wait;
            task.ticked = foundTask.ticked;
          }
        });

        await RoutineModel.findOneAndUpdate(
          { email, date: args.date },
          { $set: { 'tasklist': tasklist } },
          { new: true },
        ).exec();
      }

      return RoutineModel.findOne({ date: args.date, email }).exec();
    },
  },
};

const mutation = {
  addRoutine: {
    type: RoutineType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      hasEntry = await RoutineModel
        .findOne({ date: args.date, email }).exec();

      if (hasEntry && hasEntry.tasklist && Array.isArray(hasEntry.tasklist)) {
        return RoutineModel.findOne({ date: args.date, email }).exec();
      }

      let tasklist = [];

      return RoutineItemModel.find({ email }, (err, result) => {
        if (err) {
          console.log('Unable to get default Schedule.');
          throw err;
        }
        tasklist = result;
      }).then(() => {
        const routine = new RoutineModel({
          ...args,
          email,
          tasklist,
        });
        return routine.save();
      });
    },
  },
  deleteRoutine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: (root, args, context) => {
      const email = context.decodedToken && context.decodedToken.email;
      if (!email) { throw new Error('A valid authorization token is required'); }

      return RoutineModel.findOneAndRemove({ _id: args.id, email }).exec();
    },
  },
  tickRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLNonNull(GraphQLString) },
      ticked: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist.name': args.name },
        { $set: { 'tasklist.$.ticked': args.ticked } },
        { new: true },
      ).exec();
    },
  },
  passRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLNonNull(GraphQLString) },
      passed: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist.name': args.name },
        { $set: { 'tasklist.$.passed': args.passed } },
        { new: true },
      ).exec();
    },
  },
  waitRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLNonNull(GraphQLString) },
      wait: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist.name': args.name },
        { $set: { 'tasklist.$.wait': args.wait } },
        { new: true },
      ).exec();
    },
  },
};

module.exports = { query, mutation };
