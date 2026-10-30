process.env.ENCRYPTION_KEY = 'sub-task-atomic-test-key';

jest.mock('../src/utils/getEmailfromSession', () => () => 'user@example.com');

const mongoose = require('mongoose');
const { GoalModel } = require('../src/schema/GoalSchema');
const { mutation } = require('../src/resolvers/subTaskItem');
const { encryption } = require('../src/utils/encryption');

// Sub-task writes used to read the whole `subTasks` array and $set it back.
// Three ticks in quick succession saved one of the three, and each answer told
// the client the other two were unticked, so the boxes the user had just ticked
// unticked themselves. The rewrite also stored the decrypted titles. Probed
// against Atlas on 26 Oct 2026: old 1/3 ticks kept and 4/5 adds, new 3/3 and 5/5.
const exec = (value) => ({ exec: () => Promise.resolve(value) });
const oid = () => new mongoose.Types.ObjectId();

describe('sub-task writes are atomic', () => {
  const taskId = oid();
  const [alpha, bravo, charlie] = [oid(), oid(), oid()];
  const base = { taskId: String(taskId), date: '26-10-2026', period: 'day' };

  const goal = (subTasks) => ({ goalItems: [{ _id: taskId, body: 'Item', subTasks }] });
  const subTasks = () => [
    { _id: alpha, body: 'Alpha', isComplete: false },
    { _id: bravo, body: 'Bravo', isComplete: false },
    { _id: charlie, body: 'Charlie', isComplete: true },
  ];

  let update;
  beforeEach(() => {
    jest.spyOn(GoalModel, 'findOne').mockImplementation(() => exec(goal(subTasks())));
    update = jest.spyOn(GoalModel, 'findOneAndUpdate')
      .mockImplementation(() => exec(goal(subTasks())));
  });
  afterEach(() => jest.restoreAllMocks());

  const lastUpdate = () => {
    const [filter, change, options] = update.mock.calls[update.mock.calls.length - 1];
    return { filter, change, options };
  };

  it('a tick sets only that sub-task\'s isComplete, without reading the array first', async () => {
    const result = await mutation.completeSubTaskItem.resolve(
      null, { ...base, id: String(bravo), isComplete: true }, {},
    );

    expect(GoalModel.findOne).not.toHaveBeenCalled();
    const { filter, change, options } = lastUpdate();
    expect(filter['goalItems._id']).toEqual(taskId);
    expect(change).toEqual({ $set: { 'goalItems.$[item].subTasks.$[sub].isComplete': true } });
    expect(options.new).toBe(true);
    expect(options.arrayFilters).toEqual([{ 'item._id': taskId }, { 'sub._id': bravo }]);
    // The answer is the parent, read from the post-update document.
    expect(String(result._id)).toBe(String(taskId));
  });

  it('a tick for an id that is not an ObjectId writes nothing', async () => {
    const result = await mutation.completeSubTaskItem.resolve(
      null, { ...base, id: 'tmp-sub-1', isComplete: true }, {},
    );
    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('an add $pushes one encrypted sub-task and answers with its own minted id', async () => {
    const [first, second] = await Promise.all(['Delta', 'Echo'].map((body) => (
      mutation.addSubTaskItem.resolve(null, { ...base, body, isComplete: false }, {})
    )));

    expect(GoalModel.findOne).not.toHaveBeenCalled();
    const pushed = update.mock.calls.map(([, change]) => change.$push['goalItems.$.subTasks']);
    expect(pushed).toHaveLength(2);
    pushed.forEach((row) => {
      expect(encryption.decrypt(row.body)).not.toBe(row.body);
      expect(row.isComplete).toBe(false);
    });
    expect(encryption.decrypt(pushed[0].body)).toBe('Delta');
    expect(first).toMatchObject({ body: 'Delta', isComplete: false });
    expect(second).toMatchObject({ body: 'Echo', isComplete: false });
    expect(first.id).toBe(String(pushed[0]._id));
    expect(first.id).not.toBe(second.id);
  });

  it('an add on a goal item that is gone answers null', async () => {
    update.mockImplementation(() => exec(null));
    const result = await mutation.addSubTaskItem.resolve(null, { ...base, body: 'Delta' }, {});
    expect(result).toBeNull();
  });

  it('a rename sets only that sub-task\'s body, encrypted', async () => {
    update.mockImplementation(() => exec(goal([
      { _id: alpha, body: 'Alpha renamed', isComplete: true },
    ])));
    const result = await mutation.updateSubTaskItem.resolve(
      null, { ...base, id: String(alpha), body: 'Alpha renamed' }, {},
    );

    const { change, options } = lastUpdate();
    const stored = change.$set['goalItems.$[item].subTasks.$[sub].body'];
    expect(Object.keys(change.$set)).toHaveLength(1);
    expect(encryption.decrypt(stored)).toBe('Alpha renamed');
    expect(stored).not.toBe('Alpha renamed');
    expect(options.arrayFilters).toEqual([{ 'item._id': taskId }, { 'sub._id': alpha }]);
    expect(result).toEqual({
      id: String(alpha), _id: alpha, body: 'Alpha renamed', isComplete: true,
    });
  });

  it('a delete $pulls the one sub-task and answers with it from the pre-image', async () => {
    const result = await mutation.deleteSubTaskItem.resolve(
      null, { ...base, id: String(charlie) }, {},
    );

    const { change, options } = lastUpdate();
    expect(change).toEqual({ $pull: { 'goalItems.$.subTasks': { _id: charlie } } });
    expect(options.new).toBe(false);
    expect(result).toMatchObject({ id: String(charlie), body: 'Charlie' });
  });

  it('a reorder writes the new order with every body encrypted', async () => {
    await mutation.reorderSubTaskItems.resolve(
      null, { ...base, ids: [String(bravo), String(alpha)] }, {},
    );

    const rows = lastUpdate().change.$set['goalItems.$.subTasks'];
    expect(rows.map((row) => String(row._id))).toEqual([bravo, alpha, charlie].map(String));
    expect(rows.map((row) => encryption.decrypt(row.body))).toEqual(['Bravo', 'Alpha', 'Charlie']);
    rows.forEach((row) => expect(row.body).not.toMatch(/^(Alpha|Bravo|Charlie)$/));
    expect(rows.map((row) => row.isComplete)).toEqual([false, false, true]);
  });
});
