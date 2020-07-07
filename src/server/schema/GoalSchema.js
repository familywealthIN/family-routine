const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLObjectType,
} = require('graphql');

const Mongoose = require('../mongoose');

const GoalItemSchema = new Mongoose.Schema({
  body: String,
  isComplete: Boolean,
  isMilestone: Boolean,
  deadline: String,
  contribution: String,
  reward: String,
  taskRef: String,
  goalRef: String,
});

const GoalSchema = new Mongoose.Schema({
  date: String,
  email: String,
  period: String,
  goalItems: [GoalItemSchema],
});

const GoalItemType = new GraphQLObjectType({
  name: 'GoalItem',
  fields: {
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
    goalRef: { type: GraphQLString },
  },
});

// const StackedGoalItemType = new GraphQLObjectType({
//   name: 'StackedGoalItem',
//   fields: {
//     date: { type: GraphQLString },
//     period: { type: GraphQLString },
//     goalItems: {
//       type: new GraphQLList(GoalType),
//     },
//   },
// });

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

const GoalItemModel = Mongoose.model('GoalItem', GoalItemSchema);
const GoalModel = Mongoose.model('Goal', GoalSchema);

module.exports = {
  GoalSchema,
  GoalItemSchema,
  GoalModel,
  GoalItemModel,
  GoalType,
  GoalItemType,
};
