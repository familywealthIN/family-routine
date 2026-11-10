/* eslint-disable global-require */

// The MCP connector end to end, the way Claude's "Add custom connector" drives
// it: an unauthenticated call → 401 pointing at the resource metadata →
// authorization server metadata → dynamic registration → /authorize → the web
// app's consent (approveMcpAccess) → /token with PKCE → MCP over POST /mcp.
//
// Before this, none of it existed at the origin root, the token endpoint
// wanted a client secret the Lambda re-rolled on every cold start, and the
// consent page it redirected to had never been built.

process.env.JWT_SECRET = 'mcp-connector-test-secret';
process.env.ENCRYPTION_KEY = 'mcp-connector-test-key';
process.env.WEB_APP_URL = 'https://app.example.com';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { graphql } = require('graphql');

const EMAIL = 'me@example.com';
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';

const mockUsers = { authCode: null };
jest.mock('./schema/UserSchema', () => {
  const actual = jest.requireActual('./schema/UserSchema');
  const exec = (value) => ({ exec: () => Promise.resolve(value) });
  Object.assign(actual.UserModel, {
    findOneAndUpdate: jest.fn((filter, update) => {
      if (filter['oauth.authCode'] !== undefined) {
        // Spending a code: works once, for the code on file.
        if (filter.email !== 'me@example.com' || filter['oauth.authCode'] !== mockUsers.authCode) return exec(null);
        mockUsers.authCode = null;
        return exec({ email: filter.email });
      }
      if (update.$set && update.$set['oauth.authCode']) mockUsers.authCode = update.$set['oauth.authCode'];
      return exec({ email: filter.email });
    }),
    findOne: jest.fn(() => exec(null)),
  });
  return actual;
});

const { HttpMCPServer } = require('./mcp-http-server');
const { schema } = require('./resolvers');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const verifier = b64url(crypto.randomBytes(32));
const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());

let server;
let base;

beforeAll((done) => {
  server = new HttpMCPServer().app.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    done();
  });
});
afterAll((done) => { server.close(done); });

