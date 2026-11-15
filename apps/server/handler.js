require('./src/utils/suppressMongooseWarnings')();
const connectDatabase = require('./src/db');
const { startServerless } = require('./src/graphql');
const { warm, isWarmup } = require('./src/utils/warmer');

module.exports.handler = (event, context) => {
  // The schedule's warm-up (serverless.yml): start the container, connect to
  // Mongo, and answer without going near GraphQL.
  if (isWarmup(event)) {
    // eslint-disable-next-line no-param-reassign
    context.callbackWaitsForEmptyEventLoop = false;
    return warm(event, context, { connect: connectDatabase });
  }

  connectDatabase()
    .then(() => startServerless(event, context))
    .catch((error) => {
      console.error('Could not connect to database', { error });
      throw error;
    });
  return undefined;
};
