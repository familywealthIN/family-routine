const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLObjectType,
} = require('graphql');

const Mongoose = require('../mongoose');

const RoutineItemSchema = new Mongoose.Schema({
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

const RoutineItemModel = Mongoose.model('routineItem', RoutineItemSchema);

module.exports = { RoutineItemSchema, RoutineItemModel, RoutineItemType };
