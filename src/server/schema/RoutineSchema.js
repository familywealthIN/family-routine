const {
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLObjectType,
  GraphQLBoolean,
} = require('graphql');

const Mongoose = require('../mongoose');
const { RoutineItemSchema, RoutineItemType } = require('./RoutineItemSchema');

const RoutineSchema = new Mongoose.Schema({
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

const RoutineModel = Mongoose.model('routine', RoutineSchema);

module.exports = { RoutineSchema, RoutineModel, RoutineType };
