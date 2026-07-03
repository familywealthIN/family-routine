const {
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLInputObjectType,
} = require('graphql');

const mongoose = require('mongoose');
const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

const EVENT_KINDS = ['url', 'curl', 'notify', 'log'];
const STATUSES = ['idle', 'running', 'listening', 'finished', 'failed'];
const RESULT_TYPES = ['html', 'json'];
const RESULT_BODY_MAX = 65536;
const ERROR_MAX = 2048;

const EventConfigSchema = new mongoose.Schema({
  kind: { type: String, enum: EVENT_KINDS, required: true },
  value: { type: String, required: true },
}, { _id: false });

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  taskRef: { type: String, required: true },
  startEvent: { type: EventConfigSchema, required: true },
  endEvent: { type: EventConfigSchema, default: null },
  executionStatus: {
    type: String,
    enum: STATUSES,
    default: 'idle',
  },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  lastRunAt: Date,
  lastResultType: { type: String, enum: [...RESULT_TYPES, null], default: null },
  lastResultBody: { type: String, maxlength: RESULT_BODY_MAX },
  lastError: { type: String, maxlength: ERROR_MAX },
}, { timestamps: true });

AgentSchema.index({ email: 1, taskRef: 1 }, { unique: true });
AgentSchema.index({ email: 1, executionStatus: 1 });

const encryptEventConfig = (event) => {
  if (!event) return event;
  const plain = event.toObject ? event.toObject() : event;
  return encryption.encryptObject(plain, ENCRYPTION_FIELDS.agentEvent);
};

const decryptEventConfig = (event) => {
  if (!event) return event;
  const plain = event.toObject ? event.toObject() : event;
  return encryption.decryptObject(plain, ENCRYPTION_FIELDS.agentEvent);
};

AgentSchema.pre('save', function encryptAgent(next) {
  const encrypted = encryption.encryptObject(this.toObject(), ENCRYPTION_FIELDS.agent);
  Object.assign(this, encrypted);
  if (this.startEvent) {
    this.startEvent = encryptEventConfig(this.startEvent);
  }
  if (this.endEvent) {
    this.endEvent = encryptEventConfig(this.endEvent);
  }
  next();
});

const decryptAgentDoc = (doc) => {
  if (!doc) return doc;
  const plain = doc.toObject ? doc.toObject() : doc;
  const decrypted = encryption.decryptObject(plain, ENCRYPTION_FIELDS.agent);
  if (decrypted.startEvent) {
    decrypted.startEvent = decryptEventConfig(decrypted.startEvent);
  }
  if (decrypted.endEvent) {
    decrypted.endEvent = decryptEventConfig(decrypted.endEvent);
  }
  Object.assign(doc, decrypted);
  return doc;
};

AgentSchema.post(['find', 'findOne', 'findOneAndUpdate'], (docs) => {
  if (!docs) return;
  if (Array.isArray(docs)) {
    docs.forEach(decryptAgentDoc);
  } else {
    decryptAgentDoc(docs);
  }
});

const AgentEventConfigType = new GraphQLObjectType({
  name: 'AgentEventConfig',
  fields: {
    kind: { type: GraphQLString },
    value: { type: GraphQLString },
  },
});

const AgentEventConfigInput = new GraphQLInputObjectType({
  name: 'AgentEventConfigInput',
  fields: {
    kind: { type: GraphQLString },
    value: { type: GraphQLString },
  },
});

const AgentType = new GraphQLObjectType({
  name: 'Agent',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    email: { type: GraphQLString },
    taskRef: { type: GraphQLString },
    startEvent: { type: AgentEventConfigType },
    endEvent: { type: AgentEventConfigType },
    executionStatus: { type: GraphQLString },
    successCount: { type: GraphQLInt },
    failureCount: { type: GraphQLInt },
    lastRunAt: { type: GraphQLString },
    lastResultType: { type: GraphQLString },
    lastResultBody: { type: GraphQLString },
    lastError: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});

const AgentModel = mongoose.model('Agent', AgentSchema);

module.exports = {
  AgentSchema,
  AgentModel,
  AgentType,
  AgentEventConfigType,
  AgentEventConfigInput,
  EVENT_KINDS,
  STATUSES,
  RESULT_TYPES,
  RESULT_BODY_MAX,
  ERROR_MAX,
};
