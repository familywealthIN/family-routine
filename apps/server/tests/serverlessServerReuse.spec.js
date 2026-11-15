process.env.ENCRYPTION_KEY = 'serverless-reuse-test-key';
process.env.JWT_SECRET = 'serverless-reuse-test-secret';

jest.mock('aws-serverless-express', () => {
  const servers = [];
  return {
    servers,
    createServer: jest.fn((app) => {
      const server = { app };
      servers.push(server);
      return server;
    }),
    proxy: jest.fn(() => undefined),
  };
});

const awsServerlessExpress = require('aws-serverless-express');
const { startServerless, serverlessServer } = require('../src/graphql');

// Before: every Lambda call ran `app.use('/', startGraphQL)` and
// `createServer(app)` again, so a warm container stacked one more copy of the
// route and left one more server listening for every request it had served.
describe('the Lambda GraphQL server', () => {
  it('is made once and reused by every call after it', () => {
    const app = serverlessServer().app;
    // eslint-disable-next-line no-underscore-dangle
    const layers = () => app._router.stack.length;

    startServerless({}, {});
    const afterFirst = layers();
    for (let i = 0; i < 25; i += 1) startServerless({}, {});

    expect(awsServerlessExpress.createServer).toHaveBeenCalledTimes(1);
    expect(layers()).toBe(afterFirst);
    const proxied = awsServerlessExpress.proxy.mock.calls.map(([server]) => server);
    expect(new Set(proxied).size).toBe(1);
  });

  it('lets Lambda answer without waiting for the event loop to drain', () => {
    const context = {};
    startServerless({}, context);
    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
  });
});
