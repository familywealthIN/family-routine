/* eslint-disable global-require */

/**
 * The routine points rules, enforced by the server (E2E BUG-4).
 *
 * They used to live only in the Routines editor, so the MCP schema, the
 * welcome wizard's bulk add or an outdated web build could push the day past
 * 100 points. The numbers are the editor's own (dayDial POINTS_MIN and
 * DAILY_POINTS_BUDGET), and so is the refusal copy.
 *
 * Live data already breaks the rules — 0-point items and over-budget days — so
 * a write is refused only when it makes things worse. Editing a legacy routine
 * without raising it must keep working.
 */

process.env.ENCRYPTION_KEY = 'routine-item-budget-test-key';

const mockFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockSave = jest.fn();

jest.mock('../schema/RoutineItemSchema', () => {
  const actual = jest.requireActual('../schema/RoutineItemSchema');
  function RoutineItemModel(doc) {
    Object.assign(this, doc);
    this.save = () => mockSave(this);
  }
  RoutineItemModel.find = mockFind;
  RoutineItemModel.findOneAndUpdate = mockFindOneAndUpdate;
  return { ...actual, RoutineItemModel };
});

jest.mock('../utils/aiApi', () => ({
  enhanceRoutineItemWithAI: jest.fn(() => Promise.resolve({ description: 'd', steps: [] })),
}));

const { mutation, DAILY_POINTS_BUDGET, POINTS_MIN } = require('./routineItem');

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };
const exec = (value) => ({ exec: () => Promise.resolve(value) });

const item = (id, points) => ({ _id: { toString: () => id }, name: id, points });

const stored = (items) => mockFind.mockReturnValue(exec(items));

const add = (points) => mutation.addRoutineItem.resolve(null, {
  name: 'New', description: '', time: '19:30', points, steps: [], tags: [],
}, CONTEXT);

const update = (id, points) => mutation.updateRoutineItem.resolve(null, {
  id, name: 'Renamed', description: '', time: '19:30', points, steps: [], tags: [],
}, CONTEXT);

const bulk = (pointsList) => mutation.bulkAddRoutineItems.resolve(null, {
  routineItems: pointsList.map((points, i) => ({ name: `B${i}`, time: '07:00', points })),
}, CONTEXT);

const ALL_GIVEN_OUT = '400:All 100 points of the day are already given out — lower another routine to make room';

beforeEach(() => {
  mockFind.mockReset();
  mockFindOneAndUpdate.mockReset();
  mockSave.mockReset();
  mockSave.mockImplementation((doc) => Promise.resolve(doc));
  mockFindOneAndUpdate.mockImplementation((filter, args) => exec({ ...args }));
});

it('reuses the editor\'s numbers', () => {
  expect(POINTS_MIN).toBe(1);
  expect(DAILY_POINTS_BUDGET).toBe(100);
});

describe('addRoutineItem', () => {
  it('refuses a routine worth less than 1 point', async () => {
    stored([item('a', 10)]);
    await expect(add(0)).rejects.toMatchObject({ message: '400:Points must be at least 1', networkStatus: 400 });
    await expect(add(-5)).rejects.toThrow('400:Points must be at least 1');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('creates a routine that fits the day exactly', async () => {
    stored([item('a', 60), item('b', 30)]);
    await expect(add(10)).resolves.toMatchObject({ points: 10, email: EMAIL });
    expect(mockFind).toHaveBeenCalledWith({ email: EMAIL });
  });

  it('refuses one that takes the day over 100, naming what is left', async () => {
    stored([item('a', 60), item('b', 39)]);
    await expect(add(2)).rejects.toThrow('400:Points must be 1 or fewer');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('says the day is spent when nothing is left', async () => {
    stored([item('a', 60), item('b', 40)]);
    await expect(add(1)).rejects.toThrow(ALL_GIVEN_OUT);
  });

  it('counts a legacy 0-point routine as nothing, like the editor does', async () => {
    stored([item('a', 99), item('legacy', 0), { _id: 'x' }]);
    await expect(add(1)).resolves.toMatchObject({ points: 1 });
  });
});

describe('updateRoutineItem', () => {
  it('refuses lowering a routine below 1 point', async () => {
    stored([item('a', 10)]);
    await expect(update('a', 0)).rejects.toThrow('400:Points must be at least 1');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('re-saves a routine at its own points on a full day — its points are added back', async () => {
    stored([item('a', 30), item('b', 70)]);
    await expect(update('a', 30)).resolves.toMatchObject({ name: 'Renamed', points: 30 });
  });

  it('refuses raising a routine past the budget', async () => {
    stored([item('a', 30), item('b', 65)]);
    await expect(update('a', 36)).rejects.toThrow('400:Points must be 35 or fewer');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  describe('on a day that is already over budget', () => {
    beforeEach(() => stored([item('a', 50), item('b', 50), item('c', 20)]));

    it('still refuses any increase, naming what the others leave', async () => {
      // b + c = 70, so `a` may hold 30 — it holds 50 today, and 51 is a raise.
      await expect(update('a', 51)).rejects.toThrow('400:Points must be 30 or fewer');
    });

    it('lets a routine be lowered, even though the day stays over', async () => {
      await expect(update('a', 45)).resolves.toMatchObject({ points: 45 });
    });

    it('lets a routine be renamed at unchanged points', async () => {
      await expect(update('c', 20)).resolves.toMatchObject({ name: 'Renamed', points: 20 });
    });
  });

  it('lets a legacy 0-point routine be edited while it stays at 0', async () => {
    stored([item('a', 100), item('legacy', 0)]);
    await expect(update('legacy', 0)).resolves.toMatchObject({ name: 'Renamed', points: 0 });
  });

  it('does not let a legacy 0-point routine go negative', async () => {
    stored([item('legacy', 0)]);
    await expect(update('legacy', -1)).rejects.toThrow('400:Points must be at least 1');
  });

  it('leaves an unknown id to the update, which answers null as before', async () => {
    stored([item('a', 100)]);
    mockFindOneAndUpdate.mockReturnValue(exec(null));
    await expect(update('someone-elses', 80)).resolves.toBe(null);
    expect(mockFindOneAndUpdate.mock.calls[0][0]).toEqual({ _id: 'someone-elses', email: EMAIL });
  });
});

describe('bulkAddRoutineItems', () => {
  it('creates a batch that fills the day exactly (the welcome wizard)', async () => {
    stored([]);
    await expect(bulk([30, 20, 50])).resolves.toHaveLength(3);
  });

  it('refuses a batch with a 0-point item, with the reason, before any AI call', async () => {
    stored([]);
    const { enhanceRoutineItemWithAI } = require('../utils/aiApi');
    enhanceRoutineItemWithAI.mockClear();
    await expect(bulk([50, 0])).rejects.toThrow('400:Points must be at least 1');
    expect(enhanceRoutineItemWithAI).not.toHaveBeenCalled();
  });

  it('refuses a batch that takes the existing day over 100', async () => {
    stored([item('a', 90)]);
    await expect(bulk([5, 6])).rejects.toThrow('400:Points must be 10 or fewer');
    expect(mockSave).not.toHaveBeenCalled();
  });
});
