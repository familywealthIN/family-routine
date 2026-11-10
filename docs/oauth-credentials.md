# The MCP connector: signing in AI apps

Claude, ChatGPT, n8n, Gemini CLI and other MCP clients connect to Routine Notes
with one address:

```
https://mcp.routinenotes.app/mcp
```

They find everything else themselves. There is **no client secret**: each app
registers itself and signs in with PKCE, and the user approves it on the
`/connect` page of the web app.

## The flow

1. The app calls `POST /mcp` with no token and gets `401` with
   `WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource/mcp"`.
2. It reads that document, then `/.well-known/oauth-authorization-server`.
3. It registers at `POST /register` (RFC 7591). The client id it gets back is
   signed and carries the app's redirect URIs; nothing is stored.
4. It opens `GET /authorize`. A request that fails the checks (unknown client,
   unregistered `redirect_uri`, no S256 `code_challenge`) gets a 400 page and is
   never redirected. A good one goes to `WEB_APP_URL/connect?...`.
5. `/connect` (ConnectApp.vue) asks the user to sign in if needed, checks the
   request again (`mcpAuthRequest`), shows who is asking and where Allow goes,
   and on **Allow** calls `approveMcpAccess`, which returns the redirect with a
   one-time code. **Cancel** sends `error=access_denied`.
6. The app exchanges the code at `POST /token` with its PKCE verifier and gets
   a 1-hour access token and a 90-day refresh token.
7. It speaks MCP over `POST /mcp` (Streamable HTTP, JSON responses, no
   sessions): `initialize`, `tools/list`, `tools/call`, `resources/*`, `ping`.

The pre-registered client `routine-notes-mcp` is public too (PKCE, no secret)
and accepts any https redirect, or http to localhost, for apps whose forms ask
for a Client ID (n8n).

Code: `apps/server/src/utils/mcpOAuth.js` (tokens and checks),
`src/mcpAuthRoutes.js` (the endpoints), `src/resolvers/mcpConnect.js` (the
consent page's two calls), `src/mcp-http-server.js` (`POST /mcp`). Tested end to
end in `src/mcpConnector.test.js`.

## Tokens

Codes, access and refresh tokens and client ids are JWTs signed with a key
**derived** from `JWT_SECRET`, each with its own `typ`. None of them is accepted
as an app session, and a code works once: its id is stored on the user
(`oauth.authCode`) and spent atomically at `/token`. A successful exchange sets
`oauth.connectedAt`, which turns the Connect AI chip to Connected.

The legacy API key (`X-API-Key`) still works on every `/mcp` route.

## The two domains

Both are custom domains on the same API Gateway API, each mapped to the `dev`
stage with an **empty base path**:

| Domain | Serves | Who may call it from a browser |
|---|---|---|
| `api.routinenotes.app` | `/graphql` (the app's API) | only `routinenotes.app` and `familywealth.in` (apex or any subdomain, https), the mobile apps (`capacitor://localhost`, `http(s)://localhost`) and local dev (`src/utils/corsOrigins.js`); any other site gets 403 |
| `mcp.routinenotes.app` | `/mcp`, `/.well-known/…`, `/authorize`, `/token`, `/register` | anyone: the MCP server is public, CORS is open, and a token is what lets a caller in |

The empty base path is what MCP needs: clients look for `/.well-known/…`,
`/authorize`, `/token` and `/register` at the **root** of the server's origin.
On the raw API Gateway address
(`https://<id>.execute-api.ap-south-1.amazonaws.com/dev/mcp`) the root is outside
the `/dev` stage, so API Gateway answers `{"message":"Forbidden"}` before the
Lambda runs.

CORS only stops other websites. Requests with no `Origin` (curl, cron, n8n,
server to server) still reach GraphQL, where the session token is the gate.

### Setting them up (once)

1. ACM (ap-south-1): request one certificate for `api.routinenotes.app` and
   `mcp.routinenotes.app` (or `*.routinenotes.app`), validate it by DNS.
2. API Gateway → Custom domain names → Create, for each domain: Regional, that
   certificate.
3. API mappings, for each: API `dev-familywealth-graphql-api`, stage `dev`, path empty.
4. DNS for `routinenotes.app`: a CNAME `api` and a CNAME `mcp`, each to that
   domain's "API Gateway domain name" (`d-….execute-api.ap-south-1.amazonaws.com`).
5. Server secrets: `MCP_BASE_URL` = `https://mcp.routinenotes.app` (only a
   fallback: the server reads the origin from each request), and `WEB_APP_URL` =
   the production web app's origin (`/authorize` sends people to its `/connect`
   page).
6. Point the clients at the new API, then deploy them:
   - Netlify (web app): env `GQL_URL` = `https://api.routinenotes.app/graphql`.
   - GitHub secret `GQL_URL` (mobile builds) the same, or leave it unset: the
     workflows default to it.

Keep the execute-api URL working until the store apps built against it have
been replaced: the old address still reaches the same Lambdas.

## Checking a deployment

```bash
curl -i https://mcp.routinenotes.app/mcp -X POST -H 'Content-Type: application/json' -d '{}'
# 401 with a WWW-Authenticate header naming the resource metadata
curl -i -X OPTIONS https://api.routinenotes.app/graphql -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST'
# no Access-Control-Allow-Origin header: other sites can't call GraphQL
curl https://mcp.routinenotes.app/.well-known/oauth-authorization-server
```

Then add the connector in Claude (Settings → Connectors → Add custom connector)
and Allow it on the page that opens.
