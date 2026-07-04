/* eslint-disable quote-props */
// ONE-TIME migration: settle every user's full routine history (per-stimulus
// daily caps applied) into the XP ledger and anchor their settlement cursor.
// Idempotent — re-running dedupes on the unique {email,type,refKey} index.
// Run AFTER the server with the XpTransaction index is deployed, BEFORE the
// daily settle-xp sweeper is scheduled.
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const { backfillUser, models } = require('./utils/xpSettlement');

const { MONGDO_DB } = process.env;

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

console.log('Process Started: backfill-xp (one-time full-history XP backfill)');

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

    let totalDays = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const user of users) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { settled, totalPoints } = await backfillUser(user);
        totalDays += settled;
        console.log(`backfill-xp ${user.email}: ${settled} day(s), ${totalPoints} point(s)`);
      } catch (error) {
        console.error(`backfill-xp failed for ${user.email}:`, error.message);
      }
    }

    console.log(`backfill-xp: ${users.length} user(s), ${totalDays} day(s) credited`);
  } catch (error) {
    console.error('backfill-xp cron error:', error);
  } finally {
    exitProcess();
  }
});
