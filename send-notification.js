/* eslint-disable quote-props */
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

const {
  MONGDO_DB,
  DOMAIN,
} = process.env;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function sendNotification(token, name, description) {
  const payload = {
    notification: {
      title: name,
      body: description,
      click_action: DOMAIN,
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
  // create Date object for current location
  const d = new Date();

  // convert to msec
  // subtract local time zone offset
  // get UTC time in msec
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);

  // create new Date object for different city
  // using supplied offset
  const nd = new Date(utc + (3710000 * offset));

  // return time as a string
  return nd.toTimeString().substring(0, 5);
}

const time = calcTime('+5.5');
console.log(`Process Started for time ${time}`);
const notificationList = [];

mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () => {
  db.collection('routineitems')
    .aggregate([
      { $match: { time } },
      {
        $project: {
          name: 1,
          description: 1,
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
          name, email, description, userDetails, ticked,
        } = user;
        if (!ticked) {
          const { notificationId } = userDetails[0];
          console.log(`Sending notification of ${email} with name ${name} to ${notificationId}`);
          notificationList.push(sendNotification(notificationId, name, description));
        }
      });

      Promise.all(notificationList)
        .then(() => exitProcess())
        .catch(() => exitProcess());
    });
});

setTimeout(() => exitProcess(), 59 * 1000);
