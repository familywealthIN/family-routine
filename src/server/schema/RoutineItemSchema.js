const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
  GraphQLFloat,
} = require('graphql');

const mongoose = require('mongoose');

const StepItemSchema = new mongoose.Schema({
  id: String,
  name: String,
});

const StepItemType = new GraphQLObjectType({
  name: 'StepItem',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const StimulusItemSchema = new mongoose.Schema({
  name: String,
  splitRate: Number,
  earned: Number,
});

const StimulusItemType = new GraphQLObjectType({
  name: 'StimuliItem',
  fields: {
    name: { type: GraphQLString },
    splitRate: { type: GraphQLInt },
    earned: { type: GraphQLFloat },
    potential: { type: GraphQLInt },
  },
});

const RoutineItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  email: String,
  time: String,
  points: Number,
  stimuli: [StimulusItemSchema],
  steps: [StepItemSchema],
  ticked: Boolean,
  passed: Boolean,
  wait: Boolean,
});

const RoutineItemType = new GraphQLObjectType({
  name: 'RoutineItem',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    email: { type: GraphQLString },
    time: { type: GraphQLString },
    points: { type: GraphQLInt },
    stimuli: {
      type: new GraphQLList(StimulusItemType),
    },
    steps: {
      type: new GraphQLList(StepItemType),
    },
    ticked: { type: GraphQLBoolean },
    passed: { type: GraphQLBoolean },
    wait: { type: GraphQLBoolean },
  },
});

const RoutineItemModel = mongoose.model('routineItem', RoutineItemSchema);

module.exports = { RoutineItemSchema, RoutineItemModel, RoutineItemType };
