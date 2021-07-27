/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');
const moment = require('moment');

const {
  GoalModel,
  GoalType,
  GoalItemType,
  GoalMilestoneType,
} = require('../schema/GoalSchema');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const getGoalMilestone = require('../utils/getGoalMilestone');
const { updateStimulusEarnedPoint, removeStimulusEarnedPoint } = require('../utils/stimulusPoints');
const sortTimes = require('../utils/sortTimes');
const { RoutineModel } = require('../schema/RoutineSchema');

async function findTodayandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ date: args.date, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  return null;
}

function periodGoalDates(period, date) {
  if (period === 'week') {
    const weekNo = moment(date, 'DD-MM-YYYY').weeks();
    return moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY');
  }
  if (period === 'month') {
    return moment(date, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY');
  }
  if (period === 'year') {
    return moment(date, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY');
  }
  return date;
}

async function autoCheckTaskPeriod({
  currentPeriod, stepDownPeriod, cleanGoals, completionThreshold, args, email, gRoutineTasks = null,
}) {
  const periodGoals = await GoalModel.find({ period: currentPeriod, date: periodGoalDates(currentPeriod, args.date), email }).exec();
  periodGoals.forEach((periodGoal) => {
    periodGoal.goalItems.forEach((periodGoalItem) => {
      periodGoalItem.progress = 0;

      const dayCleanGoals = cleanGoals.filter((cleanGoal) => cleanGoal.period === stepDownPeriod);

      if (dayCleanGoals && dayCleanGoals.length) {
        dayCleanGoals.forEach(async (dayCleanGoal) => {
          const matchedDayGoal = dayCleanGoal
            .goalItems
            .find((dayGoalItem) => String(periodGoalItem.id) === String(dayGoalItem.goalRef) && dayGoalItem.isComplete);

          if (matchedDayGoal && matchedDayGoal.goalRef) {
            // Addition Logic to threshold
            periodGoalItem.progress += 1;

            if (periodGoalItem.progress === completionThreshold && !periodGoalItem.isComplete) {
              const cleanGoalsGoalItem = cleanGoals
                .find((cleanGoal) => String(cleanGoal.id) === String(periodGoal.id))
                .goalItems
                .find((cleanGoalItem) => String(cleanGoalItem.id) === String(periodGoalItem.id));

              periodGoalItem.isComplete = true;
              cleanGoalsGoalItem.isComplete = true;

              await GoalModel.findOneAndUpdate(
                {
                  date: periodGoal.date,
                  period: periodGoal.period,
                  email,
                  'goalItems._id': periodGoalItem.id,
                },
                { $set: { 'goalItems.$.isComplete': true } },
                { new: true },
              ).exec();

              // backtrack all associated task
              if (gRoutineTasks) {
                console.log('auto Check', currentPeriod);
              }
            }
          }
        });
      }
    });
  });

  return periodGoals;
}

function weekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
  return moment(d, 'DD-MM-YYYY').week() - moment(d, 'DD-MM-YYYY').startOf('month').week() + addFirstWeek;
}

const query = {
  goals: {
    type: GraphQLList(GoalType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goals = await GoalModel.find({ email }).exec();

      return goals.filter((goal) => goal.goalItems.length);
    },
  },
  dailyGoals: {
    type: GraphQLList(GoalType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const dayGoals = await GoalModel.find({ period: 'day', date: args.date, email }).exec();
      const weekGoals = await GoalModel.find({ period: 'week', date: periodGoalDates('week', args.date), email }).exec();
      const monthGoals = await GoalModel.find({ period: 'month', date: periodGoalDates('month', args.date), email }).exec();
      const yearGoals = await GoalModel.find({ period: 'year', date: periodGoalDates('year', args.date), email }).exec();
      return [
        ...dayGoals,
        ...weekGoals,
        ...monthGoals,
        ...yearGoals,
      ];
    },
  },
  agendaGoals: {
    type: GraphQLList(GoalType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const goals = await GoalModel.find({ email }).exec();

      const cleanGoals = goals.filter((goal) => goal.goalItems && goal.goalItems.length);

      const dayGoals = await GoalModel.find({ period: 'day', date: args.date, email }).exec();

      const weekGoals = await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: 5, args, email,
      });

      const monthGoals = await autoCheckTaskPeriod({
        currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: 3, args, email,
      });

      const yearGoals = await autoCheckTaskPeriod({
        currentPeriod: 'year', stepDownPeriod: 'month', cleanGoals, completionThreshold: 9, args, email,
      });

      const lifetimeGoals = await GoalModel.find({ period: 'lifetime', email }).exec();

      return [
        ...dayGoals,
        ...weekGoals,
        ...monthGoals,
        ...yearGoals,
        ...lifetimeGoals,
      ];
    },
  },
  goalMilestones: {
    type: GoalMilestoneType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goals = await GoalModel.find({ email }).exec();
      const jsonGoals = JSON.stringify(goals, null, 2);

      return getGoalMilestone(JSON.parse(jsonGoals));
    },
  },
  goalsByGroupEmail: {
    type: GraphQLList(GoalType),
    args: {
      email: { type: GraphQLNonNull(GraphQLString) },
      groupId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      await validateGroupUser(UserModel, email, args.groupId);
      await validateGroupUser(UserModel, args.email, args.groupId);

      return GoalModel
        .find({ email: args.email })
        .sort({ date: -1 })
        .limit(7)
        .exec();
    },
  },
  goal: {
    type: GoalType,
    args: {
      id: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.findOne({ id: args.id, email }).exec();
    },
  },
  goalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
          'goalItems._id': args.id,
        },
        { 'goalItems.$': 1 },
      ).exec();

      return goal.goalItems[0];
    },
  },
  goalDatePeriod: {
    type: GoalType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.findOne({ date: args.date, period: args.period || 'day', email }).exec();
    },
  },
};

