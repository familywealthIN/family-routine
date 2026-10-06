const {
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
  GraphQLObjectType,
} = require('graphql');

const mongoose = require('mongoose');
const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');

// 'me' = the user, 'routine' = the routine's own voice (the model).
const SENDERS = ['me', 'routine'];
// 'text' renders as a bubble; 'event' renders as a centred pill (routine
// ticked, goal item checked, agent started, proposals added).
const KINDS = ['text', 'event'];
// orange: a day-level interruption (the day was skipped).
const TONES = ['green', 'blue', 'orange'];
const TEXT_MAX = 4000;

const RoutineChatMessageSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  // DD-MM-YYYY — the chat is a property of the day, like the routine itself.
  date: { type: String, required: true },
  // The routine item id this thread belongs to (RoutineItem._id as a string).
  taskRef: { type: String, required: true },
  from: { type: String, enum: SENDERS, required: true },
  kind: { type: String, enum: KINDS, default: 'text' },
  text: { type: String, required: true, maxlength: TEXT_MAX },
  // Goal item ids to render as live checkbox rows inside the bubble.
  items: { type: [String], default: [] },
  // Proposed checklist items from a "break it down" turn. Not yet persisted as
  // goal items — `added` flips once the user presses "Add all to checklist".
  proposals: { type: [String], default: [] },
  added: { type: Boolean, default: false },
  tone: { type: String, enum: [...TONES, null], default: null },
  icon: { type: String, default: null },
  // Which free OpenRouter model answered. Kept for debugging a roster that
  // silently degrades — free models disappear without notice.
  model: { type: String, default: null },
}, { timestamps: true });

RoutineChatMessageSchema.index({ email: 1, date: 1, taskRef: 1, createdAt: 1 });

// `proposals` holds the same class of content as `text` — task bodies the user
// is about to accept — but ENCRYPTION_FIELDS only knows how to handle scalar
// string fields, so the array is encrypted element-wise here. `decrypt()`
// returns anything that is not ciphertext unchanged, so this is safe over rows
// written before it existed.
const mapStrings = (value, fn) => (Array.isArray(value)
  ? value.map((entry) => (typeof entry === 'string' ? fn(entry) : entry))
  : value);

RoutineChatMessageSchema.pre('save', function encryptMessage(next) {
  const encrypted = encryption.encryptObject(this.toObject(), ENCRYPTION_FIELDS.routineChat);
  Object.assign(this, encrypted);
  this.proposals = mapStrings(this.proposals, (p) => encryption.encrypt(p));
  next();
});

const decryptMessageDoc = (doc) => {
  if (!doc) return doc;
  const plain = doc.toObject ? doc.toObject() : doc;
  Object.assign(doc, encryption.decryptObject(plain, ENCRYPTION_FIELDS.routineChat));
  doc.proposals = mapStrings(doc.proposals, (p) => encryption.decrypt(p));
  return doc;
};

/**
 * `pre('save')` encrypts IN PLACE, and the post-read hooks only run on reads —
 * so the document `save()` resolves with carries ciphertext. Any resolver that
 * returns a freshly saved message must hand it through here first, or the
 * client renders a base64 blob instead of the reply.
 */
const decryptSaved = (doc) => decryptMessageDoc(doc);

RoutineChatMessageSchema.post(['find', 'findOne', 'findOneAndUpdate'], (docs) => {
  if (!docs) return;
  if (Array.isArray(docs)) {
    docs.forEach(decryptMessageDoc);
  } else {
    decryptMessageDoc(docs);
  }
});

const RoutineChatMessageType = new GraphQLObjectType({
  name: 'RoutineChatMessage',
  fields: {
    id: { type: GraphQLID },
    date: { type: GraphQLString },
    taskRef: { type: GraphQLString },
    from: { type: GraphQLString },
    kind: { type: GraphQLString },
    text: { type: GraphQLString },
    items: { type: new GraphQLList(GraphQLString) },
    proposals: { type: new GraphQLList(GraphQLString) },
    added: { type: GraphQLBoolean },
    tone: { type: GraphQLString },
    icon: { type: GraphQLString },
    model: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  },
});

/**
 * What `sendRoutineChat` returns: both persisted messages plus the intent the
 * client should act on. The client owns the actual goal-item mutations (they
 * need its optimistic cache writes), so the resolver reports the intent rather
 * than performing it.
 */
const RoutineChatReplyType = new GraphQLObjectType({
  name: 'RoutineChatReply',
  fields: {
    userMessage: { type: RoutineChatMessageType },
    replyMessage: { type: RoutineChatMessageType },
    intent: { type: GraphQLString },
    tasks: { type: new GraphQLList(GraphQLString) },
    completeItemId: { type: GraphQLString },
    model: { type: GraphQLString },
    error: { type: GraphQLString },
  },
});

const RoutineChatMessageModel = mongoose.model(
  'RoutineChatMessage',
  RoutineChatMessageSchema,
);

module.exports = {
  decryptSaved,
  RoutineChatMessageSchema,
  RoutineChatMessageModel,
  RoutineChatMessageType,
  RoutineChatReplyType,
  SENDERS,
  KINDS,
  TONES,
  TEXT_MAX,
};
