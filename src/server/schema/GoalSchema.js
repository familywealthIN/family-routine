const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLObjectType,
  GraphQLInt,
} = require('graphql');

const mongoose = require('mongoose');
const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

const SubTaskItemSchema = new mongoose.Schema({
  body: String,
  isComplete: Boolean,
});

const GoalItemSchema = new mongoose.Schema({
  body: String,
  isComplete: Boolean,
  isMilestone: Boolean,
  deadline: String,
  contribution: String,
  reward: String,
  taskRef: String,
  goalRef: String,
  tags: [{
    type: String,
  }],
  subTasks: [SubTaskItemSchema],
  status: {
    type: String,
    enum: ['todo', 'progress', 'done', 'missed', 'rescheduled'],
    default: 'todo',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  originalDate: String, // Track original date for rescheduled tasks
});

const GoalSchema = new mongoose.Schema({
  date: String,
  email: String,
  period: String,
  goalItems: [GoalItemSchema],
});

// Encryption middleware for GoalSchema
GoalSchema.pre('save', function encryptGoal(next) {
  if (this.goalItems && this.goalItems.length > 0) {
    this.goalItems = this.goalItems.map((goalItem) => {
      // Encrypt the goal item
      const encrypted = encryption.encryptObject(goalItem.toObject(), ENCRYPTION_FIELDS.goalItem);

      // Encrypt subtasks within each goal item
      if (encrypted.subTasks && encrypted.subTasks.length > 0) {
        encrypted.subTasks = encryption.encryptArray(encrypted.subTasks, ENCRYPTION_FIELDS.subTask);
      }

      return encrypted;
    });
  }
  next();
});

// Decryption helper function
const decryptGoalItem = (goalItem) => {
  try {
    const decrypted = encryption.decryptObject(goalItem.toObject ? goalItem.toObject() : goalItem, ENCRYPTION_FIELDS.goalItem);

    // Decrypt subtasks within each goal item
    if (decrypted.subTasks && decrypted.subTasks.length > 0) {
      decrypted.subTasks = encryption.decryptArray(decrypted.subTasks, ENCRYPTION_FIELDS.subTask);
    }

    return decrypted;
  } catch (error) {
    console.error('Decryption error for goal item:', error.message);
    // Return the original item if decryption fails
    return goalItem.toObject ? goalItem.toObject() : goalItem;
  }
};

// Decryption middleware for GoalSchema
const decryptGoalData = function decryptGoal(docs) {
  if (!docs) return;

  const decrypt = (doc) => {
    try {
      if (doc.goalItems && doc.goalItems.length > 0) {
        // eslint-disable-next-line no-param-reassign
        doc.goalItems = doc.goalItems.map(decryptGoalItem);
      }
      return doc;
    } catch (error) {
      console.error('Decryption error for goal:', error.message);
      return doc; // Return original doc if decryption fails
    }
  };

  try {
    if (Array.isArray(docs)) {
      docs.forEach(decrypt);
    } else {
      decrypt(docs);
    }
  } catch (error) {
    console.error('Decryption middleware error:', error.message);
    // Continue without throwing to prevent Lambda crash
  }
};

GoalSchema.post(['find', 'findOne', 'findOneAndUpdate'], decryptGoalData);

const GoalItemTypeFields = {
  id: { type: GraphQLID },
  email: { type: GraphQLString },
  date: { type: GraphQLString },
  period: { type: GraphQLString },
  body: { type: GraphQLString },
  deadline: { type: GraphQLString },
  contribution: { type: GraphQLString },
  reward: { type: GraphQLString },
  isComplete: { type: GraphQLBoolean },
  isMilestone: { type: GraphQLBoolean },
  taskRef: { type: GraphQLString },
  progress: { type: GraphQLInt },
  goalRef: { type: GraphQLString },
  tags: { type: new GraphQLList(GraphQLString) },
  status: { type: GraphQLString },
  createdAt: { type: GraphQLString },
  completedAt: { type: GraphQLString },
  originalDate: { type: GraphQLString },
};

const SubTaskItemType = new GraphQLObjectType({
  name: 'SubTaskItem',
  fields: {
    id: { type: GraphQLID },
    body: { type: GraphQLString },
    isComplete: { type: GraphQLBoolean },
  },
});

const GoalItemType = new GraphQLObjectType({
  name: 'GoalItem',
  fields: {
    ...GoalItemTypeFields,
    subTasks: { type: new GraphQLList(SubTaskItemType) },
  },
});

const GoalItemWeekType = new GraphQLObjectType({
  name: 'GoalItemWeek',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemType) },
  },
});

const GoalItemMonthType = new GraphQLObjectType({
  name: 'GoalItemMonth',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemWeekType) },
  },
});

const GoalItemYearType = new GraphQLObjectType({
  name: 'GoalItemYear',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemMonthType) },
  },
});

const GoalItemLifetimeType = new GraphQLObjectType({
  name: 'GoalItemLifetime',
  fields: {
    ...GoalItemTypeFields,
    milestones: { type: new GraphQLList(GoalItemYearType) },
  },
});

const GoalMilestoneType = new GraphQLObjectType({
  name: 'GoalMilestone',
  fields: {
    day: { type: new GraphQLList(GoalItemType) },
    week: { type: new GraphQLList(GoalItemWeekType) },
    month: { type: new GraphQLList(GoalItemMonthType) },
    year: { type: new GraphQLList(GoalItemYearType) },
    lifetime: { type: new GraphQLList(GoalItemLifetimeType) },
  },
});

const GoalType = new GraphQLObjectType({
  name: 'Goal',
  fields: {
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    // day, start of week, start of month, start of year, birthdate or 1970
    date: { type: GraphQLString },
    period: { type: GraphQLString }, // day, week, month, year, lifetime
    goalItems: {
      type: new GraphQLList(GoalItemType),
    },
  },
});

const SubTaskItemModel = mongoose.model('SubTaskItem', SubTaskItemSchema);
const GoalItemModel = mongoose.model('GoalItem', GoalItemSchema);
const GoalModel = mongoose.model('Goal', GoalSchema);

module.exports = {
  SubTaskItemSchema,
  GoalSchema,
  GoalItemSchema,
  SubTaskItemModel,
  GoalModel,
  GoalItemModel,
  SubTaskItemType,
  GoalType,
  GoalItemType,
  GoalMilestoneType,
};
