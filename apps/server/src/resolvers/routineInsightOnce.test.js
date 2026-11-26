/* eslint-disable global-require */

// D-05: one tick reported the insight twice — the client fires it on the
// optimistic write and again when the server's re-read of the day flips
// `ticked` back to true — and the model takes about a second to answer, so the
// second call passed the "does today's card exist?" read while the first was
// still composing and the thread kept two coach cards. The WRITE has to decide
// which card a thread gets, not the read.

process.env.ENCRYPTION_KEY = 'routine-insight-once-test-key';

const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockGenerate = jest.fn();

jest.mock('../schema/RoutineChatSchema', () => {
  const actual = jest.requireActual('../schema/RoutineChatSchema');
  return {
    ...actual,
    RoutineChatMessageModel: {
      findOne: mockFindOne,
      find: mockFind,
      findOneAndUpdate: mockFindOneAndUpdate,
    },
  };
});

// The history reads are not what is under test, and there is no Mongo here.
jest.mock('../schema/RoutineSchema', () => {
  const actual = jest.requireActual('../schema/RoutineSchema');
  return {
    ...actual,
    RoutineModel: { find: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }) },
  };
});
jest.mock('../schema/GoalSchema', () => {
  const actual = jest.requireActual('../schema/GoalSchema');
  return { ...actual, GoalModel: { find: () => ({ exec: () => Promise.resolve([]) }) } };
});
jest.mock('../utils/routineInsight', () => {
  const actual = jest.requireActual('../utils/routineInsight');
  return { ...actual, generateRoutineInsight: (...args) => mockGenerate(...args) };
});

const { encryption } = require('../utils/encryption');

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };
const DATE = '12-09-2026';
const TASK_REF = 'sw';
const CARD = 'Thirty days later, the triage returns';

const exec = (value) => ({ exec: () => Promise.resolve(value) });
const sorted = (value) => ({ sort: () => ({ limit: () => exec(value) }) });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// A day of its own per test: a thread being composed is shared state, by
// design, so one test's in-flight card must not be another's.
const insight = (args) => {
  const { mutation } = require('./routineChat');
  return mutation.routineInsight.resolve(
    null,
    {
      date: DATE, taskRef: TASK_REF, routineName: 'Start Work', brief: '', ...args,
    },
    CONTEXT,
  );
};

beforeEach(() => {
  mockFindOne.mockReset();
  mockFind.mockReset();
  mockFindOneAndUpdate.mockReset();
  mockGenerate.mockReset();
  mockFindOne.mockReturnValue(exec(null));
  mockFind.mockReturnValue(sorted([]));
  mockGenerate.mockResolvedValue({ text: CARD, model: 'free/model:free' });
  mockFindOneAndUpdate.mockReturnValue(exec({ id: 'card-1', text: CARD }));
});

describe('routineInsight is once per thread per day', () => {
  it('hands back the card a thread already holds without asking the model', async () => {
    mockFindOne.mockReturnValue(exec({ id: 'card-1', text: CARD }));

    await expect(insight({ date: '01-09-2026' })).resolves.toMatchObject({ id: 'card-1' });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  // The two halves of D-05: one request per tick is the client's job, but two
  // concurrent requests must still leave one card behind.
  it('writes one card when two calls race for the same thread', async () => {
    let answer;
    mockGenerate.mockReturnValue(new Promise((resolve) => { answer = resolve; }));

    const first = insight({ date: '02-09-2026' });
    const second = insight({ date: '02-09-2026' });
    await flush();
    answer({ text: CARD, model: 'free/model:free' });

    const [a, b] = await Promise.all([first, second]);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('writes by upsert on the card’s own identity, encrypted at rest', async () => {
    await insight({ date: '03-09-2026' });

    const [criteria, update, options] = mockFindOneAndUpdate.mock.calls[0];
    expect(criteria).toEqual({
      email: EMAIL,
      date: '03-09-2026',
      taskRef: TASK_REF,
      from: 'routine',
      kind: 'text',
      icon: 'tips_and_updates',
    });
    expect(options).toMatchObject({ upsert: true, new: true });
    expect(update.$setOnInsert.text).not.toContain('triage');
    expect(encryption.decrypt(update.$setOnInsert.text)).toBe(CARD);
    // Only on insert: a second call may not rewrite the card that won.
    expect(update.$set).toBeUndefined();
  });

  // The unique index is the cross-process half of the guard, so the loser of
  // that race reads the winner's card rather than failing the mutation.
  it('reads back the winner when the unique index rejects the write', async () => {
    const clash = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    mockFindOneAndUpdate.mockReturnValue({ exec: () => Promise.reject(clash) });
    mockFindOne
      .mockReturnValueOnce(exec(null))
      .mockReturnValue(exec({ id: 'card-winner', text: CARD }));

    await expect(insight({ date: '04-09-2026' })).resolves.toMatchObject({ id: 'card-winner' });
  });

  it('still reports a write that failed for any other reason', async () => {
    mockFindOneAndUpdate.mockReturnValue({ exec: () => Promise.reject(new Error('no primary')) });

    await expect(insight({ date: '05-09-2026' })).rejects.toThrow('no primary');
  });
});
