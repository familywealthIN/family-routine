const {
  GraphQLString,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLList,
  GraphQLInt,
} = require('graphql');

const mongoose = require('mongoose');
const { MottoItemSchema, MottoItemType } = require('./MottoSchema');
const { generateAccessToken, upsertGoogleUser } = require('../passport');

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
  social: {
    googleProvider: {
      id: String,
      token: String,
    },
  },
  motto: [MottoItemSchema],
  tags: [{
    type: String,
  }],
});

// Model Methods
UserSchema.methods.generateJWT = generateAccessToken;

UserSchema.statics.upsertGoogleUser = upsertGoogleUser;

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
    isNew: { type: GraphQLBoolean },
    motto: {
      type: new GraphQLList(MottoItemType),
    },
    tags: { type: new GraphQLList(GraphQLString) },
  },
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = { UserSchema, UserModel, UserItemType };
