/* eslint-disable global-require, func-names */

// Field encryption at rest for routine items, exercised through the real
// mongoose save pipeline (parent + step subdocument hooks) with only the
// database write stubbed out, plus the findOneAndUpdate / read hooks.

process.env.ENCRYPTION_KEY = 'routine-item-schema-test-key';

const { encryption } = require('../utils/encryption');
const {
  RoutineItemModel,
  encryptRoutineItemUpdate,
  decryptRoutineItemData,
} = require('./RoutineItemSchema');

const isOurCiphertext = (value) => encryption.decrypt(value) !== value;

describe('RoutineItemSchema encryption', () => {
  let stored;

  beforeEach(() => {
    stored = null;
    // Stand-in for the Mongo insert: record what would be written, succeed.
    jest.spyOn(RoutineItemModel.prototype, '$__handleSave').mockImplementation(function (options, cb) {
      stored = this.toObject({ depopulate: true });
      cb(null, { n: 1 });
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const newItem = () => new RoutineItemModel({
    name: 'Morning run',
    description: 'Run 5km around the park',
    email: 'u@example.com',
    time: '06:00',
    points: 10,
    steps: [{ id: 's1', name: 'Stretch' }, { id: 's2', name: 'Run' }],
  });

  it('stores name, description and steps encrypted exactly once', async () => {
    await newItem().save();

    expect(stored.email).toBe('u@example.com');
    ['name', 'description'].forEach((field) => {
      expect(isOurCiphertext(stored[field])).toBe(true);
    });
    expect(encryption.decrypt(stored.name)).toBe('Morning run');
    expect(encryption.decrypt(stored.description)).toBe('Run 5km around the park');
    // One decrypt must yield plaintext: no second layer from a step hook.
    expect(stored.steps.map((s) => encryption.decrypt(s.name))).toEqual(['Stretch', 'Run']);
  });

  it('returns plaintext from save() (create toast)', async () => {
    const saved = await newItem().save();
    expect(saved.name).toBe('Morning run');
    expect(saved.description).toBe('Run 5km around the park');
    expect(Array.from(saved.steps, (s) => s.name)).toEqual(['Stretch', 'Run']);
  });

  it('re-saving a returned doc does not stack a second layer', async () => {
    const saved = await newItem().save();
    await saved.save();
    expect(encryption.decrypt(stored.name)).toBe('Morning run');
    expect(stored.steps.map((s) => encryption.decrypt(s.name))).toEqual(['Stretch', 'Run']);
  });

  it('encrypts findOneAndUpdate payloads (bare and $set)', () => {
    const bare = {
      id: 'x', name: 'Edited', description: 'New desc', time: '07:00', steps: [{ id: 's1', name: 'Walk' }],
    };
    encryptRoutineItemUpdate.call({ getUpdate: () => bare }, () => {});
    expect(encryption.decrypt(bare.name)).toBe('Edited');
    expect(encryption.decrypt(bare.description)).toBe('New desc');
    expect(encryption.decrypt(bare.steps[0].name)).toBe('Walk');
    expect(bare.steps[0].id).toBe('s1');
    expect(bare.time).toBe('07:00');

    const wrapped = { $set: { name: 'Edited' } };
    encryptRoutineItemUpdate.call({ getUpdate: () => wrapped }, () => {});
    expect(encryption.decrypt(wrapped.$set.name)).toBe('Edited');
  });

  it('registers the findOneAndUpdate encryption hook and delete/save decrypt hooks', () => {
    const { hooks } = RoutineItemModel.schema.s;
    expect(hooks._pres.get('findOneAndUpdate').map((h) => h.fn)).toContain(encryptRoutineItemUpdate);
    ['findOneAndRemove', 'findOneAndDelete', 'save'].forEach((name) => {
      expect(hooks._posts.get(name).map((h) => h.fn)).toContain(decryptRoutineItemData);
    });
  });

  it('reads tolerate plaintext and legacy double-encrypted steps', () => {
    const doc = {
      name: 'Plain name',
      description: encryption.encrypt('Once'),
      steps: [
        { id: 'a', name: encryption.encrypt(encryption.encrypt('Twice')) },
        { id: 'b', name: 'Plain step' },
      ],
    };
    decryptRoutineItemData(doc);
    expect(doc.name).toBe('Plain name');
    expect(doc.description).toBe('Once');
    expect(doc.steps.map((s) => s.name)).toEqual(['Twice', 'Plain step']);
  });
});
