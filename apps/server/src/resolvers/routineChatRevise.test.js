/* eslint-disable global-require */

// D-03: an `add_tasks` reply is composed by the model and persisted BEFORE the
// client attempts the create, so a failed add left "Added: X" in the thread for
// good. `reviseRoutineChatReply` is how the client corrects that claim — and
// since it writes a message body, it has to encrypt it the way the save hook
// would.

process.env.ENCRYPTION_KEY = 'routine-chat-revise-test-key';

const mockFindOneAndUpdate = jest.fn();

jest.mock('../schema/RoutineChatSchema', () => {
  const actual = jest.requireActual('../schema/RoutineChatSchema');
  return {
    ...actual,
    RoutineChatMessageModel: { findOneAndUpdate: mockFindOneAndUpdate },
  };
});

const { encryption } = require('../utils/encryption');

const EMAIL = 'me@example.com';
const CONTEXT = { decodedToken: { email: EMAIL } };

const exec = (value) => ({ exec: () => Promise.resolve(value) });

const CORRECTION = 'I couldn’t add “Email the vendor” to the checklist'
  + ' — nothing was saved. Try again.';

const revise = (args) => {
  const { mutation } = require('./routineChat');
  return mutation.reviseRoutineChatReply.resolve(
    null,
    { id: 'reply-1', text: CORRECTION, ...args },
    CONTEXT,
  );
};

beforeEach(() => {
  mockFindOneAndUpdate.mockReset();
  mockFindOneAndUpdate.mockReturnValue(exec({ id: 'reply-1' }));
});

describe('reviseRoutineChatReply', () => {
  it('rewrites the reply the model wrote, encrypted at rest', async () => {
    await revise();

    const [criteria, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(criteria).toEqual({
      _id: 'reply-1', email: EMAIL, from: 'routine', kind: 'text',
    });
    expect(update.text).not.toContain('Email the vendor');
    expect(encryption.decrypt(update.text)).toBe(CORRECTION);
  });

  // The user's own words and the event log are records of what happened; only
  // the model's claim is the thing that can be wrong.
  it('cannot touch a user message or an event pill', async () => {
    await revise();

    const [criteria] = mockFindOneAndUpdate.mock.calls[0];
    expect(criteria.from).toBe('routine');
    expect(criteria.kind).toBe('text');
  });

  it('refuses an empty correction', async () => {
    await expect(revise({ text: '   ' })).rejects.toThrow('A chat message cannot be empty');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('writes nothing for a message belonging to someone else', async () => {
    mockFindOneAndUpdate.mockReturnValue(exec(null));
    await expect(revise()).resolves.toBeNull();
  });
});
