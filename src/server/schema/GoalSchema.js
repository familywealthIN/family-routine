const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLObjectType,
  GraphQLInt,
} = require('graphql');

const mongoose = require('mongoose');

const GoalItemSchema = new mongoose.Schema({
  body: String,
  isComplete: Boolean,
  isMilestone: Boolean,
  deadline: String,
  contribution: String,
  reward: String,
  taskRef: String,
  goalRef: String,
});

const GoalSchema = new mongoose.Schema({
  date: String,
  email: String,
  period: String,
  goalItems: [GoalItemSchema],
});

const GoalItemTypeFields = {
  id: { type: GraphQLID },
  email: { type: GraphQLString },
  date: { type: GraphQLString },
  period: { type: GraphQLString },
  body: { type: GraphQLString },
  deadline: { type: GraphQLString },
  contribution: { type: GraphQLString },
  reward: { type: GraphQLString },
  isComplete: { type: GraphQLBoolean },
  isMilestone: { type: GraphQLBoolean },
  taskRef: { type: GraphQLString },
  progress: { type: GraphQLInt },
  goalRef: { type: GraphQLString },
};

const GoalItemType = new GraphQLObjectType({
  name: 'GoalItem',
  fields: {
    ...GoalItemTypeFields,
  },
});

const GoalItemWeekType = new GraphQLObjectType({
  name: 'GoalItemWeek',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemType) },
  },
});

const GoalItemMonthType = new GraphQLObjectType({
  name: 'GoalItemMonth',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemWeekType) },
  },
});

const GoalItemYearType = new GraphQLObjectType({
  name: 'GoalItemYear',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemMonthType) },
  },
});

const GoalItemLifetimeType = new GraphQLObjectType({
  name: 'GoalItemLifetime',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemYearType) },
  },
});

const GoalMilestoneType = new GraphQLObjectType({
  name: 'GoalMilestone',
  fields: {
    day: { type: new GraphQLList(GoalItemType) },
    week: { type: new GraphQLList(GoalItemWeekType) },
    month: { type: new GraphQLList(GoalItemMonthType) },
    year: { type: new GraphQLList(GoalItemYearType) },
    lifetime: { type: new GraphQLList(GoalItemLifetimeType) },
  },
});

const GoalType = new GraphQLObjectType({
  name: 'Goal',
  fields: {
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    // day, start of week, start of month, start of year, birthdate or 1970
    date: { type: GraphQLString },
    period: { type: GraphQLString }, // day, week, month, year, lifetime
    goalItems: {
      type: new GraphQLList(GoalItemType),
    },
  },
});

const GoalItemModel = mongoose.model('GoalItem', GoalItemSchema);
const GoalModel = mongoose.model('Goal', GoalSchema);

module.exports = {
  GoalSchema,
  GoalItemSchema,
  GoalModel,
  GoalItemModel,
  GoalType,
  GoalItemType,
  GoalMilestoneType,
};
