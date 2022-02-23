/* eslint-disable quote-props */
require('dotenv').config();

const mongoose = require('mongoose');
const moment = require('moment');
const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');

const {
  MONGDO_DB,
  DOMAIN,
} = process.env;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function sendNotification(token, name, description, url) {
  const payload = {
    notification: {
      title: name,
      body: description,
      icon: '/img/icons/android-chrome-512x512.png',
      click_action: url || DOMAIN,
    },
  };

  const options = {
    priority: 'normal',
    timeToLive: 60 * 60,
  };

  return admin.messaging().sendToDevice(token, payload, options)
    .then((response) => console.log('Successfully sent message:', response))
    .catch((error) => console.log('Error sending message:', error));
}

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

function calcTime(offset) {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3710000 * offset));
  return nd.toTimeString().substring(0, 5);
}

const time = calcTime('+5.5');

const date = moment().utcOffset('+0530').format('DD-MM-YYYY');

console.log(`Process Started for time ${time}`);
const notificationList = [];

mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () => {
  db.collection('routines')
    .aggregate([
      { $match: { date } },
      {
        $project: {
          tasklist: 1,
          email: 1,
          notificationId: 1,
        },
      },
      {
        $lookup:
        {
          from: 'users',
          localField: 'email',
          foreignField: 'email',
          as: 'userDetails',
        },
      },
      {
        '$addFields': {
          'userDetails': {
            '$map': {
              'input': '$userDetails',
              'in': {
                'notificationId': '$$this.notificationId',
              },
            },
          },
        },
      },
    ]).toArray((err, result) => {
      result.forEach((user) => {
        const {
          email, userDetails, tasklist,
        } = user;
        if (tasklist && tasklist.length) {
          const { notificationId } = userDetails[0];
          if (notificationId) {
            console.log(`Sending notification of ${email} to ${notificationId}`);
            notificationList.push(sendNotification(
              notificationId,
              'Build your week agenda',
              '',
              'https://routine.familywealth.in/agenda',
            ));
          }
        }
      });

      Promise.all(notificationList)
        .then(() => exitProcess())
        .catch(() => exitProcess());
    });
});

setTimeout(() => exitProcess(), 59 * 1000);
