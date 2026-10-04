require('./src/utils/suppressMongooseWarnings')();
// The repo keeps a single .env at the monorepo root, so resolve it from __dirname
// rather than cwd — otherwise `nodemon ./server.js` run from apps/server loads nothing.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const connectDatabase = require('./src/db');
const { startServer } = require('./src/graphql');

connectDatabase()
  .then(() => startServer())
  .catch((error) => {
    console.error('Could not connect to database', { error });
    throw error;
  });
