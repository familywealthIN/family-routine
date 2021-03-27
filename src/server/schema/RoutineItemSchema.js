const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLObjectType,
} = require('graphql');

const mongoose = require('mongoose');

const RoutineItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  email: String,
  time: String,
  points: Number,
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
    ticked: { type: GraphQLBoolean },
    passed: { type: GraphQLBoolean },
    wait: { type: GraphQLBoolean },
  },
});

const RoutineItemModel = mongoose.model('routineItem', RoutineItemSchema);

module.exports = { RoutineItemSchema, RoutineItemModel, RoutineItemType };
