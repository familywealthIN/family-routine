const {
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
} = require('graphql');

const {
  AgentModel,
  AgentType,
  AgentEventConfigInput,
  RESULT_BODY_MAX,
  ERROR_MAX,
} = require('../schema/AgentSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const ApiError = require('../utils/ApiError');

const cap = (value, max) => {
  if (typeof value !== 'string') return value;
  return value.length > max ? value.slice(0, max) : value;
};

// A run is open from the moment a start event is dispatched until an end event
// closes it. 'finished' closes a run, so it may only be recorded against a run
// that was actually opened — an agent with no end event is the one exception,
// there the start dispatch is the whole run and closes it itself.
const CLOSING_STATUS = 'finished';
const RUN_OPEN_STATUSES = ['running', 'listening'];

const query = {
  agents: {
    type: GraphQLList(AgentType),
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);
      return AgentModel.find({ email }).exec();
    },
  },
  agentByTaskRef: {
    type: AgentType,
    args: {
      taskRef: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);
      return AgentModel.findOne({ email, taskRef: args.taskRef }).exec();
    },
  },
  agent: {
    type: AgentType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);
      return AgentModel.findOne({ _id: args.id, email }).exec();
    },
  },
};

const mutation = {
  addAgent: {
    type: AgentType,
    args: {
      name: { type: GraphQLNonNull(GraphQLString) },
      taskRef: { type: GraphQLNonNull(GraphQLString) },
      startEvent: { type: GraphQLNonNull(AgentEventConfigInput) },
      endEvent: { type: AgentEventConfigInput },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const agent = new AgentModel({
        name: args.name,
        email,
        taskRef: args.taskRef,
        startEvent: args.startEvent,
        endEvent: args.endEvent || null,
      });
      try {
        return await agent.save();
      } catch (error) {
        if (error.code === 11000) {
          throw new Error('An agent already exists for this routine');
        }
        throw error;
      }
    },
  },
  updateAgent: {
    type: AgentType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      name: { type: GraphQLString },
      startEvent: { type: AgentEventConfigInput },
      endEvent: { type: AgentEventConfigInput },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const existing = await AgentModel.findOne({ _id: args.id, email }).exec();
      if (!existing) throw new Error('Agent not found');
      if (typeof args.name === 'string') existing.name = args.name;
      if (args.startEvent) existing.startEvent = args.startEvent;
      if (args.endEvent !== undefined) existing.endEvent = args.endEvent || null;
      return existing.save();
    },
  },
  deleteAgent: {
    type: GraphQLBoolean,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const result = await AgentModel.findOneAndRemove({ _id: args.id, email }).exec();
      return Boolean(result);
    },
  },
  recordAgentExecution: {
    type: AgentType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      status: { type: GraphQLNonNull(GraphQLString) },
      lastResultType: { type: GraphQLString },
      lastResultBody: { type: GraphQLString },
      lastError: { type: GraphQLString },
      incrementSuccess: { type: GraphQLInt },
      incrementFailure: { type: GraphQLInt },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const set = {
        executionStatus: args.status,
        lastRunAt: new Date(),
      };
      if (args.lastResultType !== undefined) set.lastResultType = args.lastResultType;
      if (args.lastResultBody !== undefined) {
        set.lastResultBody = cap(args.lastResultBody, RESULT_BODY_MAX);
      }
      if (args.lastError !== undefined) {
        set.lastError = cap(args.lastError, ERROR_MAX);
      }
      const inc = {};
      if (args.incrementSuccess) inc.successCount = args.incrementSuccess;
      if (args.incrementFailure) inc.failureCount = args.incrementFailure;
      const update = Object.keys(inc).length ? { $set: set, $inc: inc } : { $set: set };
      // Guard the close atomically, the same way redeemRoutineItem guards a
      // double-redeem: two end-event records racing must not both be accepted,
      // or one run logs two successes.
      const filter = { _id: args.id, email };
      if (args.status === CLOSING_STATUS) {
        filter.$or = [
          { executionStatus: { $in: RUN_OPEN_STATUSES } },
          { endEvent: null },
        ];
      }
      const updated = await AgentModel.findOneAndUpdate(
        filter,
        update,
        { new: true },
      ).exec();
      if (!updated && args.status === CLOSING_STATUS) {
        // Tell the difference between "not your agent" (stay null, as before)
        // and a refused close, so an end event that fired without a run says so
        // instead of quietly logging a success.
        const existing = await AgentModel.findOne({ _id: args.id, email }).exec();
        if (existing) {
          throw new ApiError(409, `409:Agent has no run in progress (${existing.executionStatus})`
            + ' - end event ignored');
        }
      }
      return updated;
    },
  },
};

module.exports = { query, mutation };
