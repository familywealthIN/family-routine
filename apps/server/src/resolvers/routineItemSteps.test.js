/* eslint-disable global-require */

/**
 * Standard steps on a new routine (utils/routineSteps.js).
 *
 * A routine made anywhere — the Routines editor, Priority → Automate, the
 * welcome wizard, an MCP client — starts with steps whose first one is the cue
 * that begins it. Locked here:
 *   1. addRoutineItem attaches the standard steps when the caller sent none,
 *      each with an id (the editor keys its rows on it),
 *   2. steps the caller DID send are never replaced,
 *   3. `suggestSteps: false` (the editor, once the user emptied the list
 *      themselves) keeps the routine stepless,
 *   4. a refused write never spends a suggestion,
 *   5. bulkAddRoutineItems (the welcome wizard) does the same per item,
 *   6. `suggestRoutineSteps` answers the editor, and needs a session.
 */

process.env.ENCRYPTION_KEY = 'routine-item-steps-test-key';

const mockFind = jest.fn();
const mockSave = jest.fn();
const mockSuggest = jest.fn();

jest.mock('../schema/RoutineItemSchema', () => {
  const actual = jest.requireActual('../schema/RoutineItemSchema');
  function RoutineItemModel(doc) {
    Object.assign(this, doc);
    this.save = () => mockSave(this);
  }
  RoutineItemModel.find = mockFind;
  RoutineItemModel.findOneAndUpdate = jest.fn();
  return { ...actual, RoutineItemModel };
});

jest.mock('../utils/aiApi', () => ({
  enhanceRoutineItemWithAI: jest.fn((item) => Promise.resolve({ ...item, description: 'd' })),
}));

jest.mock('../utils/routineSteps', () => ({
  suggestRoutineSteps: (...args) => mockSuggest(...args),
}));

const { query, mutation } = require('./routineItem');

const CONTEXT = { decodedToken: { email: 'me@example.com' } };
const JOGGING = ['Put on your running shoes', 'Step out the door', 'Run an easy 10 minutes'];

const add = (over = {}) => mutation.addRoutineItem.resolve(null, {
  name: 'Jogging', description: '', time: '07:00', points: 10, tags: [], ...over,
}, CONTEXT);

const names = (doc) => (doc.steps || []).map((step) => step.name);

beforeEach(() => {
  mockFind.mockReset();
  mockSave.mockReset();
  mockSuggest.mockReset();
  mockFind.mockReturnValue({ exec: () => Promise.resolve([]) });
  mockSave.mockImplementation((doc) => Promise.resolve(doc));
  mockSuggest.mockResolvedValue(JOGGING);
});

describe('addRoutineItem', () => {
  it('gives a routine sent without steps the standard ones, cue first', async () => {
    const saved = await add();
    expect(mockSuggest).toHaveBeenCalledWith('Jogging');
    expect(names(saved)).toEqual(JOGGING);
  });

  it('treats an empty list and a null the same as no steps (Priority, MCP)', async () => {
    expect(names(await add({ steps: [] }))).toEqual(JOGGING);
    expect(names(await add({ steps: null }))).toEqual(JOGGING);
  });

  it('mints a distinct id for every suggested step', async () => {
    const saved = await add();
    const ids = saved.steps.map((step) => step.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never replaces steps the caller sent', async () => {
    const steps = [{ id: 'mine', name: 'Lace up' }];
    const saved = await add({ steps });
    expect(saved.steps).toEqual(steps);
    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('keeps a routine stepless when the caller opted out', async () => {
    const saved = await add({ steps: [], suggestSteps: false });
    expect(saved.steps).toEqual([]);
    expect(mockSuggest).not.toHaveBeenCalled();
    // The flag steers the resolver; it is not a field of the routine.
    expect(saved).not.toHaveProperty('suggestSteps');
  });

  it('saves with no steps when there are no suggestions for the name', async () => {
    mockSuggest.mockResolvedValue([]);
    const saved = await add({ name: 'Pottery' });
    expect(saved.steps).toEqual([]);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('does not ask for suggestions when the write is refused', async () => {
    mockFind.mockReturnValue({ exec: () => Promise.resolve([{ _id: 'a', points: 100 }]) });
    await expect(add()).rejects.toThrow(/points/);
    expect(mockSuggest).not.toHaveBeenCalled();
  });
});

describe('bulkAddRoutineItems (the welcome wizard)', () => {
  it('gives each stepless item its own standard steps, and keeps given ones', async () => {
    mockSuggest.mockImplementation((name) => Promise.resolve(name === 'Jogging' ? JOGGING : []));
    const saved = await mutation.bulkAddRoutineItems.resolve(null, {
      routineItems: [
        { name: 'Jogging', time: '07:00', points: 10 },
        { name: 'Pottery', time: '18:00', points: 10 },
        {
          name: 'Reading', time: '21:00', points: 10, steps: [{ id: 'r', name: 'Open the book' }],
        },
      ],
    }, CONTEXT);
    expect(names(saved[0])).toEqual(JOGGING);
    expect(saved[1].steps).toEqual([]);
    expect(saved[2].steps).toEqual([{ id: 'r', name: 'Open the book' }]);
    expect(mockSuggest).toHaveBeenCalledTimes(2);
  });
});

describe('suggestRoutineSteps', () => {
  const ask = (name, context = CONTEXT) => query.suggestRoutineSteps.resolve(null, { name }, context);

  it('answers the standard steps for a name', async () => {
    await expect(ask('Jogging')).resolves.toEqual(JOGGING);
    expect(mockSuggest).toHaveBeenCalledWith('Jogging');
  });

  it('needs a signed-in user, like the other routine queries', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      expect(() => ask('Jogging', {})).toThrow(/401/);
      expect(mockSuggest).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});
