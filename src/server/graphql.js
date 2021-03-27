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

app.use((req, res, next) => {
  // update to match the domain you will make the request from
  // res.header('Access-Control-Allow-Origin', '*');
  const authHeader = req.headers.authorization;
  const { JWT_SECRET } = process.env;
  if (authHeader) {
    const bearerToken = authHeader.split(' ');
    if (bearerToken.length === 2 && bearerToken[0].toLowerCase() === 'bearer') {
      // eslint-disable-next-line consistent-return
      jwt.verify(bearerToken[1], JWT_SECRET, (error, decodedToken) => {
        if (error) {
          return res.status(401).send('{ "error": "Invalid authorization token" }');
        }
        // eslint-disable-next-line no-param-reassign
        req.decodedToken = decodedToken;
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
});

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

module.exports = { startServer, startServerless };
