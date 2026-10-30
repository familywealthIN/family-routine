/**
 * Which lifecycle notifications a user gets, and when. Routine cues are set
 * per routine (RoutineItem.notifyMode); these are the day-level ones sent by
 * apps/cron/src/lifecycle-notifications.js, plus the missed-days email
 * (apps/server/src/jobs/missedDays.js). A missing value means the default
 * below, so existing users are opted in without a migration.
 */
const {
  GraphQLBoolean, GraphQLString, GraphQLObjectType, GraphQLInputObjectType,
} = require('graphql');
const mongoose = require('mongoose');

const NOTIFICATION_PREF_DEFAULTS = {
  morning: true, // Good morning + day context
  plan: true, // day planning + suggested tasks
  evening: true, // end of day progress
  streak: true, // streak milestone celebrations
  reengage: true, // coming back after days away
  insights: true, // insights the user has not looked at
  missedEmail: true, // one email after 3 missed days (src/jobs/missedDays.js)
  morningTime: '07:00',
  eveningTime: '21:00',
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const NotificationPrefsSchema = new mongoose.Schema({
  morning: Boolean,
  plan: Boolean,
  evening: Boolean,
  streak: Boolean,
  reengage: Boolean,
  insights: Boolean,
  missedEmail: Boolean,
  morningTime: String,
  eveningTime: String,
}, { _id: false });

const fields = (type) => ({
  morning: { type: GraphQLBoolean },
  plan: { type: GraphQLBoolean },
  evening: { type: GraphQLBoolean },
  streak: { type: GraphQLBoolean },
  reengage: { type: GraphQLBoolean },
  insights: { type: GraphQLBoolean },
  missedEmail: { type: GraphQLBoolean },
  morningTime: { type },
  eveningTime: { type },
});

const NotificationPrefsType = new GraphQLObjectType({
  name: 'NotificationPrefs',
  fields: fields(GraphQLString),
});

const NotificationPrefsInput = new GraphQLInputObjectType({
  name: 'NotificationPrefsInput',
  fields: fields(GraphQLString),
});

/** Stored prefs over the defaults. */
const withDefaults = (prefs) => {
  const stored = (prefs && (prefs.toObject ? prefs.toObject() : prefs)) || {};
  return Object.keys(NOTIFICATION_PREF_DEFAULTS).reduce((out, key) => ({
    ...out,
    [key]: stored[key] === undefined || stored[key] === null
      ? NOTIFICATION_PREF_DEFAULTS[key] : stored[key],
  }), {});
};

/** Only known keys with valid values; throws on a malformed time. */
function sanitizePrefs(input) {
  const out = {};
  Object.keys(NOTIFICATION_PREF_DEFAULTS).forEach((key) => {
    const value = input && input[key];
    if (value === undefined || value === null) return;
    if (key.endsWith('Time')) {
      if (!HHMM.test(value)) throw new Error(`${key} must be HH:mm`);
      out[key] = value;
    } else {
      out[key] = !!value;
    }
  });
  return out;
}

module.exports = {
  NOTIFICATION_PREF_DEFAULTS,
  NotificationPrefsSchema,
  NotificationPrefsType,
  NotificationPrefsInput,
  withDefaults,
  sanitizePrefs,
};
