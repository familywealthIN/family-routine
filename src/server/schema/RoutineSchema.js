const {
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLObjectType,
} = require('graphql');

const Mongoose = require('../mongoose');
const { RoutineItemSchema, RoutineItemType } = require('./RoutineItemSchema');

const RoutineSchema = new Mongoose.Schema({
  date: String,
  email: String,
  tasklist: [RoutineItemSchema],
});

const RoutineType = new GraphQLObjectType({
  name: 'Routine',
  fields: {
    id: { type: GraphQLID },
    date: { type: GraphQLString },
    tasklist: {
      type: new GraphQLList(RoutineItemType),
    },
  },
});

const RoutineModel = Mongoose.model('routine', RoutineSchema);

module.exports = { RoutineSchema, RoutineModel, RoutineType };
