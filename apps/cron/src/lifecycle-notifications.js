/**
 * Day-level notifications: good morning, day planning, end of day progress,
 * streak celebrations, re-engagement and unopened insights. What goes out is
 * decided by lifecycle/planner.js; this script loads, logs and sends.
 *
 * Run every 15 minutes (docs/n8n/6-lifecycle-notifications.json). Scheduled
 * notifications have an hour-long window and a once-only key, so a missed or
 * doubled run neither drops nor repeats one. Replaces progress.js.
 */
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const { groupUsersByTimezone } = require('./utils/timezone');
const { HAS_DEVICE, deviceTokens, sendToUser } = require('./utils/push');
const { planForTimezone } = require('./lifecycle/load');

const serviceAccount = require('../serviceAccountKey.json');

const { MONGDO_DB, DOMAIN } = process.env;

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

console.log('Process Started: lifecycle notifications');

mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', async () => {
  try {
    const logs = db.collection('notificationlogs');
    await logs.createIndex({ email: 1, key: 1 }, { unique: true });

    const users = (await db.collection('users')
      .find(HAS_DEVICE, {
        projection: {
          email: 1, notificationId: 1, notificationIds: 1, timezone: 1, notificationPrefs: 1,
        },
      })
      .toArray())
      .filter((u) => deviceTokens(u).length);

    const now = new Date();
    const sends = [];

    await Promise.all(Array.from(groupUsersByTimezone(users).entries()).map(async ([timezone, group]) => {
      const { today, plans } = await planForTimezone(db, timezone, group, now);

      plans.forEach(({ user, planned }) => {
        const { email } = user;
        planned.forEach((n) => sends.push((async () => {
          // Log first: a unique-key clash means another run already sent it.
          try {
            await logs.insertOne({
              email, key: n.key, kind: n.kind, date: today, sentAt: new Date(),
            });
          } catch (error) {
            if (error.code === 11000) return;
            throw error;
          }
          console.log(`[${timezone}] ${n.kind} → ${email}`);
          await sendToUser({
            messaging: admin.messaging(),
            db,
            user,
            title: n.title,
            body: n.body,
            data: { click_action: DOMAIN || '', route: n.route, kind: n.kind },
            priority: n.kind === 'streak' ? 'high' : 'normal',
          });
        })()));
      });
    }));

    await Promise.all(sends);
  } catch (error) {
    console.error('lifecycle-notifications error:', error);
  } finally {
    exitProcess();
  }
});

setTimeout(() => exitProcess(), 5 * 60 * 1000);
