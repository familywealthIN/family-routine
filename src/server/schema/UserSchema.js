const {
  GraphQLString,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLList,
  GraphQLInt,
} = require('graphql');

const mongoose = require('mongoose');
const { encryption, ENCRYPTION_FIELDS } = require('../utils/encryption');
const { MottoItemSchema, MottoItemType } = require('./MottoSchema');
const { generateAccessToken, upsertGoogleUser, upsertAppleUser } = require('../passport');

const UserSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  picture: String,
  groupId: String,
  inviterEmail: String,
  notificationId: String,
  holidays: Number,
  apiKey: {
    type: String,
    unique: true,
    sparse: true, // allows multiple null values
  },
  needsOnboarding: {
    type: Boolean,
    default: true,
  },
  social: {
    googleProvider: {
      id: String,
      token: String,
    },
    appleProvider: {
      id: String,
    },
  },
  motto: [MottoItemSchema],
  tags: [{
    type: String,
  }],
});

// Encryption middleware for UserSchema
const encryptUserData = function encryptUser(next) {
  const encryptedData = encryption.encryptObject(this.toObject(), ENCRYPTION_FIELDS.user);
  Object.assign(this, encryptedData);

  // Encrypt motto items
  if (this.motto && this.motto.length > 0) {
    this.motto = encryption.encryptArray(this.motto, ENCRYPTION_FIELDS.motto);
  }

  next();
};

const decryptUserData = function decryptUser(docs) {
  if (!docs) return;

  const decrypt = (doc) => {
    const decrypted = encryption.decryptObject(doc.toObject ? doc.toObject() : doc, ENCRYPTION_FIELDS.user);

    // Decrypt motto items
    if (decrypted.motto && decrypted.motto.length > 0) {
      decrypted.motto = encryption.decryptArray(decrypted.motto, ENCRYPTION_FIELDS.motto);
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

UserSchema.pre('save', encryptUserData);
UserSchema.post(['find', 'findOne', 'findOneAndUpdate'], decryptUserData);

// Model Methods
UserSchema.methods.generateJWT = generateAccessToken;

UserSchema.statics.upsertGoogleUser = upsertGoogleUser;
UserSchema.statics.upsertAppleUser = upsertAppleUser;

const UserItemType = new GraphQLObjectType({
  name: 'UserItem',
  fields: {
    name: { type: GraphQLString },
    token: { type: GraphQLString },
    email: { type: GraphQLString },
    picture: { type: GraphQLString },
    groupId: { type: GraphQLString },
    notificationId: { type: GraphQLString },
    holidays: { type: GraphQLInt },
    inviterEmail: { type: GraphQLString },
    invitedEmail: { type: GraphQLString },
    needsOnboarding: { type: GraphQLBoolean },
    apiKey: { type: GraphQLString },
    motto: {
      type: new GraphQLList(MottoItemType),
    },
    tags: { type: new GraphQLList(GraphQLString) },
  },
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = { UserSchema, UserModel, UserItemType };
