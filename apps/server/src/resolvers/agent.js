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

const cap = (value, max) => {
  if (typeof value !== 'string') return value;
  return value.length > max ? value.slice(0, max) : value;
};

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
      return AgentModel.findOneAndUpdate(
        { _id: args.id, email },
        update,
        { new: true },
      ).exec();
    },
  },
};

module.exports = { query, mutation };
