const Express = require('express');
const ExpressGraphQL = require('express-graphql');
const jwt = require('jsonwebtoken');

const { schema } = require('./resolvers');

const app = Express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // update to match the domain you will make the request from
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

app.use('/graphql', (req, res) => {
  ExpressGraphQL({
    schema,
    customFormatErrorFn: (error) => {
      const {
        message: statusMessage, locations, path,
      } = error;

      const [status, message] = statusMessage.split(':');

      res.status(status || 401);

      return {
        message,
        locations,
        stack: error.stack ? error.stack.split('\n') : [],
        path,
      };
    },
    graphiql: true,
  })(req, res);
});

function startServer() {
  app.listen(3000, () => {
    console.log('Listening at :3000...');
  });
}

module.exports = { startServer };
