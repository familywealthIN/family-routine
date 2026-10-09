const {
  GraphQLString,
  GraphQLNonNull,
} = require('graphql');

const { UserModel } = require('../schema/UserSchema');
const { GoalModel } = require('../schema/GoalSchema');
const { autoCheckTaskPeriod } = require('./goal');
const { RoutineModel } = require('../schema/RoutineSchema');
const { ProgressType } = require('../schema/ProgressSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const { getProgressReport, threshold } = require('../utils/getProgressReport');
const { RoutineTimingType } = require('../schema/RoutineTimingSchema');
const { datesBetween, summariseTiming } = require('../utils/routineTiming');
// const ApiError = require('../utils/ApiError');

const query = {
  getProgress: {
    type: ProgressType,
    args: {
      period: { type: GraphQLNonNull(GraphQLString) },
      startDate: { type: GraphQLNonNull(GraphQLString) },
      endDate: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const user = await UserModel.findOne({ email }).exec();
      const routines = await RoutineModel.find({ email }).exec();
      const unfilteredGoals = await GoalModel.find({ email }).exec();

      const newArgs = { ...args };

      newArgs.date = args.endDate;

      const cleanGoals = unfilteredGoals
        .filter((goal) => goal && goal.goalItems && goal.goalItems.length);
      const dailyTasks = cleanGoals.filter((goal) => goal.period && goal.period === 'day');

      const dayGoals = await GoalModel.find({ period: 'day', date: args.endDate, email }).exec();

      const weekGoals = await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, date: newArgs.date, email,
      });

      const monthGoals = await autoCheckTaskPeriod({
        currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: threshold.monthWeeks, date: newArgs.date, email,
      });

      const yearGoals = await autoCheckTaskPeriod({
        currentPeriod: 'year', stepDownPeriod: 'month', cleanGoals, completionThreshold: threshold.yearMonths, date: newArgs.date, email,
      });

      const goals = [
        ...dayGoals,
        ...weekGoals,
        ...monthGoals,
        ...yearGoals,
      ];

      const { period, startDate, endDate } = args;

      return getProgressReport({
        routines,
        goals,
        dailyTasks,
        user,
        period,
        startDate,
        endDate,
      });
    },
  },
  // On time, late and missed check-ins for a date range: the drawer's day
  // ribbon and the Progress page's Timing card. Only the range's own day
  // documents are read, and nothing is written.
  routineTiming: {
    type: RoutineTimingType,
    args: {
      startDate: { type: GraphQLNonNull(GraphQLString) },
      endDate: { type: GraphQLNonNull(GraphQLString) },
      // The user's own today (DD-MM-YYYY): the server clock is UTC.
      today: { type: GraphQLString },
    },
    resolve: async (root, { startDate, endDate, today }, context) => {
      const email = getEmailfromSession(context);
      const dates = datesBetween(startDate, endDate);
      const routines = dates.length
        ? await RoutineModel.find({ email, date: { $in: dates } }).lean().exec()
        : [];
      return summariseTiming({
        routines, startDate, endDate, today,
      });
    },
  },
};

const mutation = {
};

module.exports = { query, mutation };
