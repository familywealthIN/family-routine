const {
  GraphQLString,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLList,
} = require('graphql');

const Mongoose = require('../mongoose');
const { MottoItemSchema, MottoItemType } = require('./MottoSchema');
const { generateAccessToken, upsertGoogleUser } = require('../passport');

const UserSchema = new Mongoose.Schema({
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
  social: {
    googleProvider: {
      id: String,
      token: String,
    },
  },
  motto: [MottoItemSchema],
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
    inviterEmail: { type: GraphQLString },
    invitedEmail: { type: GraphQLString },
    isNew: { type: GraphQLBoolean },
    motto: {
      type: new GraphQLList(MottoItemType),
    },
  },
});

const UserModel = Mongoose.model('User', UserSchema);

module.exports = { UserSchema, UserModel, UserItemType };
