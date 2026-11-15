const express = require('express');
const cors = require('cors');
const graphqlHTTP = require('express-graphql');
const { createServer, proxy } = require('aws-serverless-express');
const jwt = require('jsonwebtoken');

const { schema } = require('./resolvers');
const { graphqlCorsOptions, rejectForeignOrigin } = require('./utils/corsOrigins');

const app = express();
// Only the app's own sites and the mobile apps (utils/corsOrigins.js). This
// also answers the preflight: API Gateway passes OPTIONS through to here.
app.use(cors(graphqlCorsOptions));
app.use(rejectForeignOrigin);

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

/**
 * One line per operation: its name, how long it took, and whether this
 * container had just started. That is what says which reads make the app wait
 * (CloudWatch: filter `[gql]`).
 */
let coldContainer = true;
const timeOperation = (req, res, next) => {
  const started = Date.now();
  const cold = coldContainer;
  coldContainer = false;
  res.on('finish', () => {
    const body = req.body || {};
    const name = body.operationName || (Array.isArray(body) ? 'batch' : 'anonymous');
    console.log(`[gql] ${name} ${Date.now() - started}ms${cold ? ' cold' : ''}`);
  });
  next();
};

// Built once per container. It used to be built inside every request.
const graphqlMiddleware = graphqlHTTP({
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
});

const startGraphQL = (req, res) => graphqlMiddleware(req, res);

const startServer = () => {
  app.use('/graphql', startGraphQL);
  app.listen(3000, () => {
    console.log('Listening at :3000...');
  });
};

/**
 * The Lambda entry. The route and the HTTP server are made on the FIRST call
 * and reused by every call after it. They used to be made on every call: each
 * one stacked another copy of the route on the app and left another server
 * listening on its own socket, so a container got slower the longer it lived.
 */
let lambdaServer = null;

function serverlessServer() {
  if (!lambdaServer) {
    app.use('/', timeOperation, startGraphQL);
    lambdaServer = createServer(app);
  }
  return lambdaServer;
}

const startServerless = (event, context) => {
  // eslint-disable-next-line no-param-reassign
  context.callbackWaitsForEmptyEventLoop = false;
  return proxy(serverlessServer(), event, context);
};

module.exports = {
  startServer, startServerless, serverlessServer, attachDecodedToken,
};
