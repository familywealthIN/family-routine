const {
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
} = require('graphql');

const { RoutineItemModel, RoutineItemType } = require('../schema/RoutineItemSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const ApiError = require('../utils/ApiError');
const { enhanceRoutineItemWithAI } = require('../utils/aiApi');

/**
 * The routine points rules, made authoritative here (E2E BUG-4). They mirror the
 * Routines editor exactly (packages/ui/utils/dayDial.js — POINTS_MIN,
 * DAILY_POINTS_BUDGET, `totalPoints`): every routine is worth at least 1 point,
 * and ALL of the user's routine items together (one global list — a routine
 * recurs every day, so the day's total is the list's total) are worth at most
 * 100. The client's per-routine 50 is deliberately NOT enforced here: the
 * welcome wizard's normalise-to-100 can legitimately hand one item more.
 *
 * Existing data already breaks both rules (0-point legacy items, accounts over
 * 100), so a write is refused only when it makes things WORSE: a points change
 * below 1 that was not already the stored value, or a total over the budget
 * that is also higher than the total before the write. Renaming a legacy
 * 0-point routine, or lowering one on an over-budget day, always saves.
 */
const POINTS_MIN = 1;
const DAILY_POINTS_BUDGET = 100;

/** Same arithmetic as dayDial.totalPoints: a missing or bad value counts as 0. */
const pointsOf = (item) => Number(item && item.points) || 0;
const totalPoints = (items) => (items || []).reduce((sum, item) => sum + pointsOf(item), 0);

/** The editor's own refusal copy (RoutineEditorSheet.pointsRefusal). */
const budgetRefusal = (othersTotal) => {
  const remaining = DAILY_POINTS_BUDGET - othersTotal;
  if (remaining < POINTS_MIN) {
    return `400:All ${DAILY_POINTS_BUDGET} points of the day are already given out — lower another routine to make room`;
  }
  return `400:Points must be ${remaining} or fewer`;
};

const assertMinPoints = (points, storedPoints) => {
  if (!Number.isInteger(points)) throw new ApiError(400, '400:Points must be a whole number');
  if (points < POINTS_MIN && points !== storedPoints) {
    throw new ApiError(400, `400:Points must be at least ${POINTS_MIN}`);
  }
};

/**
 * @param {Array} items     the user's routine items as stored
 * @param {Array} incoming  `{ id?, points }` — an id replaces that stored item
 */
const assertWithinBudget = (items, incoming) => {
  const replaced = new Set(incoming.filter((i) => i.id).map((i) => String(i.id)));
  const others = items.filter((item) => !replaced.has(String(item._id || item.id)));
  const oldTotal = totalPoints(items);
  const newTotal = totalPoints(others) + totalPoints(incoming);
  if (newTotal > DAILY_POINTS_BUDGET && newTotal > oldTotal) {
    throw new ApiError(400, budgetRefusal(newTotal - totalPoints(incoming)));
  }
};

const query = {
  routineItems: {
    type: GraphQLList(RoutineItemType),
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineItemModel.find({ email }).exec();
    },
  },
  projectTags: {
    type: new GraphQLList(GraphQLString),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const items = await RoutineItemModel.find({ email }).exec();

      const tags = new Set();
      items.forEach((item) => {
        if (item.tags) {
          item.tags
            .filter((tag) => tag.startsWith('project:'))
            .forEach((tag) => tags.add(tag));
        }
      });

      return Array.from(tags).sort();
    },
  },
  areaTags: {
    type: new GraphQLList(GraphQLString),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const items = await RoutineItemModel.find({ email }).exec();

      const tags = new Set();
      items.forEach((item) => {
        if (item.tags) {
          item.tags
            .filter((tag) => tag.startsWith('area:'))
            .forEach((tag) => tags.add(tag));
        }
      });

      return Array.from(tags).sort();
    },
  },
};

const StepInputItemType = new GraphQLInputObjectType({
  name: 'StepInputItem',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const RoutineItemInputType = new GraphQLInputObjectType({
  name: 'RoutineItemInput',
  fields: {
    name: { type: GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    time: { type: GraphQLNonNull(GraphQLString) },
    points: { type: GraphQLNonNull(GraphQLInt) },
    startEvent: { type: GraphQLString },
    endEvent: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
    steps: { type: GraphQLList(StepInputItemType) },
    duration: { type: GraphQLInt },
    type: { type: GraphQLString }, // morning, evening, sleep, wake, etc.
  },
});

const mutation = {
  addRoutineItem: {
    type: RoutineItemType,
    args: {
      name: { type: GraphQLNonNull(GraphQLString) },
      steps: { type: GraphQLList(StepInputItemType) },
      description: { type: GraphQLNonNull(GraphQLString) },
      time: { type: GraphQLNonNull(GraphQLString) },
      points: { type: GraphQLNonNull(GraphQLInt) },
      startEvent: { type: GraphQLString },
      endEvent: { type: GraphQLString },
      tags: { type: new GraphQLList(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      assertMinPoints(args.points);
      assertWithinBudget(await RoutineItemModel.find({ email }).exec(), [{ points: args.points }]);

      const routineItem = new RoutineItemModel({
        ...args,
        email,
        passed: false,
        ticked: false,
        wait: true,
      });
      return routineItem.save();
    },
  },
  deleteRoutineItem: {
    type: RoutineItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineItemModel.findOneAndRemove({ _id: args.id, email }).exec();
    },
  },
  updateRoutineItem: {
    type: RoutineItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLNonNull(GraphQLString) },
      steps: { type: GraphQLNonNull(GraphQLList(StepInputItemType)) },
      description: { type: GraphQLNonNull(GraphQLString) },
      time: { type: GraphQLNonNull(GraphQLString) },
      points: { type: GraphQLNonNull(GraphQLInt) },
      startEvent: { type: GraphQLString },
      endEvent: { type: GraphQLString },
      tags: { type: new GraphQLList(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const items = await RoutineItemModel.find({ email }).exec();
      const stored = items.find((item) => String(item._id || item.id) === String(args.id));
      // Not this user's (or gone): fall through to the update, which matches
      // nothing and answers null exactly as before.
      if (stored) {
        assertMinPoints(args.points, pointsOf(stored));
        assertWithinBudget(items, [{ id: args.id, points: args.points }]);
      }

      return RoutineItemModel.findOneAndUpdate(
        { _id: args.id, email },
        args,
        { new: true },
      ).exec();
    },
  },
  bulkAddRoutineItems: {
    type: GraphQLList(RoutineItemType),
    args: {
      routineItems: { type: GraphQLNonNull(GraphQLList(RoutineItemInputType)) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const { routineItems } = args;

      // Before the try: its catch would flatten the reason into a generic one.
      routineItems.forEach((item) => assertMinPoints(item && item.points));
      assertWithinBudget(await RoutineItemModel.find({ email }).exec(), routineItems.map((item) => ({ points: item.points })));

      try {
        // Process each routine item with AI enhancement
        const enhancedItems = await Promise.all(
          routineItems.map(async (item) => {
            const enhanced = await enhanceRoutineItemWithAI(item);

            const routineItem = new RoutineItemModel({
              ...item,
              description: enhanced.description,
              steps: enhanced.steps,
              email,
              passed: false,
              ticked: false,
              wait: true,
            });

            return routineItem.save();
          }),
        );

        return enhancedItems;
      } catch (error) {
        console.error('Error in bulkAddRoutineItems:', error);
        throw new Error('Failed to create routine items');
      }
    },
  },
};

module.exports = {
  query, mutation, POINTS_MIN, DAILY_POINTS_BUDGET,
};
