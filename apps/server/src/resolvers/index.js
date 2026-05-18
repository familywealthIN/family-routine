const {
  GraphQLObjectType,
  GraphQLSchema,
} = require('graphql');

const routine = require('./routine');
const goal = require('./goal');
const subTaskItem = require('./subTaskItem');
const routineItem = require('./routineItem');
const userItem = require('./userItem');
const motto = require('./motto');
const progress = require('./progress');
const ai = require('./ai');

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      ...routine.query,
      ...routineItem.query,
      ...userItem.query,
      ...goal.query,
      ...subTaskItem.query,
      ...motto.query,
      ...progress.query,
      ...ai.query,
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      ...routine.mutation,
      ...routineItem.mutation,
      ...userItem.mutation,
      ...goal.mutation,
      ...subTaskItem.mutation,
      ...motto.mutation,
      ...progress.mutation,
      ...ai.mutation,
    },
  }),
});

module.exports = { schema };