const mutation = {
  addGoalItem: {
    type: GoalItemType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      body: { type: GraphQLString },
      deadline: { type: GraphQLString },
      contribution: { type: GraphQLString },
      reward: { type: GraphQLString },
      isComplete: { type: GraphQLBoolean },
      isMilestone: { type: GraphQLBoolean },
      taskRef: { type: GraphQLString },
      goalRef: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        date,
        period,
        body,
        deadline,
        contribution,
        reward,
        isComplete,
        isMilestone,
        taskRef,
        goalRef,
      } = args;

      const goalToAdd = {
        date,
        email,
        period,
        goalItems: [
          {
            body,
            deadline,
            contribution,
            reward,
            isComplete,
            isMilestone,
            taskRef,
            goalRef,
          },
        ],
      };

      const goalEntry = await GoalModel.findOne({ date: args.date, period: args.period || 'day', email }).exec();

      if (goalEntry && goalEntry.date) {
        await GoalModel.findOneAndUpdate(
          { email, date: args.date, period: args.period },
          { $set: { goalItems: [...goalEntry.goalItems, goalToAdd.goalItems[0]] } },
          { new: true },
        ).exec();
      } else {
        const goal = new GoalModel(goalToAdd);
        await goal.save();
      }

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
        },
      ).exec();

      return goal.goalItems[goal.goalItems.length - 1];
    },
  },
  updateGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      body: { type: GraphQLString },
      deadline: { type: GraphQLString },
      contribution: { type: GraphQLString },
      reward: { type: GraphQLString },
      isMilestone: { type: GraphQLBoolean },
      taskRef: { type: GraphQLString },
      goalRef: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        date,
        period,
        body,
        deadline,
        contribution,
        reward,
        isMilestone,
        taskRef,
        goalRef,
      } = args;

      await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': id,
        },
        {
          $set: {
            'goalItems.$.body': body,
            'goalItems.$.deadline': deadline,
            'goalItems.$.contribution': contribution,
            'goalItems.$.reward': reward,
            'goalItems.$.isMilestone': isMilestone,
            'goalItems.$.taskRef': taskRef,
            'goalItems.$.goalRef': goalRef,
          },
        },
        { new: true },
      ).exec();

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
        },
      ).exec();

      return goal.goalItems.find((aGoalItem) => aGoalItem.id === id);
    },
  },
  deleteGoal: {
    type: GoalType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.findOneAndRemove({ _id: args.id, email }).exec();
    },
  },
  deleteGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      await GoalModel.findOneAndUpdate(
        {
          date: args.date,
          period: args.period,
          email,
        },
        { $pull: { goalItems: { _id: args.id } } },
      ).exec();
      return args;
    },
  },
  completeGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskRef: { type: GraphQLNonNull(GraphQLString) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      isComplete: { type: GraphQLNonNull(GraphQLBoolean) },
      isMilestone: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (args.period === 'day') {
        const routine = await findTodayandSort(args, email);
        // eslint-disable-next-line no-underscore-dangle
        const task = routine.tasklist.find((t) => t._id.toString() === args.taskRef.toString());
        if (args.isComplete && args.period === 'day') {
          task.stimuli = updateStimulusEarnedPoint('K', task);
          if (args.isMilestone) {
            task.stimuli = updateStimulusEarnedPoint('G', task, args.period);
          }
        } else {
          task.stimuli = removeStimulusEarnedPoint('K', task);
        }

        await RoutineModel.findOneAndUpdate(
          { date: args.date, email, 'tasklist._id': args.taskRef },
          { $set: { 'tasklist.$.stimuli': task.stimuli } },
          { new: true },
        ).exec();
      }

      if (args.isComplete && moment(args.date, 'DD-MM-YYYY').weekday() >= 4) {
        const goals = await GoalModel.find({ email }).exec();

        const cleanGoals = goals.filter((goal) => goal.goalItems && goal.goalItems.length);
        const gRoutineTasks = new Map();
        console.log('Work on my week');

        await autoCheckTaskPeriod({
          currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: 5, args, email,
        });

        if (weekOfMonth(args.date) >= 3) {
          console.log('Work on my month');
          await autoCheckTaskPeriod({
            currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: 3, args, email,
          });
          if (moment(args.date, 'DD-MM-YYYY').month() > 8) {
            console.log('Work on my year');
            await autoCheckTaskPeriod({
              currentPeriod: 'year', stepDownPeriod: 'month', cleanGoals, completionThreshold: 9, args, email,
            });
          }
        }
      }

      await GoalModel.findOneAndUpdate(
        {
          date: args.date,
          period: args.period,
          email,
          'goalItems._id': args.id,
        },
        { $set: { 'goalItems.$.isComplete': args.isComplete } },
        { new: true },
      ).exec();
      return args;
    },
  },
};

module.exports = { query, mutation };
