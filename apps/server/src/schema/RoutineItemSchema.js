const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
  GraphQLFloat,
} = require('graphql');

const mongoose = require('mongoose');
const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

const StepItemSchema = new mongoose.Schema({
  id: String,
  name: String,
});

const StepItemType = new GraphQLObjectType({
  name: 'StepItem',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const StimulusItemSchema = new mongoose.Schema({
  name: String,
  splitRate: Number,
  earned: Number,
});

const StimulusItemType = new GraphQLObjectType({
  name: 'StimuliItem',
  fields: {
    name: { type: GraphQLString },
    // Fractional hours: the D split rate is a real time gap (06:40 -> 09:00 is
    // 2.33), so an Int here would fail serialization.
    splitRate: { type: GraphQLFloat },
    earned: { type: GraphQLFloat },
    potential: { type: GraphQLInt },
  },
});

const RoutineItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  email: String,
  time: String,
  points: Number,
  startEvent: String,
  endEvent: String,
  tags: [{
    type: String,
  }],
  stimuli: [StimulusItemSchema],
  steps: [StepItemSchema],
  ticked: Boolean,
  passed: Boolean,
  wait: Boolean,
  redeemed: Boolean,
  passedPoints: Number,
});

// Field encryption at rest.
//
// Steps are encrypted by the parent hook only. A StepItemSchema pre('save')
// used to encrypt them as well, so every step written through save() was
// stored double-encrypted and read back (decrypted once) as ciphertext.
//
// Both helpers are tolerant of the mixed states already in the database:
// `encryptOnce` leaves a value that already decrypts with our key alone, and
// `decryptFully` peels up to MAX_LAYERS of encryption (legacy double-encrypted
// steps) while returning plaintext untouched.
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

const STEP_FIELDS = ['name'];

const mapFields = (obj, fields, fn) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  fields.forEach((field) => {
    if (out[field]) out[field] = fn(out[field]);
  });
  return out;
};

const toPlain = (doc) => (doc && doc.toObject ? doc.toObject() : doc);

const encryptSteps = (steps) => (Array.isArray(steps)
  ? steps.map((step) => mapFields(toPlain(step), STEP_FIELDS, encryptOnce))
  : steps);

const decryptSteps = (steps) => (Array.isArray(steps)
  ? steps.map((step) => mapFields(toPlain(step), STEP_FIELDS, decryptFully))
  : steps);

// Encryption middleware for RoutineItemSchema
const encryptRoutineItemData = function encryptRoutineItem(next) {
  const encryptedData = mapFields(this.toObject(), ENCRYPTION_FIELDS.routineItem, encryptOnce);
  Object.assign(this, encryptedData);

  if (this.steps && this.steps.length > 0) {
    this.steps = encryptSteps(this.steps);
  }

  next();
};

// findOneAndUpdate (updateRoutineItem) skips save hooks, so without this the
// edited name/description/steps were written in plaintext. Handles both a
// bare update object and one wrapped in $set.
const encryptUpdate = (update) => {
  if (!update || typeof update !== 'object') return;
  ENCRYPTION_FIELDS.routineItem.forEach((field) => {
    if (update[field]) update[field] = encryptOnce(update[field]);
  });
  if (update.steps) update.steps = encryptSteps(update.steps);
};

const encryptRoutineItemUpdate = function encryptRoutineItemUpdateHook(next) {
  const update = this.getUpdate();
  encryptUpdate(update);
  if (update) encryptUpdate(update.$set);
  next();
};

const warnedDeprecationFor = new Set();
const warnDeprecatedEvents = (doc) => {
  if (!doc || (!doc.startEvent && !doc.endEvent)) return;
  const id = doc._id ? String(doc._id) : null;
  if (!id || warnedDeprecationFor.has(id)) return;
  warnedDeprecationFor.add(id);
  console.warn(
    '[DEPRECATED] routineItem.startEvent/endEvent are read on doc',
    id,
    '— migrate to the Agent domain (apps/server/scripts/migrateRoutineEventsToAgents.js).',
  );
};

const decryptRoutineItemData = function decryptRoutineItem(docs) {
  if (!docs) return;

  const decrypt = (doc) => {
    const decrypted = mapFields(toPlain(doc), ENCRYPTION_FIELDS.routineItem, decryptFully);

    if (decrypted.steps && decrypted.steps.length > 0) {
      decrypted.steps = decryptSteps(decrypted.steps);
    }

    Object.assign(doc, decrypted);
    warnDeprecatedEvents(doc);
    return doc;
  };

  if (Array.isArray(docs)) {
    docs.forEach(decrypt);
  } else {
    decrypt(docs);
  }
};

RoutineItemSchema.pre('save', encryptRoutineItemData);
RoutineItemSchema.pre('findOneAndUpdate', encryptRoutineItemUpdate);
RoutineItemSchema.post(
  ['find', 'findOne', 'findOneAndUpdate', 'findOneAndRemove', 'findOneAndDelete'],
  decryptRoutineItemData,
);
// save() leaves the in-memory doc encrypted; decrypt it so addRoutineItem /
// bulkAddRoutineItems return (and the create toast shows) plaintext.
RoutineItemSchema.post('save', decryptRoutineItemData);

const RoutineItemType = new GraphQLObjectType({
  name: 'RoutineItem',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    email: { type: GraphQLString },
    time: { type: GraphQLString },
    points: { type: GraphQLInt },
    startEvent: { type: GraphQLString },
    endEvent: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
    stimuli: {
      type: new GraphQLList(StimulusItemType),
    },
    steps: {
      type: new GraphQLList(StepItemType),
    },
    ticked: { type: GraphQLBoolean },
    passed: { type: GraphQLBoolean },
    wait: { type: GraphQLBoolean },
    redeemed: { type: GraphQLBoolean },
    passedPoints: { type: GraphQLInt },
  },
});

const RoutineItemModel = mongoose.model('routineItem', RoutineItemSchema);

module.exports = {
  RoutineItemSchema,
  RoutineItemModel,
  RoutineItemType,
  encryptRoutineItemData,
  encryptRoutineItemUpdate,
  decryptRoutineItemData,
};
