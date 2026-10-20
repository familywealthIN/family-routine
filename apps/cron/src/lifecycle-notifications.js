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

const { getLocalDate, groupUsersByTimezone } = require('./utils/timezone');
const { encryption } = require('./utils/encryption');
const { HAS_DEVICE, deviceTokens, sendToUser } = require('./utils/push');
const { minuteOfDay } = require('./cue/cueEngine');
const { planNotifications, lifecycleDates } = require('./lifecycle/planner');
const { withDefaults } = require('./lifecycle/prefs');

const serviceAccount = require('../serviceAccountKey.json');

const { MONGDO_DB, DOMAIN } = process.env;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOG_DAYS = 40;

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const dec = (text) => encryption.decrypt(text);
const goalItemsOf = (docs, email, period, date) => docs
  .filter((g) => g.email === email && g.period === period && g.date === date)
  .flatMap((g) => g.goalItems || [])
  .map((g) => ({ ...g, body: dec(g.body) }));

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
      const today = getLocalDate(timezone, now);
      const nowMinute = minuteOfDay(now, timezone);
      const dates = lifecycleDates(today);
      const emails = group.map((u) => u.email);

      const [items, routines, goals, chats, sent] = await Promise.all([
        db.collection('routineitems')
          .find({ email: { $in: emails } }, {
            projection: {
              email: 1, name: 1, time: 1, points: 1,
            },
          })
          .toArray(),
        db.collection('routines')
          .find({ email: { $in: emails }, date: { $in: dates.history } }, {
            projection: {
              email: 1, date: 1, skip: 1, 'tasklist._id': 1, 'tasklist.ticked': 1,
            },
          })
          .toArray(),
        db.collection('goals')
          .find({
            email: { $in: emails },
            $or: [
              { period: 'day', date: { $in: [today, dates.yesterday] } },
              { period: 'week', date: dates.week },
            ],
          }, {
            projection: {
              email: 1,
              period: 1,
              date: 1,
              'goalItems.body': 1,
              'goalItems.isComplete': 1,
              'goalItems.status': 1,
            },
          })
          .toArray(),
        db.collection('routinechatmessages')
          .find({
            email: { $in: emails },
            createdAt: { $gte: new Date(now.getTime() - 14 * DAY_MS) },
          }, {
            projection: {
              email: 1, taskRef: 1, from: 1, icon: 1, text: 1, added: 1, createdAt: 1,
            },
          })
          .toArray(),
        logs
          .find({ email: { $in: emails }, sentAt: { $gte: new Date(now.getTime() - LOG_DAYS * DAY_MS) } })
          .toArray(),
      ]);

      group.forEach((user) => {
        const { email } = user;
        const mine = sent.filter((l) => l.email === email);
        const planned = planNotifications({
          now,
          timezone,
          today,
          nowMinute,
          prefs: withDefaults(user.notificationPrefs),
          items: items.filter((i) => i.email === email).map((i) => ({ ...i, name: dec(i.name) })),
          routines: routines.filter((r) => r.email === email),
          dayGoals: goalItemsOf(goals, email, 'day', today),
          carryOver: goalItemsOf(goals, email, 'day', dates.yesterday),
          weekGoals: goalItemsOf(goals, email, 'week', dates.week),
          chats: chats.filter((m) => m.email === email).map((m) => ({ ...m, text: dec(m.text) })),
          sentKeys: new Set(mine.map((l) => l.key)),
          sentToday: mine.filter((l) => l.date === today).length,
        });

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
