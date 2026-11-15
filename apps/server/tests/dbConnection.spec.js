jest.mock('mongoose', () => {
  const { EventEmitter } = jest.requireActual('events');
  const connection = new EventEmitter();
  return {
    connection,
    connections: [],
    connect: jest.fn(),
  };
});

const mongoose = require('mongoose');

const load = () => {
  let connect;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    connect = require('../src/db');
  });
  return connect;
};

describe('the Mongo connection', () => {
  beforeEach(() => {
    mongoose.connect.mockReset();
    mongoose.connection.removeAllListeners();
  });

  it('connects once and hands every later call the same connection', async () => {
    mongoose.connect.mockReturnValue(Promise.resolve(mongoose));
    const connect = load();

    const first = connect();
    const later = [connect(), connect(), connect()];

    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    later.forEach((p) => expect(p).toBe(first));
    await first;
  });

  // Every call used to add three more listeners to the connection.
  it('attaches its listeners once, however many calls a container serves', async () => {
    mongoose.connect.mockReturnValue(Promise.resolve(mongoose));
    const connect = load();
    for (let i = 0; i < 50; i += 1) connect();
    expect(mongoose.connection.listenerCount('error')).toBe(1);
    expect(mongoose.connection.listenerCount('close')).toBe(1);
    expect(mongoose.connection.listenerCount('open')).toBe(1);
  });

  // A failed connect used to stay cached, so the container failed every request
  // until Lambda recycled it.
  it('tries again after a failed connect', async () => {
    mongoose.connect
      .mockReturnValueOnce(Promise.reject(new Error('timeout')))
      .mockReturnValueOnce(Promise.resolve(mongoose));
    const connect = load();

    await expect(connect()).rejects.toThrow('timeout');
    await expect(connect()).resolves.toBe(mongoose);
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });
});
