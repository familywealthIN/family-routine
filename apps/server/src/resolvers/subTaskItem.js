/* eslint-disable no-underscore-dangle */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  //   GraphQLList,
  GraphQLNonNull,
} = require('graphql');

const {
  GoalModel,
  GoalItemType,
  SubTaskItemType,
} = require('../schema/GoalSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');

const query = {};

const mutation = {
  addSubTaskItem: {
    type: SubTaskItemType,
    args: {
      taskId: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      body: { type: GraphQLString },
      isComplete: { type: GraphQLBoolean },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        taskId,
        date,
        period,
        body,
      } = args;

      const subTaskToAdd = { body };

      const goalEntry = await GoalModel.findOne({
        date,
        period,
        email,
        'goalItems._id': taskId,
      }).exec();

      const previousGoalItem = goalEntry
        && goalEntry.goalItems
        && goalEntry.goalItems
          .find((goalItem) => goalItem._id.toString() === taskId.toString());

      if (previousGoalItem
          && previousGoalItem.subTasks
          && previousGoalItem.subTasks.length) {
        await GoalModel.findOneAndUpdate(
          {
            date,
            period,
            email,
            'goalItems._id': taskId,
          },
          { $set: { 'goalItems.$.subTasks': [...previousGoalItem.subTasks, subTaskToAdd] } },
          { new: true },
        ).exec();
      } else {
        await GoalModel.findOneAndUpdate(
          {
            date,
            period,
            email,
            'goalItems._id': args.taskId,
          },
          {
            $set: {
              'goalItems.$.subTasks': [subTaskToAdd],
            },
          },
          { new: true },
        ).exec();
      }

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
        },
        {
          goalItems: {
            $elemMatch: {
              _id: args.taskId,
            },
          },
        },
      ).exec();

      return goal.goalItems[0].subTasks[goal.goalItems[0].subTasks.length - 1];
    },
  },
  updateSubTaskItem: {
    type: SubTaskItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      body: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        date,
        period,
        body,
        taskId,
      } = args;

      await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskId,
          'goalItems.subTasks._id': id,
        },
        {
          $set: {
            'goalItems.$.subTasks.0.body': body,
          },
        },
        { new: true },
      ).exec();

      return null;
    },
  },
  deleteSubTaskItem: {
    type: SubTaskItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        taskId,
        date,
        period,
      } = args;

      const goalEntry = await GoalModel.findOne({
        date,
        period,
        email,
      },
      {
        goalItems: {
          $elemMatch: {
            _id: args.taskId,
          },
        },
      }).exec();

      const previousGoalItem = goalEntry
        && goalEntry.goalItems
        && goalEntry.goalItems
          .find((goalItem) => goalItem._id.toString() === taskId.toString());

      if (previousGoalItem
          && previousGoalItem.subTasks
          && previousGoalItem.subTasks.length) {
        const returnSubTasks = previousGoalItem.subTasks
          .find((subTask) => subTask._id.toString() === id.toString());

        const filteredSubTasks = previousGoalItem.subTasks
          .filter((subTask) => subTask._id.toString() !== id.toString());

        await GoalModel.findOneAndUpdate(
          {
            date: args.date,
            period: args.period,
            email,
            'goalItems._id': args.taskId,
          },
          { $set: { 'goalItems.$.subTasks': filteredSubTasks } },
          { new: true },
        ).exec();

        return returnSubTasks;
      }

      return args;
    },
  },
  completeSubTaskItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      isComplete: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        taskId,
        date,
        period,
        isComplete,
      } = args;

      const goalEntry = await GoalModel.findOne({
        date,
        period,
        email,
      },
      {
        goalItems: {
          $elemMatch: {
            _id: args.taskId,
          },
        },
      }).exec();

      const previousGoalItem = goalEntry
        && goalEntry.goalItems
        && goalEntry.goalItems
          .find((goalItem) => goalItem._id.toString() === taskId.toString());

      if (previousGoalItem
          && previousGoalItem.subTasks
          && previousGoalItem.subTasks.length) {
        let returnSubTasks = {};
        const updatedSubTasks = previousGoalItem.subTasks
          .map((subTask) => {
            if (subTask._id.toString() === id.toString()) {
              returnSubTasks = {
                _id: subTask._id,
                body: subTask.body,
                isComplete,
              };
              return returnSubTasks;
            }
            return subTask;
          });

        await GoalModel.findOneAndUpdate(
          {
            date: args.date,
            period: args.period,
            email,
            'goalItems._id': args.taskId,
          },
          { $set: { 'goalItems.$.subTasks': updatedSubTasks } },
          { new: true },
        ).exec();

        return returnSubTasks;
      }

      return args;
    },
  },
};

module.exports = { query, mutation };
