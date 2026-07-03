/* eslint-disable global-require */

// Tests focus on the parts of the agent layer that don't require a live
// MongoDB: encryption round-trip on agent fields and event values, plus the
// in-memory schema definition (enums, defaults, indexes).

process.env.ENCRYPTION_KEY = 'agent-schema-test-key';

const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

describe('Agent encryption fields', () => {
  it('exposes agent + agentEvent field lists', () => {
    expect(ENCRYPTION_FIELDS.agent).toEqual(expect.arrayContaining(['name', 'lastResultBody', 'lastError']));
    expect(ENCRYPTION_FIELDS.agentEvent).toEqual(['value']);
  });

  it('round-trips agent name + lastResultBody', () => {
    const plain = {
      name: 'My Agent',
      lastResultBody: '<html><body>hello</body></html>',
      lastError: 'nope',
    };
    const encrypted = encryption.encryptObject(plain, ENCRYPTION_FIELDS.agent);
    expect(encrypted.name).not.toEqual(plain.name);
    expect(encrypted.lastResultBody).not.toEqual(plain.lastResultBody);

    const decrypted = encryption.decryptObject(encrypted, ENCRYPTION_FIELDS.agent);
    expect(decrypted.name).toEqual(plain.name);
    expect(decrypted.lastResultBody).toEqual(plain.lastResultBody);
    expect(decrypted.lastError).toEqual(plain.lastError);
  });

  it('round-trips event config value', () => {
    const event = { kind: 'curl', value: 'curl -X POST https://example.com -d body=1' };
    const encrypted = encryption.encryptObject(event, ENCRYPTION_FIELDS.agentEvent);
    expect(encrypted.value).not.toEqual(event.value);
    expect(encrypted.kind).toEqual('curl');

    const decrypted = encryption.decryptObject(encrypted, ENCRYPTION_FIELDS.agentEvent);
    expect(decrypted.value).toEqual(event.value);
  });
});

describe('AgentSchema definition', () => {
  // Avoid the file's GraphQL-side imports re-registering models across tests
  beforeAll(() => {
    jest.resetModules();
    process.env.ENCRYPTION_KEY = 'agent-schema-test-key';
  });

  it('declares the unique (email, taskRef) index and execution status enum', () => {
    const {
      AgentSchema, EVENT_KINDS, STATUSES,
    } = require('./AgentSchema');

    expect(EVENT_KINDS).toEqual(['url', 'curl', 'notify', 'log']);
    expect(STATUSES).toEqual(['idle', 'running', 'listening', 'finished', 'failed']);

    const indexes = AgentSchema.indexes();
    const hasUniqueIndex = indexes.some(([fields, options]) => (
      fields && fields.email === 1 && fields.taskRef === 1 && options && options.unique === true
    ));
    expect(hasUniqueIndex).toBe(true);

    const statusPath = AgentSchema.path('executionStatus');
    expect(statusPath.enumValues).toEqual(STATUSES);
    expect(statusPath.defaultValue).toEqual('idle');

    expect(AgentSchema.path('successCount').defaultValue).toEqual(0);
    expect(AgentSchema.path('failureCount').defaultValue).toEqual(0);
  });
});
