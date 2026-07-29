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

// One routine document per user per day, enforced by the database.
//
// Two code paths create a day's routine: `addRoutine` (an atomic upsert) and
// `findTodayandSort` in resolvers/goal.js (a plain insert, reached whenever a
// goal is completed before the routine exists). On a new day the dashboard runs
// both concurrently, and without this index Mongo stores BOTH documents. From
// then on `routineDate()` — a `findOne` — returns an arbitrary one of the two,
// so a tick written to one document is invisible when the UI reads the other:
// the checkbox goes green and the points never appear ("tick it again").
//
// The index makes that state unrepresentable. The non-atomic insert now fails
// with E11000, which its caller catches and turns into a read.
RoutineSchema.index({ email: 1, date: 1 }, { unique: true });

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
