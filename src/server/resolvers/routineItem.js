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
const { enhanceRoutineItemWithAI } = require('../../utils/aiApi');

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
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

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
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

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

module.exports = { query, mutation };
