/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');
const moment = require('moment');

const { RoutineModel, RoutineType } = require('../schema/RoutineSchema');
const { RoutineItemModel } = require('../schema/RoutineItemSchema');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const sortTimes = require('../utils/sortTimes');
const { updateStimulusEarnedPoint } = require('../utils/stimulusPoints');

async function findTodayandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ date: args.date, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  return null;
}

async function findIdandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ _id: args.id, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  return null;
}

async function getSkipDayCount(email) {
  const weekNo = moment().weeks();
  const currentDayIndex = moment().weeks(weekNo).weekday();
  let i = 0;
  const promises = [];
  while (i <= currentDayIndex) {
    const currentDate = moment().weeks(weekNo).weekday(i).format('DD-MM-YYYY');
    promises.push(RoutineModel.findOne({ date: currentDate, email }).exec());
    i += 1;
  }
  const selectedRoutines = await Promise.all(promises);

  const skipDayCount = selectedRoutines.reduce((acc, selectedItem) => {
    if ((selectedItem && selectedItem.skip) || selectedItem === null) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return skipDayCount;
}

function timeDiff(time, nextTime) {
  const [startHour] = time.split(':');
  const [endHour] = nextTime.split(':');

  const taskTime = (endHour - startHour);

  return taskTime > 2 ? taskTime : 2;
}

function buildStimuliForRoutineItem(taskId, tasklist) {
  const taskIndex = tasklist.findIndex((task) => task._id.toString() === taskId.toString());

  const { time } = tasklist[taskIndex];
  const nextTime = tasklist[taskIndex + 1] ? tasklist[taskIndex + 1].time : '24:00';

  return [
    {
      name: 'D',
      splitRate: timeDiff(time, nextTime),
      earned: 0,
    },
    {
      name: 'K',
      splitRate: 2,
      earned: 0,
    },
    {
      name: 'G',
      splitRate: 4, // 4 divided in day, week, month and year. the value not used
      earned: 0,
    },
  ];
}

const query = {
  routines: {
    type: GraphQLList(RoutineType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const routines = await RoutineModel.find({
        email,
        skip: { $ne: true },
      }).exec();

      routines.forEach((routine) => sortTimes(routine.tasklist));

      return routines;
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

      const routines = await RoutineModel
        .find({ email: args.email, skip: { $ne: true } })
        .sort({ $natural: -1 })
        .limit(7)
        .exec();

      routines.forEach((routine) => sortTimes(routine.tasklist));

      return routines;
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

        sortTimes(tasklist);

        tasklist.forEach((task) => {
          const foundTask = todayTasklist
            // eslint-disable-next-line no-underscore-dangle
            .find((oldTask) => oldTask._id.toString() === task._id.toString());

          if (foundTask) {
            task.passed = foundTask.passed;
            task.wait = foundTask.wait;
            task.ticked = foundTask.ticked;
            task.stimuli = foundTask.stimuli && foundTask.stimuli.length
              ? foundTask.stimuli
              : buildStimuliForRoutineItem(task._id, tasklist);
          } else {
            task.stimuli = buildStimuliForRoutineItem(task._id, tasklist);
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
      sortTimes(tasklist);
      tasklist.forEach((task) => {
        task.stimuli = buildStimuliForRoutineItem(task._id, tasklist);
      });
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
      taskId: { type: GraphQLNonNull(GraphQLString) },
      ticked: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const routine = await findIdandSort(args, email);
      const task = routine.tasklist.find((t) => t._id.toString() === args.taskId.toString());
      task.stimuli = updateStimulusEarnedPoint('D', task);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist._id': args.taskId },
        { $set: { 'tasklist.$.ticked': args.ticked, 'tasklist.$.stimuli': task.stimuli } },
        { new: true },
      ).exec();
    },
  },
  skipRoutine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      skip: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const skipDays = await getSkipDayCount(email);
      if (skipDays >= 2 && args.skip) {
        throw new Error('You have already skip 2 days this week.');
      }

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email },
        { skip: args.skip },
        { new: true },
      ).exec();
    },
  },
  passRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLString) },
      ticked: { type: GraphQLNonNull(GraphQLBoolean) },
      passed: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const routine = await RoutineModel
        .findOne({ _id: args.id, email }).exec();
      const taskToUpdate = routine.tasklist.find((task) => task.id === args.taskId);
      if (args.ticked || (taskToUpdate && taskToUpdate.ticked)) {
        return routine;
      }

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist._id': args.taskId },
        { $set: { 'tasklist.$.passed': args.passed } },
        { new: true },
      ).exec();
    },
  },
  waitRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLString) },
      wait: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist._id': args.taskId },
        { $set: { 'tasklist.$.wait': args.wait } },
        { new: true },
      ).exec();
    },
  },
};

module.exports = { query, mutation };
