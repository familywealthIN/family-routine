require('./src/utils/suppressMongooseWarnings')();
require('dotenv').config();
const connectDatabase = require('./src/db');
const { startServer } = require('./src/graphql');

connectDatabase()
  .then(() => startServer())
  .catch((error) => {
    console.error('Could not connect to database', { error });
    throw error;
  });
