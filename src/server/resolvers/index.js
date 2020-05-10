const {
  GraphQLObjectType,
  GraphQLSchema,
} = require('graphql');

const routine = require('./routine');
const routineItem = require('./routineItem');
const userItem = require('./userItem');


const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      ...routine.query,
      ...routineItem.query,
      ...userItem.query,
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      ...routine.mutation,
      ...routineItem.mutation,
      ...userItem.mutation,
    },
  }),
});

module.exports = { schema };
