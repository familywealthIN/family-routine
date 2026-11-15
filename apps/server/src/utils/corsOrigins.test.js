const express = require('express');
const cors = require('cors');
const { isAllowedOrigin, graphqlCorsOptions, rejectForeignOrigin } = require('./corsOrigins');

describe('GraphQL origins', () => {
  it.each([
    'https://routinenotes.app',
    'https://app.routinenotes.app',
    'https://familywealth.in',
    'https://routine.familywealth.in',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://192.168.1.158:8080',
    undefined,
  ])('allows %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true);
  });

  it.each([
    'https://evil.example',
    'http://routinenotes.app',
    'https://routinenotes.app:8443',
    'https://notroutinenotes.app',
    'https://routinenotes.app.evil.example',
    'https://familywealth.in.evil.example',
    'https://routinenotes.ai',
    'capacitor://evil',
    'http://localhost.evil.example',
    'null',
  ])('refuses %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false);
  });
});

describe('the GraphQL CORS middleware', () => {
  let server;
  let base;
  beforeAll((done) => {
    const app = express();
    app.use(cors(graphqlCorsOptions));
    app.use(rejectForeignOrigin);
    app.post('/graphql', (req, res) => res.json({ data: { ok: true } }));
    server = app.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${server.address().port}`;
      done();
    });
  });
  afterAll((done) => { server.close(done); });

  const preflight = (origin) => fetch(`${base}/graphql`, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
  });

  it('answers the app\'s preflight with its own origin', async () => {
    const res = await preflight('https://routine.familywealth.in');
    expect(res.headers.get('access-control-allow-origin')).toBe('https://routine.familywealth.in');
    expect(res.headers.get('access-control-allow-headers')).toMatch(/authorization/);
  });

  it('gives another site no CORS headers, and refuses its request', async () => {
    const res = await preflight('https://evil.example');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    const post = await fetch(`${base}/graphql`, { method: 'POST', headers: { Origin: 'https://evil.example' } });
    expect(post.status).toBe(403);
  });

  it('lets a request with no Origin through (cron, curl)', async () => {
    expect((await fetch(`${base}/graphql`, { method: 'POST' })).status).toBe(200);
  });
});
