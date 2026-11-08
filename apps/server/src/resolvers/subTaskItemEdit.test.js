/* eslint-disable global-require */

/**
 * Sub-task rename and reorder.
 *
 * `updateSubTaskItem` shipped broken and unused: it `$set` a hardcoded
 * `goalItems.$.subTasks.0.body`, so renaming the third sub-task renamed the
 * first, and it returned `null` for a field typed `SubTaskItem`. The goal-item
 * page is its first caller, so it had to work before being wired. It now
 * addresses the sub-task by id through arrayFilters.
 *
 * `reorderSubTaskItems` is new. Sub-task order has no field of its own —
 * `SubTaskItemSchema` is `{ body, isComplete }` and the order IS the array order
 * — so "move up" is a rewrite of the parent's array, and the answer has to be the
 * parent `GoalItem`: a reordered list cannot be expressed as a patch to any one
 * `SubTaskItem`.
 */

process.env.ENCRYPTION_KEY = 'subtask-edit-test-key';

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      findOne: mockFindOne,
      findOneAndUpdate: mockFindOneAndUpdate,
    },
  };
});

const { mutation } = require('../resolvers/subTaskItem');

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };
const DATE = '12-09-2026';
const TASK_ID = 'g1';

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** Mongo subdocument ids are ObjectIds; only `.toString()` is relied on. */
const oid = (value) => ({ toString: () => value });

const goalItem = (subTasks) => ({
  _id: oid(TASK_ID),
  body: 'Ship dashboard PR',
  subTasks,
});

const SUBS = () => ([
  { _id: oid('s1'), body: 'Fix offsets', isComplete: true },
  { _id: oid('s2'), body: 'Add tests', isComplete: false },
  { _id: oid('s3'), body: 'Request review', isComplete: false },
]);

const writtenSubTasks = () => mockFindOneAndUpdate.mock.calls[0][1].$set['goalItems.$.subTasks'];

beforeEach(() => {
  jest.clearAllMocks();
  mockFindOneAndUpdate.mockReturnValue(exec(null));
});

