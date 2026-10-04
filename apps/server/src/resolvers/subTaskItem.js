/* eslint-disable no-underscore-dangle */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
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
    /**
     * Rename one sub-task.
     *
     * Previously this wrote `goalItems.$.subTasks.0.body` — a hardcoded index —
     * so renaming the third sub-task renamed the first, and it returned `null`
     * for a `SubTaskItem!`-shaped field. It had no callers, which is why nobody
     * had seen it. Now it rewrites the array through the same read-map-$set
     * shape `completeSubTaskItem` uses, and returns the renamed sub-task so
     * Apollo normalizes `SubTaskItem:<id>` and every query holding it updates.
     */
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        date,
        period,
        body,
        taskId,
      } = args;

      const goalEntry = await GoalModel.findOne(
        { date, period, email },
        { goalItems: { $elemMatch: { _id: taskId } } },
      ).exec();

      const previousGoalItem = goalEntry
        && goalEntry.goalItems
        && goalEntry.goalItems
          .find((goalItem) => goalItem._id.toString() === taskId.toString());

      if (!previousGoalItem
        || !previousGoalItem.subTasks
        || !previousGoalItem.subTasks.length) {
        return null;
      }

      const target = previousGoalItem.subTasks
        .find((subTask) => subTask._id.toString() === id.toString());

      if (!target) return null;

      const updatedSubTasks = previousGoalItem.subTasks.map((subTask) => (
        subTask._id.toString() === id.toString()
          ? { _id: subTask._id, body, isComplete: subTask.isComplete }
          : subTask
      ));

      await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskId,
        },
        { $set: { 'goalItems.$.subTasks': updatedSubTasks } },
        { new: true },
      ).exec();

      // The decrypt hook hands back plain objects, not mongoose subdocuments, so
      // there is no `id` virtual to lean on — spell it out or `SubTaskItemType.id`
      // resolves to null and the client cannot normalize the result.
      return {
        id: target._id.toString(), _id: target._id, body, isComplete: target.isComplete,
      };
    },
  },
  /**
   * Reorder a goal item's sub-tasks.
   *
   * Sub-task order has no field of its own — `SubTaskItemSchema` is just
   * `{ body, isComplete }` and the order IS the array order. So "move up" is a
   * rewrite of the parent's array, which means the answer has to be the parent:
   * a reordered list cannot be expressed as a patch to any one `SubTaskItem`.
   * Returning the complete `GoalItem` lets Apollo normalize the new order into
   * `GoalItem:<taskId>.subTasks` for every query at once
   * (containers/ARCHITECTURE.md §3 principle #2).
   *
   * `ids` is the desired order. Ids that are not on the item are ignored and
   * sub-tasks the caller did not mention keep their relative order at the end,
   * so a stale client list reorders what it knows about instead of deleting the
   * rest.
   */
  reorderSubTaskItems: {
    type: GoalItemType,
    args: {
      taskId: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      ids: { type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLID))) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        taskId, date, period, ids,
      } = args;

      const goalEntry = await GoalModel.findOne(
        { date, period, email },
        { goalItems: { $elemMatch: { _id: taskId } } },
      ).exec();

      const previousGoalItem = goalEntry
        && goalEntry.goalItems
        && goalEntry.goalItems
          .find((goalItem) => goalItem._id.toString() === taskId.toString());

      if (!previousGoalItem
        || !previousGoalItem.subTasks
        || !previousGoalItem.subTasks.length) {
        return previousGoalItem || null;
      }

      const wanted = ids.map(String);
      const byId = new Map(
        previousGoalItem.subTasks.map((subTask) => [subTask._id.toString(), subTask]),
      );
      const ordered = wanted
        .map((id) => byId.get(id))
        .filter(Boolean);
      const orderedIds = new Set(ordered.map((subTask) => subTask._id.toString()));
      const remainder = previousGoalItem.subTasks
        .filter((subTask) => !orderedIds.has(subTask._id.toString()));

      const updatedGoal = await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskId,
        },
        { $set: { 'goalItems.$.subTasks': [...ordered, ...remainder] } },
        { new: true },
      ).exec();

      return (updatedGoal
        && updatedGoal.goalItems
        && updatedGoal.goalItems.find(
          (goalItem) => goalItem._id.toString() === taskId.toString(),
        )) || null;
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
        const updatedSubTasks = previousGoalItem.subTasks
          .map((subTask) => {
            if (subTask._id.toString() === id.toString()) {
              return { _id: subTask._id, body: subTask.body, isComplete };
            }
            return subTask;
          });

        const updatedGoal = await GoalModel.findOneAndUpdate(
          {
            date: args.date,
            period: args.period,
            email,
            'goalItems._id': args.taskId,
          },
          { $set: { 'goalItems.$.subTasks': updatedSubTasks } },
          { new: true },
        ).exec();

        // Return the COMPLETE parent goal item.
        //
        // This field is typed `GoalItemType`, but it used to return the
        // sub-task shape `{ _id, body, isComplete }`. Against a GoalItem that
        // resolves to `id: null`, `subTasks: null`, and an `isComplete` that is
        // the SUB-task's — so Apollo could not normalize the response at all
        // and the client had to patch the cache by hand (and, reading
        // `result.isComplete`, wrote the parent's completion onto the
        // sub-task). Returning the real parent lets Apollo normalize
        // `GoalItem:<taskId>` plus every `SubTaskItem:<id>` in one write, and
        // every query holding them updates for free.
        // See containers/ARCHITECTURE.md §3 principle #2.
        //
        // Falls back to null, never to `previousGoalItem`: that copy predates
        // the update, so returning it would hand the client the OLD sub-task
        // states and visibly revert the toggle it just made. A null here means
        // the goal item vanished mid-request, and the client's next
        // cache-and-network read is the right way to resolve that.
        return (updatedGoal
          && updatedGoal.goalItems
          && updatedGoal.goalItems.find(
            (goalItem) => goalItem._id.toString() === taskId.toString(),
          )) || null;
      }

      // No sub-tasks to update — still return the parent goal item (or null),
      // never the raw args, so the response is always a valid GoalItem.
      return previousGoalItem || null;
    },
  },
};

module.exports = { query, mutation };
