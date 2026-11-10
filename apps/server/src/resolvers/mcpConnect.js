/**
 * The web app's /connect page: the consent step of the MCP connector's OAuth
 * flow (utils/mcpOAuth.js, mcpAuthRoutes.js).
 *
 *   mcpAuthRequest   checks the request the page was opened with and says who
 *                    is asking and where Allow will send the user
 *   approveMcpAccess checks it AGAIN (the page's query is the user's to edit),
 *                    issues a one-time code and returns the redirect
 *
 * Cancel needs no server: once mcpAuthRequest has passed, the page itself
 * sends the client `error=access_denied`.
 */
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
} = require('graphql');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const ApiError = require('../utils/ApiError');
const oauth = require('../utils/mcpOAuth');

const requestArgs = {
  clientId: { type: new GraphQLNonNull(GraphQLString) },
  redirectUri: { type: new GraphQLNonNull(GraphQLString) },
  codeChallenge: { type: GraphQLString },
  codeChallengeMethod: { type: GraphQLString },
  scope: { type: GraphQLString },
  state: { type: GraphQLString },
};

const toParams = (args) => ({
  client_id: args.clientId,
  redirect_uri: args.redirectUri,
  code_challenge: args.codeChallenge,
  code_challenge_method: args.codeChallengeMethod,
  scope: args.scope,
  state: args.state,
});

/** An OAuthError becomes a 400 the page can show; the client is never told. */
function validate(args) {
  try {
    return oauth.validateAuthRequest(toParams(args));
  } catch (err) {
    if (err instanceof oauth.OAuthError) throw new ApiError(400, `400:${err.message}`);
    throw err;
  }
}

const query = {
  mcpAuthRequest: {
    type: new GraphQLObjectType({
      name: 'McpAuthRequest',
      fields: {
        clientName: { type: GraphQLString },
        redirectHost: { type: GraphQLString },
      },
    }),
    args: requestArgs,
    resolve: (root, args, context) => {
      if (!getEmailfromSession(context)) throw new ApiError(401, '401:Authentication required');
      return validate(args);
    },
  },
};

const mutation = {
  approveMcpAccess: {
    type: new GraphQLObjectType({
      name: 'McpApproval',
      fields: { redirectTo: { type: GraphQLString } },
    }),
    args: requestArgs,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      if (!email) throw new ApiError(401, '401:Authentication required');
      validate(args);
      const params = toParams(args);
      const { code, jti } = oauth.issueCode(email, params);
      // Only the newest code works: approving twice voids the first.
      const user = await UserModel.findOneAndUpdate(
        { email },
        { $set: { 'oauth.authCode': jti } },
      ).exec();
      if (!user) throw new ApiError(401, '401:Authentication required');
      return { redirectTo: oauth.withQuery(params.redirect_uri, { code, state: params.state }) };
    },
  },
};

module.exports = { query, mutation };
