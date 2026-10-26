/**
 * Print the lifecycle notifications one person would get, without sending or
 * logging anything — the dry run of lifecycle-notifications.js.
 *
 *   node preview-lifecycle.js <email> [--date DD-MM-YYYY] [--at HH:MM] [--ignore-sent]
 *     [--morning-time HH:MM] [--evening-time HH:MM]
 *
 * --date plans for that day instead of today (the beta cycle's simulated
 * days). --at plans as if it were that local time (the default is now), so a
 * morning, plan, insights or evening window can be checked at any hour.
 * --ignore-sent plans as if nothing had gone out yet; without it, today's
 * notificationlogs keys and the daily cap apply exactly as in the job.
 * --morning-time / --evening-time plan with that preference instead of the
 * saved one, in memory only — the user's prefs are not written.
 * Needs no Firebase service account and works for a user with no device.
 */
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');

const { resolveTimezone } = require('./utils/timezone');
const { deviceTokens } = require('./utils/push');
const { toMinutes } = require('./cue/cueEngine');
const { withDefaults } = require('./lifecycle/prefs');
const { planForTimezone } = require('./lifecycle/load');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const VALUED = ['--at', '--date', '--morning-time', '--evening-time'];
const email = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const at = flag('--at');
const date = flag('--date');
const prefTimes = {
  ...(flag('--morning-time') !== undefined && { morningTime: flag('--morning-time') }),
  ...(flag('--evening-time') !== undefined && { eveningTime: flag('--evening-time') }),
};
const ignoreSent = args.includes('--ignore-sent');

if (!email || (at !== undefined && toMinutes(at) === null)
  || (date !== undefined && !/^\d{2}-\d{2}-\d{4}$/.test(date))
  || Object.values(prefTimes).some((t) => toMinutes(t) === null)) {
  console.error('usage: node preview-lifecycle.js <email> [--date DD-MM-YYYY] [--at HH:MM] [--ignore-sent] '
    + '[--morning-time HH:MM] [--evening-time HH:MM]');
  process.exit(2);
}

async function main(db) {
  const user = await db.collection('users').findOne(
    { email },
    {
      projection: {
        email: 1, notificationId: 1, notificationIds: 1, timezone: 1, notificationPrefs: 1,
      },
    },
  );
  if (!user) throw new Error(`no user ${email}`);
  user.notificationPrefs = { ...user.notificationPrefs, ...prefTimes };
  const timezone = resolveTimezone(user.timezone);
  const { today, plans } = await planForTimezone(db, timezone, [user], new Date(), {
    today: date,
    nowMinute: at !== undefined ? toMinutes(at) : undefined,
    ignoreSent,
  });

  console.log(JSON.stringify({
    email,
    timezone,
    today,
    at: at || 'now',
    ignoreSent,
    devices: deviceTokens(user).length,
    prefs: withDefaults(user.notificationPrefs),
    planned: plans[0].planned,
  }, null, 2));
}

mongoose.connect(process.env.MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () => main(db)
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().then(() => process.exit())));
