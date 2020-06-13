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
  completed: Boolean,
  taskRef: String,
});

const GoalSchema = new Mongoose.Schema({
  body: String,
  completed: Boolean,
  tasklist: [GoalItemSchema],
});

const GoalItemType = new GraphQLObjectType({
  name: 'GoalItem',
  fields: {
    id: { type: GraphQLID },
    body: { type: GraphQLString },
    completed: { type: GraphQLBoolean },
    taskRef: { type: GraphQLString },
  },
});

const GoalType = new GraphQLObjectType({
  name: 'Goal',
  fields: {
    id: { type: GraphQLID },
    date: { type: GraphQLString },
    period: { type: GraphQLString }, // day, week, month, year, lifetime
    goalItems: {
      type: new GraphQLList(GoalItemType),
    },
  },
});


const GoalItemModel = Mongoose.model('GoalItem', GoalItemSchema);
const GoalModel = Mongoose.model('Goal', GoalItemSchema);

module.exports = {
  GoalSchema,
  GoalItemSchema,
  GoalModel,
  GoalItemModel,
  GoalType,
  GoalItemType,
};
