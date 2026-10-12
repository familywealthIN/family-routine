/**
 * GraphQL shape of `routineTiming` (utils/routineTiming.js). Read-only and
 * derived on request from the day routine documents, so there is no model.
 */
const {
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLObjectType,
} = require('graphql');

const countFields = {
  onTime: { type: GraphQLInt },
  late: { type: GraphQLInt },
  missed: { type: GraphQLInt },
  pending: { type: GraphQLInt },
};

const RoutineTimingSlotType = new GraphQLObjectType({
  name: 'RoutineTimingSlot',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    time: { type: GraphQLString },
    /** onTime | late | missed | pending */
    state: { type: GraphQLString },
  },
});

const RoutineTimingDayType = new GraphQLObjectType({
  name: 'RoutineTimingDay',
  fields: {
    date: { type: GraphQLString },
    skip: { type: GraphQLBoolean },
    ...countFields,
    slots: { type: new GraphQLList(RoutineTimingSlotType) },
  },
});

const RoutineTimingRoutineType = new GraphQLObjectType({
  name: 'RoutineTimingRoutine',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    time: { type: GraphQLString },
    ...countFields,
  },
});

const RoutineTimingType = new GraphQLObjectType({
  name: 'RoutineTiming',
  fields: {
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    ...countFields,
    days: { type: new GraphQLList(RoutineTimingDayType) },
    routines: { type: new GraphQLList(RoutineTimingRoutineType) },
  },
});

module.exports = { RoutineTimingType };
