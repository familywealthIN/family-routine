const { warm, isWarmup, MAX_CONCURRENCY } = require('../src/utils/warmer');

const context = { functionName: 'familywealth-graphql-api-dev-query' };

describe('the GraphQL warm-up', () => {
  it('knows its own event, and nothing else', () => {
    expect(isWarmup({ warmer: true })).toBe(true);
    expect(isWarmup({ httpMethod: 'POST', path: '/graphql', body: '{"warmer":true}' })).toBe(false);
    expect(isWarmup(null)).toBe(false);
  });

  it('connects to Mongo and calls N - 1 copies of itself, all at once', async () => {
    const connect = jest.fn(() => Promise.resolve());
    let inFlight = 0;
    let peak = 0;
    const invoke = jest.fn(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => { setTimeout(r, 20); });
      inFlight -= 1;
    });

    const result = await warm({ warmer: true, concurrency: 6 }, context, { connect, invoke });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledTimes(5);
    expect(invoke).toHaveBeenCalledWith('familywealth-graphql-api-dev-query');
    // Concurrent, or Lambda would serve them all from one container.
    expect(peak).toBe(5);
    expect(result).toEqual({ warmed: 6, failed: 0 });
  });

  it('a copy holds its container and never fans out again', async () => {
    const invoke = jest.fn();
    const started = Date.now();
    const result = await warm({ warmer: true, copy: true, concurrency: 6 }, context, {
      connect: () => Promise.resolve(), invoke,
    });
    expect(invoke).not.toHaveBeenCalled();
    expect(Date.now() - started).toBeGreaterThanOrEqual(150);
    expect(result).toEqual({ warmed: 1, failed: 0 });
  });

  it('counts a copy that failed instead of failing the warm-up', async () => {
    let n = 0;
    const invoke = jest.fn(() => {
      n += 1;
      return n === 2 ? Promise.reject(new Error('throttled')) : Promise.resolve();
    });
    const result = await warm({ warmer: true, concurrency: 3 }, context, {
      connect: () => Promise.resolve(), invoke,
    });
    expect(result).toEqual({ warmed: 2, failed: 1 });
  });

  it('caps the fan-out and treats a missing count as one', async () => {
    const invoke = jest.fn(() => Promise.resolve());
    await warm({ warmer: true, concurrency: 500 }, context, { connect: () => Promise.resolve(), invoke });
    expect(invoke).toHaveBeenCalledTimes(MAX_CONCURRENCY - 1);

    invoke.mockClear();
    const result = await warm({ warmer: true }, context, { connect: () => Promise.resolve(), invoke });
    expect(invoke).not.toHaveBeenCalled();
    expect(result.warmed).toBe(1);
  });

  it('still answers when Mongo cannot be reached', async () => {
    const result = await warm({ warmer: true, concurrency: 1 }, context, {
      connect: () => Promise.reject(new Error('timeout')), invoke: jest.fn(),
    });
    expect(result).toEqual({ warmed: 1, failed: 0 });
  });
});

describe('the Lambda entry', () => {
  it('answers a warm-up without starting GraphQL', async () => {
    jest.resetModules();
    jest.doMock('../src/db', () => jest.fn(() => Promise.resolve()));
    const startServerless = jest.fn();
    jest.doMock('../src/graphql', () => ({ startServerless }));
    // eslint-disable-next-line global-require
    const { handler } = require('../handler');

    const result = await handler({ warmer: true, concurrency: 1 }, { functionName: 'f' });

    expect(result).toEqual({ warmed: 1, failed: 0 });
    expect(startServerless).not.toHaveBeenCalled();
  });
});
