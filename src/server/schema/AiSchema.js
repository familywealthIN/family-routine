const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLBoolean,
} = require('graphql');

const AiItemInput = new GraphQLInputObjectType({
  name: 'AiItemInput',
  fields: {
    body: { type: GraphQLString },
    period: { type: GraphQLString },
    date: { type: GraphQLString },
  },
});

const GoalItemInput = new GraphQLInputObjectType({
  name: 'GoalItemInput',
  fields: {
    date: { type: GraphQLString },
    period: { type: GraphQLString },
    body: { type: GraphQLString },
    deadline: { type: GraphQLString },
    contribution: { type: GraphQLString },
    reward: { type: GraphQLString },
    isComplete: { type: GraphQLBoolean },
    isMilestone: { type: GraphQLBoolean },
    taskRef: { type: GraphQLString },
    goalRef: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
  },
});

const SummaryType = new GraphQLObjectType({
  name: 'Summary',
  fields: {
    description: { type: GraphQLString },
    nextSteps: { type: GraphQLString },
  },
});

const MilestoneEntryType = new GraphQLObjectType({
  name: 'MilestoneEntry',
  fields: {
    period: { type: GraphQLString },
    periodName: { type: GraphQLString },
    date: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
  },
});

const MilestonePlanType = new GraphQLObjectType({
  name: 'MilestonePlan',
  fields: {
    period: { type: GraphQLString },
    title: { type: GraphQLString },
    entries: { type: new GraphQLList(MilestoneEntryType) },
    error: { type: GraphQLString },
    rawResponse: { type: GraphQLString },
  },
});

const ExtractedTaskType = new GraphQLObjectType({
  name: 'ExtractedTask',
  fields: {
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
    dueDate: { type: GraphQLString },
    priority: { type: GraphQLString },
    error: { type: GraphQLString },
  },
});

module.exports = {
  AiItemInput,
  GoalItemInput,
  SummaryType,
  MilestoneEntryType,
  MilestonePlanType,
  ExtractedTaskType,
};
