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

// Both helpers tolerate mixed at-rest states: `encryptOnce` leaves a value
// that already decrypts with our key alone (so a re-save never stacks a second
// layer), and `decryptFully` returns plaintext (e.g. lastResultBody written by
// an older findOneAndUpdate path) untouched.
const MAX_LAYERS = 3;

const encryptOnce = (value) => {
  if (!value || typeof value !== 'string') return value;
  return encryption.decrypt(value) !== value ? value : encryption.encrypt(value);
};

const decryptFully = (value) => {
  let current = value;
  for (let i = 0; i < MAX_LAYERS; i += 1) {
    const next = encryption.decrypt(current);
    if (next === current) break;
    current = next;
  }
  return current;
};

const mapFields = (obj, fields, fn) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  fields.forEach((field) => {
    if (out[field]) out[field] = fn(out[field]);
  });
  return out;
};

const toPlain = (doc) => (doc && doc.toObject ? doc.toObject() : doc);

const encryptEventConfig = (event) => {
  if (!event) return event;
  return mapFields(toPlain(event), ENCRYPTION_FIELDS.agentEvent, encryptOnce);
};

const decryptEventConfig = (event) => {
  if (!event) return event;
  return mapFields(toPlain(event), ENCRYPTION_FIELDS.agentEvent, decryptFully);
};

const encryptAgent = function encryptAgent(next) {
  const encrypted = mapFields(this.toObject(), ENCRYPTION_FIELDS.agent, encryptOnce);
  Object.assign(this, encrypted);
  if (this.startEvent) {
    this.startEvent = encryptEventConfig(this.startEvent);
  }
  if (this.endEvent) {
    this.endEvent = encryptEventConfig(this.endEvent);
  }
  next();
};

AgentSchema.pre('save', encryptAgent);

// findOneAndUpdate (recordAgentExecution) skips save hooks, so lastResultBody /
// lastError used to be written in plaintext. Covers bare and $set updates,
// whole event objects and dotted `startEvent.value` paths.
const encryptUpdate = (update) => {
  if (!update || typeof update !== 'object') return;
  ENCRYPTION_FIELDS.agent.forEach((field) => {
    if (update[field]) update[field] = encryptOnce(update[field]);
  });
  ['startEvent', 'endEvent'].forEach((event) => {
    if (update[event]) update[event] = encryptEventConfig(update[event]);
    ENCRYPTION_FIELDS.agentEvent.forEach((field) => {
      const path = `${event}.${field}`;
      if (update[path]) update[path] = encryptOnce(update[path]);
    });
  });
};

const encryptAgentUpdate = function encryptAgentUpdate(next) {
  const update = this.getUpdate();
  encryptUpdate(update);
  if (update) encryptUpdate(update.$set);
  next();
};

AgentSchema.pre('findOneAndUpdate', encryptAgentUpdate);

const decryptAgentDoc = (doc) => {
  if (!doc) return doc;
  const decrypted = mapFields(toPlain(doc), ENCRYPTION_FIELDS.agent, decryptFully);
  if (decrypted.startEvent) {
    decrypted.startEvent = decryptEventConfig(decrypted.startEvent);
  }
  if (decrypted.endEvent) {
    decrypted.endEvent = decryptEventConfig(decrypted.endEvent);
  }
  Object.assign(doc, decrypted);
  return doc;
};

const decryptAgentDocs = (docs) => {
  if (!docs) return;
  if (Array.isArray(docs)) {
    docs.forEach(decryptAgentDoc);
  } else {
    decryptAgentDoc(docs);
  }
};

AgentSchema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndRemove', 'findOneAndDelete'], decryptAgentDocs);
// save() leaves the in-memory doc encrypted; decrypt it so addAgent /
// updateAgent return plaintext instead of ciphertext.
AgentSchema.post('save', decryptAgentDocs);

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
  encryptAgent,
  encryptAgentUpdate,
  decryptAgentDocs,
  EVENT_KINDS,
  STATUSES,
  RESULT_TYPES,
  RESULT_BODY_MAX,
  ERROR_MAX,
};
