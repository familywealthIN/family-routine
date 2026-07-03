/* eslint-disable global-require */

process.env.ENCRYPTION_KEY = 'agent-resolver-test-key';
process.env.NODE_ENV = 'production';

// Variables prefixed with `mock` are allowed inside jest.mock() factories.
const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndRemove = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockSave = jest.fn();

jest.mock('../schema/AgentSchema', () => {
  // eslint-disable-next-line global-require
  const { GraphQLString, GraphQLObjectType, GraphQLInputObjectType } = require('graphql');

  class MockAgentModel {
    constructor(payload) { Object.assign(this, payload); }

    save() { return mockSave(this); }
  }
  MockAgentModel.find = mockFind;
  MockAgentModel.findOne = mockFindOne;
  MockAgentModel.findOneAndRemove = mockFindOneAndRemove;
  MockAgentModel.findOneAndUpdate = mockFindOneAndUpdate;

  return {
    AgentModel: MockAgentModel,
    AgentType: new GraphQLObjectType({
      name: 'Agent',
      fields: { id: { type: GraphQLString } },
    }),
    AgentEventConfigInput: new GraphQLInputObjectType({
      name: 'AgentEventConfigInput',
      fields: { kind: { type: GraphQLString }, value: { type: GraphQLString } },
    }),
    RESULT_BODY_MAX: 64,
    ERROR_MAX: 32,
  };
});

const ctx = (email = 'me@example.com') => ({ decodedToken: { email } });
const exec = (value) => ({ exec: () => Promise.resolve(value) });

beforeEach(() => {
  mockFind.mockReset();
  mockFindOne.mockReset();
  mockFindOneAndRemove.mockReset();
  mockFindOneAndUpdate.mockReset();
  mockSave.mockReset();
});

describe('agent resolvers', () => {
  it('agents query filters by email from session', async () => {
    mockFind.mockReturnValue(exec([{ id: '1' }]));
    const { query } = require('./agent');
    const result = await query.agents.resolve(null, {}, ctx());
    expect(mockFind).toHaveBeenCalledWith({ email: 'me@example.com' });
    expect(result).toEqual([{ id: '1' }]);
  });

  it('agentByTaskRef looks up by (email, taskRef)', async () => {
    mockFindOne.mockReturnValue(exec({ id: '7' }));
    const { query } = require('./agent');
    const result = await query.agentByTaskRef.resolve(null, { taskRef: 'r1' }, ctx());
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'me@example.com', taskRef: 'r1' });
    expect(result.id).toEqual('7');
  });

  it('addAgent persists the input under the session email', async () => {
    mockSave.mockResolvedValue({ id: 'a1', name: 'X' });
    const { mutation } = require('./agent');
    const result = await mutation.addAgent.resolve(null, {
      name: 'X',
      taskRef: 'r1',
      startEvent: { kind: 'url', value: 'https://example.com' },
    }, ctx());
    expect(mockSave).toHaveBeenCalled();
    expect(result.id).toEqual('a1');
  });

  it('addAgent surfaces a friendly message on duplicate (taskRef) collision', async () => {
    const dupErr = Object.assign(new Error('dup'), { code: 11000 });
    mockSave.mockRejectedValue(dupErr);
    const { mutation } = require('./agent');
    await expect(mutation.addAgent.resolve(null, {
      name: 'X',
      taskRef: 'r1',
      startEvent: { kind: 'url', value: 'https://x' },
    }, ctx())).rejects.toThrow(/already exists/);
  });

  it('deleteAgent only allows the owning user to remove', async () => {
    mockFindOneAndRemove.mockReturnValue(exec({ id: 'a1' }));
    const { mutation } = require('./agent');
    const ok = await mutation.deleteAgent.resolve(null, { id: 'a1' }, ctx());
    expect(mockFindOneAndRemove).toHaveBeenCalledWith({ _id: 'a1', email: 'me@example.com' });
    expect(ok).toBe(true);
  });

  it('recordAgentExecution caps lastResultBody and increments counters', async () => {
    mockFindOneAndUpdate.mockReturnValue(exec({ id: 'a1' }));
    const { mutation } = require('./agent');
    const huge = 'x'.repeat(200);
    await mutation.recordAgentExecution.resolve(null, {
      id: 'a1',
      status: 'finished',
      lastResultType: 'json',
      lastResultBody: huge,
      incrementSuccess: 1,
    }, ctx());

    const [, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(update.$set.executionStatus).toEqual('finished');
    expect(update.$set.lastRunAt).toBeInstanceOf(Date);
    expect(update.$set.lastResultBody.length).toBeLessThanOrEqual(64);
    expect(update.$inc).toEqual({ successCount: 1 });
  });
});