describe('updateSubTaskItem — renames the sub-task it was asked about', () => {
  // Since 26 Oct 2026 a rename is one arrayFilters `$set` on that sub-task's
  // body (subTaskItemAtomic.spec.js has why), so real ObjectIds are needed here.
  const mongoose = require('mongoose');
  const { encryption } = require('../utils/encryption');
  const taskId = new mongoose.Types.ObjectId();
  const [s1, s2, s3] = [1, 2, 3].map(() => new mongoose.Types.ObjectId());
  const realSubs = (renamed) => ([
    { _id: s1, body: 'Fix offsets', isComplete: true },
    { _id: s2, body: 'Add tests', isComplete: false },
    { _id: s3, body: renamed || 'Request review', isComplete: false },
  ]);
  const saved = (renamed) => exec({
    goalItems: [{ _id: taskId, body: 'Ship dashboard PR', subTasks: realSubs(renamed) }],
  });
  const rename = (id, body) => mutation.updateSubTaskItem.resolve(null, {
    id: String(id), taskId: String(taskId), date: DATE, period: 'day', body,
  }, CONTEXT);

  it('renames the THIRD sub-task, not the first', async () => {
    mockFindOneAndUpdate.mockReturnValue(saved('Request review from Ana'));

    const result = await rename(s3, 'Request review from Ana');

    const [, change, options] = mockFindOneAndUpdate.mock.calls[0];
    expect(encryption.decrypt(change.$set['goalItems.$[item].subTasks.$[sub].body']))
      .toBe('Request review from Ana');
    expect(options.arrayFilters).toEqual([{ 'item._id': taskId }, { 'sub._id': s3 }]);
    expect(result.id).toBe(String(s3));
    expect(result.body).toBe('Request review from Ana');
  });

  it('keeps the renamed sub-task’s completion', async () => {
    mockFindOneAndUpdate.mockReturnValue(saved());

    const result = await rename(s1, 'Fix the ring offsets');

    expect(result.isComplete).toBe(true);
    const [, change] = mockFindOneAndUpdate.mock.calls[0];
    expect(Object.keys(change.$set)).toEqual(['goalItems.$[item].subTasks.$[sub].body']);
  });

  // `SubTaskItemType.id` has no resolver, and the decrypt hook hands back plain
  // objects with no `id` virtual — so it has to be spelled out or the client
  // cannot normalize the result.
  it('returns an id the client can normalize against', async () => {
    mockFindOneAndUpdate.mockReturnValue(saved());

    const result = await rename(s2, 'Add tests');

    expect(typeof result.id).toBe('string');
    expect(result.id).toBe(String(s2));
  });

  it('answers null for an id that is not on the item', async () => {
    mockFindOneAndUpdate.mockReturnValue(saved());

    const result = await rename(new mongoose.Types.ObjectId(), 'x');

    expect(result).toBeNull();
  });

  it('writes nothing for an id that is not an ObjectId', async () => {
    const result = await rename('nope', 'x');

    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('scopes the write to the signed-in user', async () => {
    mockFindOneAndUpdate.mockReturnValue(saved());

    await rename(s1, 'x');

    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate.mock.calls[0][0]).toEqual({
      date: DATE, period: 'day', email: EMAIL, 'goalItems._id': taskId,
    });
  });
});

describe('reorderSubTaskItems — the order IS the array', () => {
  it('rewrites the array in the order it was given', async () => {
    mockFindOne.mockReturnValue(exec({ goalItems: [goalItem(SUBS())] }));
    mockFindOneAndUpdate.mockReturnValue(exec({
      goalItems: [goalItem(SUBS())],
    }));

    await mutation.reorderSubTaskItems.resolve(null, {
      taskId: TASK_ID, date: DATE, period: 'day', ids: ['s2', 's1', 's3'],
    }, CONTEXT);

    expect(writtenSubTasks().map((s) => s._id.toString())).toEqual(['s2', 's1', 's3']);
  });

  // A stale client list should reorder what it knows about, not delete the rest.
  it('keeps sub-tasks the caller did not mention, at the end', async () => {
    mockFindOne.mockReturnValue(exec({ goalItems: [goalItem(SUBS())] }));
    mockFindOneAndUpdate.mockReturnValue(exec({ goalItems: [goalItem(SUBS())] }));

    await mutation.reorderSubTaskItems.resolve(null, {
      taskId: TASK_ID, date: DATE, period: 'day', ids: ['s3'],
    }, CONTEXT);

    expect(writtenSubTasks().map((s) => s._id.toString())).toEqual(['s3', 's1', 's2']);
  });

  it('ignores ids that are not on the item', async () => {
    mockFindOne.mockReturnValue(exec({ goalItems: [goalItem(SUBS())] }));
    mockFindOneAndUpdate.mockReturnValue(exec({ goalItems: [goalItem(SUBS())] }));

    await mutation.reorderSubTaskItems.resolve(null, {
      taskId: TASK_ID, date: DATE, period: 'day', ids: ['ghost', 's2'],
    }, CONTEXT);

    expect(writtenSubTasks().map((s) => s._id.toString())).toEqual(['s2', 's1', 's3']);
  });

  // Principle #2: the complete parent, so Apollo normalizes the new order into
  // every query holding GoalItem:<taskId> at once.
  it('returns the parent goal item', async () => {
    mockFindOne.mockReturnValue(exec({ goalItems: [goalItem(SUBS())] }));
    const reordered = goalItem([SUBS()[1], SUBS()[0], SUBS()[2]]);
    mockFindOneAndUpdate.mockReturnValue(exec({ goalItems: [reordered] }));

    const result = await mutation.reorderSubTaskItems.resolve(null, {
      taskId: TASK_ID, date: DATE, period: 'day', ids: ['s2', 's1', 's3'],
    }, CONTEXT);

    expect(result).toBe(reordered);
    expect(result.subTasks.map((s) => s._id.toString())).toEqual(['s2', 's1', 's3']);
  });

  it('is a no-op for an item with no sub-tasks', async () => {
    const empty = goalItem([]);
    mockFindOne.mockReturnValue(exec({ goalItems: [empty] }));

    const result = await mutation.reorderSubTaskItems.resolve(null, {
      taskId: TASK_ID, date: DATE, period: 'day', ids: ['s1'],
    }, CONTEXT);

    expect(result).toBe(empty);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('is a no-op when the goal item is gone', async () => {
    mockFindOne.mockReturnValue(exec({ goalItems: [] }));

    const result = await mutation.reorderSubTaskItems.resolve(null, {
      taskId: TASK_ID, date: DATE, period: 'day', ids: ['s1'],
    }, CONTEXT);

    expect(result).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
