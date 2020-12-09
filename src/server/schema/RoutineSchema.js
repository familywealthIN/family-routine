const {
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLObjectType,
  GraphQLBoolean,
} = require('graphql');

const mongoose = require('mongoose');
const { RoutineItemSchema, RoutineItemType } = require('./RoutineItemSchema');

const RoutineSchema = new mongoose.Schema({
  date: String,
  email: String,
  skip: Boolean,
  tasklist: [RoutineItemSchema],
});

const RoutineType = new GraphQLObjectType({
  name: 'Routine',
  fields: {
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    date: { type: GraphQLString },
    skip: { type: GraphQLBoolean },
    tasklist: {
      type: new GraphQLList(RoutineItemType),
    },
  },
});

const RoutineModel = mongoose.model('routine', RoutineSchema);

module.exports = { RoutineSchema, RoutineModel, RoutineType };
