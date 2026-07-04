/* eslint-disable quote-props */
// Daily XP settlement sweeper. Settles every user's unsettled days up to
// yesterday in their timezone and runs referral reward checks. Backstop for
// the server's lazy settlement — safe to overlap it (unique txn index +
// monotonic cursor). Run daily via the external scheduler.
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const { settleUser, models } = require('./utils/xpSettlement');

const { MONGDO_DB } = process.env;

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

console.log('Process Started: settle-xp (per-user timezone XP settlement)');

mongoose.connect(MONGDO_DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
mongoose.Promise = global.Promise;
const db = mongoose.connection;

db.once('open', async () => {
  try {
    const users = await models.UserModel
      .find({}, { email: 1, timezone: 1, xpLastSettled: 1 }).exec();

    let totalSettled = 0;
    let skipped = 0;
    // Sequential on purpose: bounded write pressure on a shared cluster.
    // eslint-disable-next-line no-restricted-syntax
    for (const user of users) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await settleUser(user);
        totalSettled += result.settled;
        if (result.skipped) skipped += 1;
      } catch (error) {
        console.error(`settle-xp failed for ${user.email}:`, error.message);
      }
    }

    console.log(`settle-xp: ${users.length} user(s), ${totalSettled} day(s) settled, ${skipped} awaiting backfill`);
  } catch (error) {
    console.error('settle-xp cron error:', error);
  } finally {
    exitProcess();
  }
});
