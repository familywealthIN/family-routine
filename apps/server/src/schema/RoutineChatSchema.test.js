/**
 * Chat bodies are the same class of content as goal items, so they are
 * encrypted at rest. `text` rides on ENCRYPTION_FIELDS, but `proposals` is an
 * array — encryptObject only handles scalar string fields — so the schema
 * encrypts it element-wise. These assert the round trip, with no database.
 */
const {
  RoutineChatMessageModel,
} = require('./RoutineChatSchema');
const { encryption } = require('./../utils/encryption');

// Mongoose registers several internal pre('save') hooks; pick ours by name.
const encryptHook = () => {
  const pres = RoutineChatMessageModel.schema.s.hooks._pres.get('save');
  const hook = pres.find((entry) => entry.fn && entry.fn.name === 'encryptMessage');
  if (!hook) throw new Error('encryptMessage pre-save hook not registered');
  return hook.fn;
};

const message = (over = {}) => new RoutineChatMessageModel({
  email: 'a@b.c',
  date: '12-09-2026',
  taskRef: 'sw',
  from: 'routine',
  text: 'Here is “Ship dashboard PR” in three steps:',
  proposals: ['Write the PR description', 'Request review from Ana'],
  ...over,
});

const saved = (doc) => {
  encryptHook().call(doc, () => {});
  return doc;
};

describe('RoutineChatMessage encryption at rest', () => {
  it('encrypts the message body', () => {
    const doc = saved(message());
    expect(doc.text).not.toBe('Here is “Ship dashboard PR” in three steps:');
    expect(encryption.decrypt(doc.text)).toBe('Here is “Ship dashboard PR” in three steps:');
  });

  it('encrypts every proposal, not just the array as a whole', () => {
    const doc = saved(message());
    expect(doc.proposals).toHaveLength(2);
    doc.proposals.forEach((proposal) => {
      expect(proposal).not.toContain('PR description');
      expect(proposal).not.toContain('Request review');
    });
    expect(doc.proposals.map((p) => encryption.decrypt(p)))
      .toEqual(['Write the PR description', 'Request review from Ana']);
  });

  it('leaves the fields queries filter on readable', () => {
    const doc = saved(message());
    expect(doc.email).toBe('a@b.c');
    expect(doc.date).toBe('12-09-2026');
    expect(doc.taskRef).toBe('sw');
    expect(doc.from).toBe('routine');
  });

  it('handles a message with no proposals', () => {
    const doc = saved(message({ proposals: [] }));
    // A mongoose array, so assert the contents rather than the constructor.
    expect(Array.from(doc.proposals)).toEqual([]);
  });

  // `decrypt()` returns anything that is not ciphertext unchanged, so rows
  // written before the proposals were encrypted still read correctly.
  it('reads a plaintext proposal written before encryption existed', () => {
    expect(encryption.decrypt('Write the PR description')).toBe('Write the PR description');
  });
});
