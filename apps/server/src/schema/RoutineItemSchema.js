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
    splitRate: { type: GraphQLInt },
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
});

// Encryption middleware for StepItemSchema
const encryptStepData = function encryptStep(next) {
  const encryptedData = encryption.encryptObject(this.toObject(), ['name']);
  Object.assign(this, encryptedData);
  next();
};

StepItemSchema.pre('save', encryptStepData);

// Encryption middleware for RoutineItemSchema
const encryptRoutineItemData = function encryptRoutineItem(next) {
  const encryptedData = encryption.encryptObject(this.toObject(), ENCRYPTION_FIELDS.routineItem);
  Object.assign(this, encryptedData);

  // Encrypt steps
  if (this.steps && this.steps.length > 0) {
    this.steps = this.steps.map((step) => encryption.encryptObject(step.toObject ? step.toObject() : step, ['name']));
  }

  next();
};

const decryptRoutineItemData = function decryptRoutineItem(docs) {
  if (!docs) return;

  const decrypt = (doc) => {
    const decrypted = encryption.decryptObject(doc.toObject ? doc.toObject() : doc, ENCRYPTION_FIELDS.routineItem);

    // Decrypt steps
    if (decrypted.steps && decrypted.steps.length > 0) {
      decrypted.steps = decrypted.steps.map((step) => encryption.decryptObject(step, ['name']));
    }

    Object.assign(doc, decrypted);
    return doc;
  };

  if (Array.isArray(docs)) {
    docs.forEach(decrypt);
  } else {
    decrypt(docs);
  }
};

RoutineItemSchema.pre('save', encryptRoutineItemData);
RoutineItemSchema.post(['find', 'findOne', 'findOneAndUpdate'], decryptRoutineItemData);

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
  },
});

const RoutineItemModel = mongoose.model('routineItem', RoutineItemSchema);

module.exports = { RoutineItemSchema, RoutineItemModel, RoutineItemType };
