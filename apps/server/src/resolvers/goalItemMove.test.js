/* eslint-disable global-require */

// D-08: updateGoalItem looked the item up by (date, period, id). Goal items are
// subdocuments of the Goal document for their date and period, so saving an item
// against a NEW date matched nothing and the reschedule was silently lost — which
// is why the dialog's date / routine controls were rendered disabled.

process.env.ENCRYPTION_KEY = 'goal-item-move-test-key';

const mockGoalFindOne = jest.fn();
const mockGoalFindOneAndUpdate = jest.fn();

jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return {
    ...actual,
    GoalModel: {
      findOne: mockGoalFindOne,
      findOneAndUpdate: mockGoalFindOneAndUpdate,
    },
  };
});

const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

const EMAIL = 'me@example.com';
const OLD_DATE = '10-09-2026';
const NEW_DATE = '12-09-2026';
const CONTEXT = { decodedToken: { email: EMAIL } };

const exec = (value) => ({ exec: () => Promise.resolve(value) });

/** One goal item, as the read middleware hands it back: decrypted, with toObject. */
function goalItem(overrides = {}) {
  const item = {
    _id: 'g1',
    id: 'g1',
    body: 'Active Recovery',
    contribution: '',
    reward: '',
    taskRef: 'task-1',
    goalRef: '',
    tags: [],
    subTasks: [],
    isComplete: false,
    isMilestone: false,
    status: 'todo',
    ...overrides,
  };
  return { ...item, toObject: () => ({ ...item }) };
}

function goalDoc(date, period, items) {
  return { date, period, goalItems: items };
}

const saveItem = (args) => {
  const { mutation } = require('./goal');
  return mutation.updateGoalItem.resolve(
    null,
    {
      id: 'g1',
      date: NEW_DATE,
      period: 'day',
      body: 'Active Recovery',
      deadline: '',
      contribution: '',
      reward: '',
      isMilestone: false,
      taskRef: 'task-1',
      goalRef: '',
      tags: [],
      ...args,
    },
    CONTEXT,
  );
};

beforeEach(() => {
  mockGoalFindOne.mockReset();
  mockGoalFindOneAndUpdate.mockReset();
  mockGoalFindOneAndUpdate.mockReturnValue(exec(null));
});