const form = (fields) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields).toString(),
});
const rpc = (token, message) => fetch(`${base}/mcp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
  body: JSON.stringify(message),
});

/** Discovery, registration, consent and the code exchange — the whole sign-in. */
async function signIn() {
  const unauth = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const metadataUrl = /resource_metadata="([^"]+)"/.exec(unauth.headers.get('www-authenticate'))[1];
  const resource = await (await fetch(metadataUrl)).json();
  const as = await (await fetch(`${resource.authorization_servers[0]}/.well-known/oauth-authorization-server`)).json();
  const client = await (await fetch(as.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'Claude', redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none' }),
  })).json();

  const authorize = new URL(as.authorization_endpoint);
  Object.entries({
    response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, state: 'xyz', code_challenge: challenge, code_challenge_method: 'S256',
  }).forEach(([k, v]) => authorize.searchParams.set(k, v));
  const consent = await fetch(authorize, { redirect: 'manual' });
  const page = new URL(consent.headers.get('location'));

  const args = Object.fromEntries(page.searchParams);
  const approved = await graphql(
    schema,
    `mutation ($c: String!, $r: String!, $cc: String, $m: String, $s: String) {
      approveMcpAccess(clientId: $c, redirectUri: $r, codeChallenge: $cc, codeChallengeMethod: $m, state: $s) { redirectTo }
    }`,
    null,
    { decodedToken: { email: EMAIL } },
    {
      c: args.client_id, r: args.redirect_uri, cc: args.code_challenge, m: args.code_challenge_method, s: args.state,
    },
  );
  const back = new URL(approved.data.approveMcpAccess.redirectTo);
  return {
    unauth, metadataUrl, resource, as, client, consent, page, back, code: back.searchParams.get('code'),
  };
}

describe('the MCP connector', () => {
  it('signs in like Claude does, then speaks MCP', async () => {
    const flow = await signIn();
    expect(flow.unauth.status).toBe(401);
    expect(flow.metadataUrl).toBe(`${base}/.well-known/oauth-protected-resource/mcp`);
    expect(flow.resource.resource).toBe(`${base}/mcp`);
    expect(flow.as).toMatchObject({ issuer: base, token_endpoint: `${base}/token`, code_challenge_methods_supported: ['S256'] });
    expect(flow.consent.status).toBe(302);
    expect(`${flow.page.origin}${flow.page.pathname}`).toBe('https://app.example.com/connect');
    expect(`${flow.back.origin}${flow.back.pathname}`).toBe(REDIRECT);
    expect(flow.back.searchParams.get('state')).toBe('xyz');

    const tokens = await (await fetch(`${base}/token`, form({
      grant_type: 'authorization_code', code: flow.code, redirect_uri: REDIRECT, client_id: flow.client.client_id, code_verifier: verifier,
    }))).json();
    expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 3600 });

    const init = await (await rpc(tokens.access_token, {
      jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude', version: '1' } },
    })).json();
    expect(init.result).toMatchObject({ protocolVersion: '2025-06-18', serverInfo: { name: 'routine-notes' }, capabilities: { tools: {} } });

    expect((await rpc(tokens.access_token, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    const list = await (await rpc(tokens.access_token, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    expect(list.result.tools.map((t) => t.name)).toContain('get_daily_goals');
    const unknown = await (await rpc(tokens.access_token, { jsonrpc: '2.0', id: 3, method: 'nope' })).json();
    expect(unknown.error.code).toBe(-32601);

    const refreshed = await (await fetch(`${base}/token`, form({
      grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: flow.client.client_id,
    }))).json();
    expect((await rpc(refreshed.access_token, { jsonrpc: '2.0', id: 4, method: 'ping' })).status).toBe(200);
  });

  it('a code works once, and only with its PKCE verifier', async () => {
    const { code, client } = await signIn();
    const exchange = (v) => fetch(`${base}/token`, form({
      grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: v,
    }));
    const wrong = await exchange(b64url(crypto.randomBytes(32)));
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).error).toBe('invalid_grant');
    expect((await exchange(verifier)).status).toBe(200);
    expect((await (await exchange(verifier)).json()).error_description).toMatch(/already used/);
  });

  it('never redirects a request it cannot trust', async () => {
    const { client } = await signIn();
    const url = new URL(`${base}/authorize`);
    Object.entries({
      response_type: 'code', client_id: client.client_id, redirect_uri: 'https://evil.example/cb', code_challenge: challenge, code_challenge_method: 'S256',
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, { redirect: 'manual' });
    expect(res.status).toBe(400);
    expect(res.headers.get('location')).toBeNull();

    const forged = await graphql(
      schema,
      'mutation { approveMcpAccess(clientId: "routine-notes-mcp", redirectUri: "http://evil.example/cb", codeChallenge: "x", codeChallengeMethod: "S256") { redirectTo } }',
      null,
      { decodedToken: { email: EMAIL } },
    );
    expect(forged.errors[0].message).toMatch(/redirect_uri/);
  });

  it('is public: any origin may call it and read the challenge', async () => {
    const pre = await fetch(`${base}/mcp`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://any-ai-app.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
    });
    expect(pre.headers.get('access-control-allow-origin')).toBe('*');
    const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { Origin: 'https://any-ai-app.example', 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-expose-headers')).toMatch(/WWW-Authenticate/);
  });

  it('a connector token is not an app session, and a bad one gets the challenge', async () => {
    const { code, client } = await signIn();
    const tokens = await (await fetch(`${base}/token`, form({
      grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: verifier,
    }))).json();
    expect(() => jwt.verify(tokens.access_token, process.env.JWT_SECRET)).toThrow();
    expect(() => jwt.verify(code, process.env.JWT_SECRET)).toThrow();

    const res = await rpc('mcp_not-a-token', { jsonrpc: '2.0', id: 1, method: 'ping' });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/error="invalid_token"/);
  });
});
