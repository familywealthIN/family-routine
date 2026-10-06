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

describe('AgentSchema at-rest encryption hooks', () => {
  let AgentModel;
  let encryptAgentUpdate;
  let enc;
  let stored;

  beforeAll(() => {
    jest.resetModules();
    process.env.ENCRYPTION_KEY = 'agent-schema-test-key';
    ({ AgentModel, encryptAgentUpdate } = require('./AgentSchema'));
    enc = require('../utils/encryption').encryption;
  });

  beforeEach(() => {
    stored = null;
    // Stand-in for the Mongo write: record what would be persisted, succeed.
    // eslint-disable-next-line func-names
    jest.spyOn(AgentModel.prototype, '$__handleSave').mockImplementation(function (options, cb) {
      stored = this.toObject({ depopulate: true });
      cb(null, { n: 1 });
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const newAgent = () => new AgentModel({
    name: 'Deploy bot',
    email: 'u@example.com',
    taskRef: 't1',
    startEvent: { kind: 'url', value: 'https://example.com/start' },
    endEvent: { kind: 'curl', value: 'curl https://example.com/end' },
  });

  it('save() (addAgent) persists ciphertext but returns plaintext', async () => {
    const saved = await newAgent().save();
    expect(enc.decrypt(stored.name)).toBe('Deploy bot');
    expect(stored.name).not.toBe('Deploy bot');
    expect(enc.decrypt(stored.startEvent.value)).toBe('https://example.com/start');
    expect(enc.decrypt(stored.endEvent.value)).toBe('curl https://example.com/end');

    expect(saved.name).toBe('Deploy bot');
    expect(saved.startEvent.value).toBe('https://example.com/start');
    expect(saved.endEvent.value).toBe('curl https://example.com/end');
  });

  it('re-save (updateAgent) returns plaintext and never double-encrypts', async () => {
    const saved = await newAgent().save();
    saved.name = 'Renamed';
    const updated = await saved.save();
    expect(updated.name).toBe('Renamed');
    expect(updated.startEvent.value).toBe('https://example.com/start');
    expect(enc.decrypt(stored.name)).toBe('Renamed');
    expect(enc.decrypt(stored.startEvent.value)).toBe('https://example.com/start');
  });

  it('encrypts findOneAndUpdate payloads (recordAgentExecution)', () => {
    const update = {
      $set: { executionStatus: 'failed', lastResultBody: '<p>ok</p>', lastError: 'boom' },
      $inc: { failureCount: 1 },
    };
    encryptAgentUpdate.call({ getUpdate: () => update }, () => {});
    expect(update.$set.executionStatus).toBe('failed');
    expect(update.$set.lastResultBody).not.toBe('<p>ok</p>');
    expect(enc.decrypt(update.$set.lastResultBody)).toBe('<p>ok</p>');
    expect(enc.decrypt(update.$set.lastError)).toBe('boom');
  });

  it('reads tolerate plaintext rows left by older writes', async () => {
    const { decryptAgentDocs } = require('./AgentSchema');
    const doc = { name: enc.encrypt('N'), lastResultBody: 'plain body', startEvent: { kind: 'url', value: 'https://x.y' } };
    decryptAgentDocs(doc);
    expect(doc).toMatchObject({ name: 'N', lastResultBody: 'plain body', startEvent: { value: 'https://x.y' } });
  });
});
