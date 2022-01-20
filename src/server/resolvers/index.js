const {
  GraphQLObjectType,
  GraphQLSchema,
} = require('graphql');

const routine = require('./routine');
const goal = require('./goal');
const routineItem = require('./routineItem');
const userItem = require('./userItem');
const motto = require('./motto');
const progress = require('./progress');

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      ...routine.query,
      ...routineItem.query,
      ...userItem.query,
      ...goal.query,
      ...motto.query,
      ...progress.query,
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      ...routine.mutation,
      ...routineItem.mutation,
      ...userItem.mutation,
      ...goal.mutation,
      ...motto.mutation,
      ...progress.mutation,
    },
  }),
});

module.exports = { schema };
