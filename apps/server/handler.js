require('./src/utils/suppressMongooseWarnings')();
const connectDatabase = require('./src/db');
const { startServerless } = require('./src/graphql');

module.exports.handler = (event, context) => {
  connectDatabase()
    .then(() => startServerless(event, context))
    .catch((error) => {
      console.error('Could not connect to database', { error });
      throw error;
    });
};
