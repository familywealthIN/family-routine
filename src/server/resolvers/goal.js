/* eslint-disable no-param-reassign */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');

const {
  GoalModel,
  GoalType,
  GoalItemType,
} = require('../schema/GoalSchema');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');

const query = {
  goals: {
    type: GraphQLList(GoalType),
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.find({ email }).exec();
    },
  },
  dailyGoals: {
    type: GraphQLList(GoalType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.find({ date: args.date, email }).exec();
    },
  },
  // stackedGoals: {
  //   type: GraphQLList(GoalType),
  //   resolve: (root, args, context) => {
  //     const email = getEmailfromSession(context);

  //     return GoalModel.find({ email }).exec();
  //   },
  // },
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
      console.log(goalEntry);
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
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      isComplete: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

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
