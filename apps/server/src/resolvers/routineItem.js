const { randomUUID } = require('crypto');
const {
  GraphQLBoolean,
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
const { suggestRoutineSteps } = require('../utils/routineSteps');

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

/** True when a caller sent no steps at all — missing, null or an empty list. */
const noSteps = (steps) => !Array.isArray(steps) || steps.length === 0;

/**
 * The standard steps for a new routine, as stored steps (each with the id the
 * editor keys its rows on). [] when there are none — never throws.
 */
const standardStepsFor = async (name) => {
  const names = await suggestRoutineSteps(name);
  return names.map((step) => ({ id: randomUUID(), name: step }));
};

const query = {
  /**
   * The standard steps for a routine name, step 1 being the cue that starts it
   * (utils/routineSteps.js). The editor pre-fills a NEW routine with these.
   */
  suggestRoutineSteps: {
    type: new GraphQLList(GraphQLString),
    args: {
      name: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      getEmailfromSession(context);
      return suggestRoutineSteps(args.name);
    },
  },
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

const NOTIFY_MODES = ['off', 'notify', 'alarm'];
function assertNotifyMode(mode) {
  if (mode !== undefined && mode !== null && !NOTIFY_MODES.includes(mode)) {
    throw new Error(`notifyMode must be one of ${NOTIFY_MODES.join(', ')}`);
  }
}

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
      notifyMode: { type: GraphQLString },
      /**
       * Whether a routine created with no steps gets the standard ones
       * (default yes). The editor sends `false` once the user has edited the
       * step list themselves — an empty list they made is their answer.
       */
      suggestSteps: { type: GraphQLBoolean },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      assertNotifyMode(args.notifyMode);

      assertMinPoints(args.points);
      assertWithinBudget(await RoutineItemModel.find({ email }).exec(), [{ points: args.points }]);

      const { suggestSteps, ...fields } = args;
      // Steps the caller sent are theirs and are never replaced.
      if (suggestSteps !== false && noSteps(fields.steps)) {
        fields.steps = await standardStepsFor(fields.name);
      }

      const routineItem = new RoutineItemModel({
        ...fields,
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
      notifyMode: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      assertNotifyMode(args.notifyMode);

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
            // The welcome wizard sends no steps; any it does send are kept.
            const [enhanced, steps] = await Promise.all([
              enhanceRoutineItemWithAI(item),
              noSteps(item.steps) ? standardStepsFor(item.name) : item.steps,
            ]);

            const routineItem = new RoutineItemModel({
              ...item,
              description: enhanced.description,
              steps,
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
