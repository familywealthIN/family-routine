/**
 * The MCP connector's OAuth endpoints, at the ROOT of the public origin:
 *
 *   GET  /.well-known/oauth-protected-resource[/mcp]   which server signs in
 *   GET  /.well-known/oauth-authorization-server       its endpoints
 *   POST /register                                     dynamic client registration
 *   GET  /authorize                                    → the web app's /connect page
 *   POST /token                                        code / refresh → tokens
 *
 * MCP clients look for these at the origin root, which is why the server needs
 * its own domain (mcp.routinenotes.app): on the execute-api URL the root is
 * outside the /dev stage and API Gateway answers {"message":"Forbidden"}
 * before the Lambda runs. Logic lives in utils/mcpOAuth.js.
 */
const express = require('express');
const { getCurrentInvoke } = require('@vendia/serverless-express');
const { UserModel } = require('./schema/UserSchema');
const oauth = require('./utils/mcpOAuth');

/**
 * The origin the client reached us on. A custom domain maps the stage to the
 * root; the raw execute-api host keeps the stage in the path.
 */
function publicBase(req) {
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return (process.env.MCP_BASE_URL || '').replace(/\/+$/, '');
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = local ? req.protocol : (req.get('x-forwarded-proto') || 'https').split(',')[0];
  let stage = '';
  if (/\.execute-api\./.test(host)) {
    const { event } = getCurrentInvoke() || {};
    stage = event && event.requestContext && event.requestContext.stage ? `/${event.requestContext.stage}` : '';
  }
  return `${proto}://${host}${stage}`;
}

function sendOAuthError(res, err) {
  if (err instanceof oauth.OAuthError) {
    return res.status(err.status).json({ error: err.error, error_description: err.message });
  }
  console.error('MCP OAuth error:', err);
  return res.status(500).json({ error: 'server_error', error_description: 'Something went wrong' });
}

/** The app's consent page. WEB_APP_URL is the production web app's origin. */
function consentUrl(query) {
  const base = (process.env.WEB_APP_URL || 'http://localhost:8080').replace(/\/+$/, '');
  const qs = new URLSearchParams();
  ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'resource']
    .forEach((k) => { if (query[k]) qs.set(k, query[k]); });
  return `${base}/connect?${qs.toString()}`;
}

/** Spend a code: true once, false every time after (or for someone else's code). */
async function spendCode(email, jti) {
  const user = await UserModel.findOneAndUpdate(
    { email, 'oauth.authCode': jti },
    { $unset: { 'oauth.authCode': '' }, $set: { 'oauth.connectedAt': new Date() } },
    { new: true },
  ).exec();
  return !!user;
}

function createAuthRouter() {
  const router = express.Router();

  const resourceMetadata = (req, res) => res.json(oauth.protectedResourceMetadata(publicBase(req)));
  router.get('/.well-known/oauth-protected-resource', resourceMetadata);
  router.get('/.well-known/oauth-protected-resource/mcp', resourceMetadata);

  const serverMetadata = (req, res) => res.json(oauth.authorizationServerMetadata(publicBase(req)));
  router.get('/.well-known/oauth-authorization-server', serverMetadata);
  // Some clients try OpenID discovery first; the same document answers it.
  router.get('/.well-known/openid-configuration', serverMetadata);

  router.post('/register', (req, res) => {
    try {
      res.status(201).json(oauth.registerClient(req.body));
    } catch (err) {
      sendOAuthError(res, err);
    }
  });

  router.get('/authorize', (req, res) => {
    try {
      oauth.validateAuthRequest(req.query);
    } catch (err) {
      // Never redirect a request we can't trust: the redirect_uri may be the attacker's.
      return res.status(400).type('text/plain').send(`This connection link isn't valid: ${err.message}`);
    }
    return res.redirect(302, consentUrl(req.query));
  });

  router.post('/token', async (req, res) => {
    const body = req.body || {};
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    try {
      if (body.grant_type === 'authorization_code') {
        const code = oauth.checkCodeGrant(body);
        if (!(await spendCode(code.sub, code.jti))) {
          throw new oauth.OAuthError('invalid_grant', 'Authorization code was already used');
        }
        return res.json(oauth.issueTokens(code.sub, code.cid, code.scope));
      }
      if (body.grant_type === 'refresh_token') {
        const token = oauth.checkRefreshGrant(body);
        return res.json(oauth.issueTokens(token.sub, token.cid, token.scope));
      }
      throw new oauth.OAuthError('unsupported_grant_type', 'Use authorization_code or refresh_token');
    } catch (err) {
      return sendOAuthError(res, err);
    }
  });

  return router;
}

module.exports = { createAuthRouter, publicBase };
