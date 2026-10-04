/**
 * The bearer-token middleware must never refuse a request outright.
 *
 * The client attaches the stored token to EVERY operation (main.js
 * authMiddleware), `authGoogle` included, and tokens last 60 days
 * (passport.js). When the middleware answered 401 for an unverifiable token,
 * an expired token locked the user out of signing back in: the very request
 * that would have minted a fresh one was refused before it reached GraphQL.
 *
 * `getEmailfromSession` is the real gate — these only assert that the
 * middleware decodes what it can and otherwise gets out of the way.
 */
const jwt = require('jsonwebtoken');

const { attachDecodedToken } = require('../src/graphql');

const JWT_SECRET = 'test-secret';

const run = (authorization) => {
  const req = authorization ? { headers: { authorization } } : { headers: {} };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  return new Promise((resolve) => {
    attachDecodedToken(req, res, () => resolve({ req, res }));
  });
};

describe('attachDecodedToken', () => {
  const saved = process.env.JWT_SECRET;

  beforeAll(() => { process.env.JWT_SECRET = JWT_SECRET; });
  afterAll(() => {
    if (saved === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved;
  });

  const sign = (payload) => jwt.sign(payload, JWT_SECRET);

  it('decodes a valid token onto the request', async () => {
    const token = sign({ email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 3600 });
    const { req, res } = await run(`Bearer ${token}`);
    expect(req.decodedToken.email).toBe('a@b.c');
    expect(res.statusCode).toBeNull();
  });

  // The lockout: an expired token must leave the user unauthenticated, not
  // refused, so `authGoogle` can still run and issue a fresh one.
  it('passes an EXPIRED token through as unauthenticated', async () => {
    const token = sign({ email: 'a@b.c', exp: Math.floor(Date.now() / 1000) - 10 });
    const { req, res } = await run(`Bearer ${token}`);
    expect(req.decodedToken).toBeUndefined();
    expect(res.statusCode).toBeNull();
    expect(res.body).toBeNull();
  });

  it('passes a token signed with the wrong secret through as unauthenticated', async () => {
    const token = jwt.sign({ email: 'a@b.c' }, 'some-other-secret');
    const { req, res } = await run(`Bearer ${token}`);
    expect(req.decodedToken).toBeUndefined();
    expect(res.statusCode).toBeNull();
  });

  it('passes garbage through as unauthenticated', async () => {
    const { req, res } = await run('Bearer not-a-jwt');
    expect(req.decodedToken).toBeUndefined();
    expect(res.statusCode).toBeNull();
  });

  it('ignores a header that is not a bearer token', async () => {
    const { req, res } = await run('Basic dXNlcjpwYXNz');
    expect(req.decodedToken).toBeUndefined();
    expect(res.statusCode).toBeNull();
  });

  it('continues when there is no Authorization header at all', async () => {
    const { req, res } = await run(null);
    expect(req.decodedToken).toBeUndefined();
    expect(res.statusCode).toBeNull();
  });
});
