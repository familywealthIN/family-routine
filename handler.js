const { graphql } = require('graphql');

const { schema } = require('./src/server/resolvers');

// We want to make a GET request with ?query=<graphql query>
// The event properties are specific to AWS. Other providers will differ.
// eslint-disable-next-line max-len
module.exports.query = (event, context, callback) => graphql(schema, event.queryStringParameters.query)
  .then(
    (result) => callback(null, { statusCode: 200, body: JSON.stringify(result) }),
    (err) => callback(err),
  );
