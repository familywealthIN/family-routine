/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
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
const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

/*
 * Every single-sub-task write here is ONE atomic update on the one field it
 * changes ($push / $pull / an arrayFilters $set), never a read of the whole
 * `subTasks` array followed by a $set of the whole array.
 *
 * The read-then-rewrite shape lost writes: tick two sub-tasks in quick
 * succession and both requests read the same starting array, so the second
 * write put the first sub-task back the way it was — and its response, the
 * parent GoalItem, carried that reverted state into the client cache, so the
 * box the user had just ticked unticked itself (26 Oct 2026).
 *
 * It also stored every sub-task title in plaintext: the find hook decrypts, the
 * rewrite wrote the decrypted copy back, and the encrypt hook only runs on
 * `save`. Values written here are encrypted by hand for that reason.
 */

const toObjectId = (id) => (id != null && mongoose.Types.ObjectId.isValid(String(id))
  ? mongoose.Types.ObjectId(String(id))
  : null);

const sameId = (a, b) => a != null && b != null && a.toString() === b.toString();

const findGoalItem = (goal, taskId) => (goal && goal.goalItems
  && goal.goalItems.find((goalItem) => sameId(goalItem._id, taskId))) || null;

const findSubTask = (goalItem, id) => (goalItem && goalItem.subTasks
  && goalItem.subTasks.find((subTask) => sameId(subTask._id, id))) || null;

const encryptBody = (body) => (body ? encryption.encrypt(body) : body);

/**
 * The decrypt hook hands back values without a guaranteed `id` virtual, so
 * spell it out or `SubTaskItemType.id` resolves to null and the client cannot
 * normalize the result.
 */
const subTaskResult = (subTask) => ({
  id: subTask._id.toString(),
  _id: subTask._id,
  body: subTask.body,
  isComplete: subTask.isComplete,
});

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
    /**
     * Append one sub-task with `$push`. The id is minted here so the answer is
     * the sub-task this request added — "the last element of the array" is
     * someone else's when two adds land together.
     */
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        taskId,
        date,
        period,
        body,
      } = args;

      const taskObjectId = toObjectId(taskId);
      if (!taskObjectId) return null;

      const subTaskId = new mongoose.Types.ObjectId();
      const isComplete = !!args.isComplete;

      const updatedGoal = await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskObjectId,
        },
        {
          $push: {
            'goalItems.$.subTasks': { _id: subTaskId, body: encryptBody(body), isComplete },
          },
        },
        { new: true },
      ).exec();

      if (!updatedGoal) return null;

      return subTaskResult({ _id: subTaskId, body, isComplete });
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
     * Rename one sub-task, addressed by id through arrayFilters (an earlier
     * version wrote `subTasks.0.body` and renamed the first one). Returns the
     * renamed sub-task so Apollo normalizes `SubTaskItem:<id>` and every query
     * holding it updates.
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

      const taskObjectId = toObjectId(taskId);
      const subTaskObjectId = toObjectId(id);
      if (!taskObjectId || !subTaskObjectId) return null;

      const updatedGoal = await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskObjectId,
        },
        { $set: { 'goalItems.$[item].subTasks.$[sub].body': encryptBody(body) } },
        {
          new: true,
          arrayFilters: [{ 'item._id': taskObjectId }, { 'sub._id': subTaskObjectId }],
        },
      ).exec();

      const target = findSubTask(findGoalItem(updatedGoal, taskId), id);
      return target ? subTaskResult(target) : null;
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
   *
   * The one whole-array write left in this file, because order cannot be set
   * any other way. The bodies are re-encrypted before it goes back.
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

      const previousGoalItem = findGoalItem(goalEntry, taskId);

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

      const stored = [...ordered, ...remainder].map((subTask) => ({
        _id: subTask._id,
        body: encryptBody(subTask.body),
        isComplete: subTask.isComplete,
      }));

      const updatedGoal = await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskId,
        },
        { $set: { 'goalItems.$.subTasks': stored } },
        { new: true },
      ).exec();

      return findGoalItem(updatedGoal, taskId);
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
    /**
     * `$pull` the one sub-task. The pre-update document (`new: false`) is what
     * still holds it, so the deleted sub-task can be returned.
     */
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        taskId,
        date,
        period,
      } = args;

      const taskObjectId = toObjectId(taskId);
      const subTaskObjectId = toObjectId(id);
      if (!taskObjectId || !subTaskObjectId) return args;

      const previousGoal = await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskObjectId,
        },
        { $pull: { 'goalItems.$.subTasks': { _id: subTaskObjectId } } },
        { new: false },
      ).exec();

      const removed = findSubTask(findGoalItem(previousGoal, taskId), id);
      return removed ? subTaskResult(removed) : args;
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
    /**
     * Tick or untick one sub-task: a `$set` of that sub-task's `isComplete` and
     * nothing else, so concurrent ticks on the same item cannot undo each
     * other (see the note at the top of this file).
     *
     * Returns the COMPLETE parent goal item, read from the post-update
     * document. The field is typed `GoalItemType`; returning the parent lets
     * Apollo normalize `GoalItem:<taskId>` plus every `SubTaskItem:<id>` in one
     * write (containers/ARCHITECTURE.md §3 principle #2). A sub-task that is no
     * longer on the item matches no array filter, changes nothing, and the
     * parent comes back as it stands. Null means the goal item itself is gone.
     */
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        taskId,
        date,
        period,
        isComplete,
      } = args;

      const taskObjectId = toObjectId(taskId);
      const subTaskObjectId = toObjectId(id);
      if (!taskObjectId || !subTaskObjectId) return null;

      const updatedGoal = await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': taskObjectId,
        },
        { $set: { 'goalItems.$[item].subTasks.$[sub].isComplete': isComplete } },
        {
          new: true,
          arrayFilters: [{ 'item._id': taskObjectId }, { 'sub._id': subTaskObjectId }],
        },
      ).exec();

      return findGoalItem(updatedGoal, taskId);
    },
  },
};

module.exports = { query, mutation };
