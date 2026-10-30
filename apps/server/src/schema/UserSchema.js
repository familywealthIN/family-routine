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
const { NotificationPrefsSchema } = require('./NotificationPrefsSchema');
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
  // Legacy single device token; folded into notificationIds on next sign-in.
  notificationId: String,
  // One push token per signed-in device (passport.js registerPushToken).
  notificationIds: [String],
  // Those of notificationIds whose app draws routine cues with their buttons
  // itself (the Android build with RoutineNotification.java): the cron sends
  // them data-only (apps/cron/src/utils/push.js). Set by
  // registerNotificationActions; cleared with the token.
  notificationActionTokens: [String],
  // iPhones that show routine cues as a Live Activity with tappable buttons
  // (iOS 17.2+): the device's push token and its ActivityKit push-to-start
  // token. The cron starts the activity instead of sending the notification.
  // Set by registerLiveActivity; cleared with the device token.
  liveActivityTokens: [{ _id: false, device: String, start: String }],
  // iPhones that ring alarm routines themselves with AlarmKit (iOS 26+): which
  // routines, as "routineId@HH:mm", and up to when they are scheduled. Until
  // then the cron sends that device no alarm push for those routines at those
  // times. Set by registerAlarmDevice; cleared with the token.
  alarmDevices: [{
    _id: false, device: String, through: Date, routines: [String],
  }],
  notificationPrefs: NotificationPrefsSchema,
  holidays: Number,
  apiKey: {
    type: String,
    unique: true,
    sparse: true, // allows multiple null values
  },
  oauth: {
    accessToken: String,
    refreshToken: String,
    expiresAt: Date,
    authCode: String, // Temporary auth code for OAuth flow
  },
  needsOnboarding: {
    type: Boolean,
    default: true,
  },
  timezone: String,
  // XP settlement cursor. Stored as ISO YYYY-MM-DD (NOT the app's DD-MM-YYYY
  // day keys, which do not sort lexicographically) so monotonic $lt guards
  // work. Convert with moment at the boundary.
  xpLastSettled: String,
  subscription: {
    plan: String, // 'monthly' | 'annual'
    status: String, // 'active' | 'cancelled' | 'expired'
    provider: String, // 'paypal' | 'apple' | 'google' (future)
    expiresAt: Date,
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

const UserSubscriptionType = new GraphQLObjectType({
  name: 'UserSubscription',
  fields: {
    plan: { type: GraphQLString },
    status: { type: GraphQLString },
    provider: { type: GraphQLString },
    expiresAt: {
      type: GraphQLString,
      resolve: (sub) => (sub && sub.expiresAt ? sub.expiresAt.toISOString() : null),
    },
  },
});

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
    timezone: { type: GraphQLString },
    apiKey: { type: GraphQLString },
    oauthConnected: { type: GraphQLBoolean },
    motto: {
      type: new GraphQLList(MottoItemType),
    },
    tags: { type: new GraphQLList(GraphQLString) },
    subscription: { type: UserSubscriptionType },
  },
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = {
  UserSchema, UserModel, UserItemType, UserSubscriptionType,
};
