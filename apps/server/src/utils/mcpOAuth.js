/**
 * OAuth 2.1 for the MCP connector, the way MCP clients (Claude, ChatGPT, n8n,
 * Gemini CLI) expect it: discovery documents, dynamic client registration,
 * authorization code + PKCE (S256), refresh tokens.
 *
 * Everything here is stateless and signed except one thing: an authorization
 * code's id is written to the user (`oauth.authCode`) so a code works once.
 *
 * ## A key of its own
 *
 * Every token here is signed with a key DERIVED from JWT_SECRET, never
 * JWT_SECRET itself. The app's session check (graphql.js) verifies with
 * JWT_SECRET and trusts the `email` claim, so a code or access token signed
 * with the same key would double as a full app session. Derived key, `sub`
 * instead of `email`, and a `typ` on every token: none of these can be
 * replayed as another.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TTL_S = 60 * 60; // 1 hour
const REFRESH_TTL_S = 90 * 24 * 60 * 60; // 90 days
const CODE_TTL_S = 10 * 60; // 10 minutes

/** The pre-registered client the Connect AI card shows. Public: PKCE, no secret. */
const STATIC_CLIENT_ID = 'routine-notes-mcp';
const STATIC_CLIENT_NAME = 'Routine Notes MCP client';

const SCOPES = ['read', 'write'];

function signingKey() {
  const { JWT_SECRET } = process.env;
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set');
  return crypto.createHash('sha256').update(`${JWT_SECRET}:mcp-oauth`).digest();
}

function sign(payload, expiresIn) {
  return jwt.sign(payload, signingKey(), expiresIn ? { expiresIn } : {});
}

/** The payload, or null for anything forged, expired or of another `typ`. */
function verify(token, typ) {
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, signingKey());
    return payload && payload.typ === typ ? payload : null;
  } catch (e) {
    return null;
  }
}

class OAuthError extends Error {
  constructor(error, description, status = 400) {
    super(description);
    this.error = error;
    this.status = status;
  }
}

/** https anywhere, plain http only back to this machine (CLIs, n8n self-hosted). */
function isAllowedRedirect(uri) {
  let url;
  try {
    url = new URL(uri);
  } catch (e) {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

/**
 * RFC 7591. The client id IS the registration, signed: nothing to store, and
 * a redirect URI can't be added to it later.
 */
function registerClient(body = {}) {
  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || !redirectUris.length) {
    throw new OAuthError('invalid_redirect_uri', 'redirect_uris is required');
  }
  const bad = redirectUris.find((u) => !isAllowedRedirect(u));
  if (bad) throw new OAuthError('invalid_redirect_uri', `Redirect URI not allowed: ${bad}`);
  const name = String(body.client_name || '').trim().slice(0, 60);
  const clientId = sign({ typ: 'mcp_client', name, ruris: redirectUris });
  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: name || undefined,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };
}

/** `{ name, redirectUris }` (null = any allowed URI), or null for an unknown client. */
function lookupClient(clientId) {
  if (clientId === STATIC_CLIENT_ID) return { name: STATIC_CLIENT_NAME, redirectUris: null };
  const payload = verify(clientId, 'mcp_client');
  return payload ? { name: payload.name || '', redirectUris: payload.ruris || [] } : null;
}

/**
 * The checks an authorization request must pass before the consent page may
 * show — and again when Allow is pressed, since the page's query is the
 * user's to edit. Throws OAuthError; returns what the page displays.
 */
function validateAuthRequest(params = {}) {
  const client = lookupClient(params.client_id);
  if (!client) throw new OAuthError('invalid_client', 'Unknown client');
  const redirectUri = params.redirect_uri;
  if (!redirectUri || !isAllowedRedirect(redirectUri)
    || (client.redirectUris && !client.redirectUris.includes(redirectUri))) {
    throw new OAuthError('invalid_request', 'redirect_uri is not registered for this client');
  }
  if (params.response_type && params.response_type !== 'code') {
    throw new OAuthError('unsupported_response_type', 'Only response_type=code is supported');
  }
  if (!params.code_challenge) throw new OAuthError('invalid_request', 'code_challenge is required (PKCE)');
  if ((params.code_challenge_method || 'plain') !== 'S256') {
    throw new OAuthError('invalid_request', 'code_challenge_method must be S256');
  }
  return {
    clientName: client.name || new URL(redirectUri).host,
    redirectHost: new URL(redirectUri).host,
  };
}

/** The code and its id; the caller stores the id on the user so it works once. */
function issueCode(email, params) {
  const jti = crypto.randomBytes(16).toString('hex');
  const code = sign({
    typ: 'mcp_code',
    sub: email,
    cid: params.client_id,
    ruri: params.redirect_uri,
    cc: params.code_challenge,
    scope: params.scope || SCOPES.join(' '),
    jti,
  }, CODE_TTL_S);
  return { code, jti };
}

/** `redirect_uri` with the query added (keeping any it already has). */
function withQuery(uri, query) {
  const url = new URL(uri);
  Object.entries(query).forEach(([k, v]) => { if (v != null && v !== '') url.searchParams.set(k, v); });
  return url.toString();
}

function pkceMatches(verifier, challenge) {
  if (typeof verifier !== 'string' || verifier.length < 43 || verifier.length > 128) return false;
  const hash = crypto.createHash('sha256').update(verifier).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return hash.length === challenge.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(challenge));
}

/**
 * Checks an authorization_code grant against its code. Returns the code's
 * payload; the caller still has to spend its `jti` on the user.
 */
function checkCodeGrant(body) {
  const payload = verify(body.code, 'mcp_code');
  if (!payload) throw new OAuthError('invalid_grant', 'Invalid or expired authorization code');
  if (body.client_id && body.client_id !== payload.cid) throw new OAuthError('invalid_grant', 'Code was issued to another client');
  if (body.redirect_uri !== payload.ruri) throw new OAuthError('invalid_grant', 'redirect_uri does not match');
  if (!pkceMatches(body.code_verifier, payload.cc)) throw new OAuthError('invalid_grant', 'PKCE verification failed');
  return payload;
}

function issueTokens(email, clientId, scope) {
  return {
    access_token: sign({
      typ: 'mcp_access', sub: email, cid: clientId, scope,
    }, ACCESS_TTL_S),
    refresh_token: sign({
      typ: 'mcp_refresh', sub: email, cid: clientId, scope,
    }, REFRESH_TTL_S),
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_S,
    scope,
  };
}

function checkRefreshGrant(body) {
  const payload = verify(body.refresh_token, 'mcp_refresh');
  if (!payload) throw new OAuthError('invalid_grant', 'Invalid or expired refresh token');
  if (body.client_id && body.client_id !== payload.cid) throw new OAuthError('invalid_grant', 'Token was issued to another client');
  return payload;
}

/** The email an access token speaks for, or null. */
function emailForAccessToken(token) {
  const payload = verify(token, 'mcp_access');
  return payload ? payload.sub : null;
}

/** Discovery documents, for the public origin the client used. */
function protectedResourceMetadata(base) {
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
    scopes_supported: SCOPES,
    resource_name: 'Routine Notes',
  };
}

function authorizationServerMetadata(base) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: SCOPES,
  };
}

module.exports = {
  STATIC_CLIENT_ID,
  OAuthError,
  isAllowedRedirect,
  registerClient,
  lookupClient,
  validateAuthRequest,
  issueCode,
  withQuery,
  pkceMatches,
  checkCodeGrant,
  checkRefreshGrant,
  issueTokens,
  emailForAccessToken,
  protectedResourceMetadata,
  authorizationServerMetadata,
};
