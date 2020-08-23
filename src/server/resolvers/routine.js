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
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');

function sortTimes(array) {
  return array.sort((a, b) => {
    const [aHours, aMinutes] = a.time.split(':');
    const [bHours, bMinutes] = b.time.split(':');

    if (parseInt(aHours, 10) - parseInt(bHours, 10) === 0) {
      return parseInt(aMinutes, 10) - parseInt(bMinutes, 10);
    }
    return parseInt(aHours, 10) - parseInt(bHours, 10);
  });
}

async function findTodayandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ date: args.date, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  return null;
}

const query = {
  routines: {
    type: GraphQLList(RoutineType),
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.find({ email }).exec();
    },
  },
  routinesByGroupEmail: {
    type: GraphQLList(RoutineType),
    args: {
      email: { type: GraphQLNonNull(GraphQLString) },
      groupId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      await validateGroupUser(UserModel, email, args.groupId);
      await validateGroupUser(UserModel, args.email, args.groupId);

      return RoutineModel
        .find({ email: args.email })
        .sort({ $natural: -1 })
        .limit(7)
        .exec();
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
            // eslint-disable-next-line no-underscore-dangle
            .find((oldTask) => oldTask._id.toString() === task._id.toString());

          if (foundTask) {
            task.passed = foundTask.passed;
            task.wait = foundTask.wait;
            task.ticked = foundTask.ticked;
          }
        });

        await RoutineModel.findOneAndUpdate(
          { email, date: args.date },
          { $set: { tasklist } },
          { new: true },
        ).exec();
      }

      return findTodayandSort(args, email);
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

      const hasEntry = await RoutineModel
        .findOne({ date: args.date, email }).exec();

      if (hasEntry && hasEntry.tasklist && Array.isArray(hasEntry.tasklist)) {
        return findTodayandSort(args, email);
      }

      const tasklist = await RoutineItemModel.find({ email });
      const routine = new RoutineModel({
        ...args,
        email,
        tasklist,
      });

      await routine.save();
      return findTodayandSort(args, email);
    },
  },
  deleteRoutine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

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
      ticked: { type: GraphQLNonNull(GraphQLBoolean) },
      passed: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);
      if (args.ticked) {
        return null;
      }

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
