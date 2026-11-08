// Mirrors apps/server/src/schema/NotificationPrefsSchema.js — the cron package
// does not depend on the server. A missing value means the default.
const NOTIFICATION_PREF_DEFAULTS = {
  morning: true,
  plan: true,
  evening: true,
  streak: true,
  reengage: true,
  insights: true,
  missedEmail: true, // sent by apps/server (missed-days email), not by cron
  morningTime: '07:00',
  eveningTime: '21:00',
};

const withDefaults = (prefs) => Object.keys(NOTIFICATION_PREF_DEFAULTS).reduce((out, key) => ({
  ...out,
  [key]: prefs && prefs[key] !== undefined && prefs[key] !== null
    ? prefs[key] : NOTIFICATION_PREF_DEFAULTS[key],
}), {});

module.exports = { NOTIFICATION_PREF_DEFAULTS, withDefaults };
