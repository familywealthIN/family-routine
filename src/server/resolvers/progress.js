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
const { getProgressReport } = require('../utils/getProgressReport');
// const ApiError = require('../utils/ApiError');

const threshold = {
  weekDays: 5,
  monthWeeks: 3,
  yearMonths: 6,
};

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
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, args: newArgs, email,
      });

      const monthGoals = await autoCheckTaskPeriod({
        currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: threshold.monthWeeks, args: newArgs, email,
      });

      const yearGoals = await autoCheckTaskPeriod({
        currentPeriod: 'year', stepDownPeriod: 'month', cleanGoals, completionThreshold: threshold.yearMonths, args: newArgs, email,
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
};

const mutation = {
};

module.exports = { query, mutation };
