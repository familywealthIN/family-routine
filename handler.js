const connectDatabase = require('./src/server/db');
const { startServerless } = require('./src/server/graphql');

module.exports.handler = (event, context) => {
  connectDatabase()
    .then(() => startServerless(event, context))
    .catch((error) => {
      console.error('Could not connect to database', { error });
      throw error;
    });
};