describe('updateGoalItem rescheduling', () => {
  it('moves the item to the goal document of its new date, keeping its id', async () => {
    const moved = goalItem();
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc(OLD_DATE, 'day', [goalItem()])))
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'day', [moved])));

    const result = await saveItem();

    const [pushCriteria, pushUpdate, pushOptions] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(pushCriteria).toEqual({ date: NEW_DATE, period: 'day', email: EMAIL });
    expect(pushOptions.upsert).toBe(true);
    // eslint-disable-next-line no-underscore-dangle
    expect(pushUpdate.$push.goalItems._id).toBe('g1');

    const [pullCriteria, pullUpdate] = mockGoalFindOneAndUpdate.mock.calls[1];
    expect(pullCriteria).toEqual({ date: OLD_DATE, period: 'day', email: EMAIL });
    expect(pullUpdate.$pull).toEqual({ goalItems: { _id: 'g1' } });

    expect(result).toBe(moved);
  });

  it('records the original date and marks the moved day item rescheduled', async () => {
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc(OLD_DATE, 'day', [goalItem()])))
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'day', [goalItem()])));

    await saveItem();

    const pushed = mockGoalFindOneAndUpdate.mock.calls[0][1].$push.goalItems;
    expect(pushed.originalDate).toBe(OLD_DATE);
    expect(pushed.status).toBe('rescheduled');
  });

  it('carries the edited routine task across the move and re-encrypts the body', async () => {
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc(OLD_DATE, 'day', [goalItem()])))
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'day', [goalItem()])));

    await saveItem({ taskRef: 'task-9', body: 'Evening stretch' });

    const pushed = mockGoalFindOneAndUpdate.mock.calls[0][1].$push.goalItems;
    expect(pushed.taskRef).toBe('task-9');
    expect(pushed.body).not.toBe('Evening stretch');
    expect(
      encryption.decryptObject(pushed, ENCRYPTION_FIELDS.goalItem).body,
    ).toBe('Evening stretch');
  });

  it('keeps a field the caller did not send, as the in-place update does', async () => {
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc(OLD_DATE, 'day', [goalItem({ deadline: '30-09-2026' })])))
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'day', [goalItem()])));

    await saveItem({ deadline: undefined });

    const pushed = mockGoalFindOneAndUpdate.mock.calls[0][1].$push.goalItems;
    expect(pushed.deadline).toBe('30-09-2026');
  });

  it('updates in place when the date and period are unchanged', async () => {
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'day', [goalItem()])))
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'day', [goalItem()])));

    await saveItem({ taskRef: 'task-9' });

    expect(mockGoalFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [criteria, update] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(criteria).toMatchObject({ date: NEW_DATE, period: 'day', 'goalItems._id': 'g1' });
    expect(update.$set['goalItems.$.taskRef']).toBe('task-9');
  });

  it('rejects an item that belongs to no goal document', async () => {
    mockGoalFindOne.mockReturnValue(exec(null));

    await expect(saveItem()).rejects.toThrow('Goal item not found');
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

// The move above shipped without its guard: the dialog's period tab rewrites the
// date on its own, so a save could file the item under no day and unroot the
// milestone link it still carried.
describe('updateGoalItem refusals', () => {
  it('refuses a save whose date the period switch cleared', async () => {
    mockGoalFindOne.mockReturnValue(exec(goalDoc(OLD_DATE, 'day', [goalItem()])));

    await expect(saveItem({ date: '', period: 'week' })).rejects.toThrow('needs a date');
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses to file a dated item under the lifetime bucket', async () => {
    mockGoalFindOne.mockReturnValue(exec(goalDoc(OLD_DATE, 'day', [goalItem()])));

    await expect(saveItem({ date: '01-01-1970', period: 'lifetime' })).rejects.toThrow('needs a date');
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('still edits a lifetime item, whose own date is the lifetime one', async () => {
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc('01-01-1970', 'lifetime', [goalItem()])))
      .mockReturnValueOnce(exec(goalDoc('01-01-1970', 'lifetime', [goalItem()])));

    await saveItem({ date: '01-01-1970', period: 'lifetime', body: 'Know your life mission' });

    expect(mockGoalFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [criteria] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(criteria).toMatchObject({ date: '01-01-1970', period: 'lifetime', 'goalItems._id': 'g1' });
  });

  it('refuses a period change that would unroot the milestone', async () => {
    mockGoalFindOne.mockReturnValue(
      exec(goalDoc(OLD_DATE, 'day', [goalItem({ goalRef: 'week-goal-1', isMilestone: true })])),
    );

    await expect(saveItem({ period: 'week', goalRef: 'week-goal-1' })).rejects.toThrow('Clear its goal task');
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses it even when the save arrives with the goalRef already dropped', async () => {
    mockGoalFindOne.mockReturnValue(
      exec(goalDoc(OLD_DATE, 'day', [goalItem({ goalRef: 'week-goal-1', isMilestone: true })])),
    );

    await expect(saveItem({ period: 'week', goalRef: '' })).rejects.toThrow('Clear its goal task');
    expect(mockGoalFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('lets an item with no parent goal move to another period', async () => {
    mockGoalFindOne
      .mockReturnValueOnce(exec(goalDoc(OLD_DATE, 'day', [goalItem()])))
      .mockReturnValueOnce(exec(goalDoc(NEW_DATE, 'week', [goalItem()])));

    await saveItem({ period: 'week' });

    const [pushCriteria] = mockGoalFindOneAndUpdate.mock.calls[0];
    expect(pushCriteria).toEqual({ date: NEW_DATE, period: 'week', email: EMAIL });
  });
});
