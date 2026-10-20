/* eslint-disable quote-props */
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const { getLocalDate, getLocalTime, groupUsersByTimezone } = require('./utils/timezone');
const { HAS_DEVICE, sendToUser } = require('./utils/push');

const serviceAccount = require('../serviceAccountKey.json');

const {
  MONGDO_DB,
} = process.env;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

console.log('Process Started: timezone-aware weekly agenda notifications');
const notificationList = [];

mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', async () => {
  try {
    const users = await db.collection('users')
      .find(HAS_DEVICE, {
        projection: {
          email: 1, notificationId: 1, notificationIds: 1, timezone: 1,
        },
      })
      .toArray();

    const groups = groupUsersByTimezone(users);
    const now = new Date();

    const perGroup = Array.from(groups.entries()).map(async ([timezone, groupUsers]) => {
      const date = getLocalDate(timezone, now);
      const time = getLocalTime(timezone, now);
      const emails = groupUsers.map((u) => u.email);
      const userByEmail = new Map(groupUsers.map((u) => [u.email, u]));

      console.log(`[${timezone}] weekly-agenda for ${date} ${time} (${emails.length} user(s))`);

      const routines = await db.collection('routines')
        .find(
          { date, email: { $in: emails } },
          { projection: { tasklist: 1, email: 1 } },
        )
        .toArray();

      routines.forEach((routine) => {
        const { email, tasklist } = routine;
        if (!tasklist || !tasklist.length) return;
        const user = userByEmail.get(email);
        if (!user) return;
        console.log(`Sending weekly agenda to ${email}`);
        notificationList.push(sendToUser({
          messaging: admin.messaging(),
          db,
          user,
          title: 'Build your week agenda',
          body: '',
          data: { click_action: 'https://routine.familywealth.in/agenda' },
          priority: 'normal',
        }));
      });
    });

    await Promise.all(perGroup);
    await Promise.all(notificationList);
  } catch (error) {
    console.error('weekly-agenda cron error:', error);
  } finally {
    exitProcess();
  }
});

setTimeout(() => exitProcess(), 59 * 1000);
