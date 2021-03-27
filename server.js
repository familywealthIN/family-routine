require('dotenv').config();
const connectDatabase = require('./src/server/db');
const { startServer } = require('./src/server/graphql');

connectDatabase()
  .then(() => startServer())
  .catch((error) => {
    console.error('Could not connect to database', { error });
    throw error;
  });
