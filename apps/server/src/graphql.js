const express = require('express');
const cors = require('cors');
const graphqlHTTP = require('express-graphql');
const { createServer, proxy } = require('aws-serverless-express');
const jwt = require('jsonwebtoken');

const { schema } = require('./resolvers');

const app = express();
app.use(cors());

app.enable('trust proxy');
app.disable('x-powered-by');

app.set('json spaces', 2);

app.use(require('body-parser').json());

/**
 * Decode the bearer token onto the request, when there is a valid one.
 *
 * An unverifiable token means UNAUTHENTICATED — it does not mean "refuse the
 * request". This used to answer 401 for the whole request, which locked users
 * out of signing back IN: the client attaches the stored token to EVERY
 * operation (main.js authMiddleware), `authGoogle` included, and tokens last
 * 60 days (passport.js). Once one expired, every request 401'd — including the
 * one that would have issued a fresh token — so the only way back in was
 * clearing site data by hand.
 *
 * Nothing is weakened by continuing: `getEmailfromSession` is the actual gate
 * and throws 401 for every resolver that needs a user. Public operations
 * (authGoogle) can now run with a stale token in the header, which is exactly
 * what signing in again requires.
 */
const attachDecodedToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const { JWT_SECRET } = process.env;

  if (!authHeader) return next();

  const bearerToken = authHeader.split(' ');
  if (bearerToken.length !== 2 || bearerToken[0].toLowerCase() !== 'bearer') {
    return next();
  }

  return jwt.verify(bearerToken[1], JWT_SECRET, (error, decodedToken) => {
    if (!error) {
      // eslint-disable-next-line no-param-reassign
      req.decodedToken = decodedToken;
    }
    next();
  });
};

app.use(attachDecodedToken);

const startGraphQL = (req, res) => graphqlHTTP({
  schema,
  // customFormatErrorFn: (error) => {
  //   const {
  //     message: statusMessage, locations, path,
  //   } = error;

  //   const [status, message] = statusMessage.split(':');

  //   res.status(status || 401);

  //   return {
  //     message,
  //     locations,
  //     stack: error.stack ? error.stack.split('\n') : [],
  //     path,
  //   };
  // },
  graphiql: true,
})(req, res);

const startServer = () => {
  app.use('/graphql', startGraphQL);
  app.listen(3000, () => {
    console.log('Listening at :3000...');
  });
};

const startServerless = (event, context) => {
  // eslint-disable-next-line no-param-reassign
  context.callbackWaitsForEmptyEventLoop = false;
  app.use('/', startGraphQL);
  const server = createServer(app);

  return proxy(server, event, context);
};

module.exports = { startServer, startServerless, attachDecodedToken };
