const mongoose = require('mongoose');

// See https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas
// See https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
// https://mongoosejs.com/docs/lambda.html
//
// One connection per container, made on the first call and reused by every
// call after it (Lambda keeps the module scope between calls).

let cachedMongoConn = null;
let listenersAttached = false;

/**
 * The connection's listeners, attached ONCE. They used to be added on every
 * call, so a warm container piled up three more listeners per request.
 */
function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection
    .on('error', (error) => {
      console.log('Error: connection to DB failed', error && error.message);
    })
    // Exit Process if there is no longer a Database Connection
    .on('close', () => {
      console.log('Error: Connection to DB lost');
      process.exit(1);
    })
    .once('open', () => {
      mongoose.connections.forEach((info) => console.log(`Connected to ${info.host}:${info.port}/${info.name}`));
    });
}

module.exports = () => {
  mongoose.Promise = global.Promise;
  attachListeners();

  if (!cachedMongoConn) {
    cachedMongoConn = mongoose.connect(process.env.MONGDO_DB, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      connectTimeoutMS: 10000,
      // Buffering means mongoose will queue up operations if it gets
      // disconnected from MongoDB and send them when it reconnects.
      // With serverless, better to fail fast if not connected.
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // and MongoDB driver buffering
    }).catch((error) => {
      // A failed connect is not cached: the next call tries again instead of
      // the container failing every request until it is recycled.
      cachedMongoConn = null;
      throw error;
    });
  }
  return cachedMongoConn;
};
