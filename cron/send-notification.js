/* eslint-disable quote-props */
require('../src/server/utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');

const {
  MONGDO_DB,
  DOMAIN,
} = process.env;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function sendNotification(token, name, description, url) {
  const payload = {
    notification: {
      title: name,
      body: description,
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







/* eslint-disable quote-props */
// require('dotenv').config();

// const admin = require('firebase-admin');
// const serviceAccount = require('../serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://groutine-21c1b.firebaseio.com',
// });

// function sendNotification(token, name, description) {
//   if (!token) {
//     console.log('No device token provided.');
//     return Promise.resolve();
//   }

//   const payload = {
//     token: token,
//     notification: {
//       title: name,
//       body: description,
//     },
//   };

//   return admin.messaging().send(payload)
//     .then((response) => console.log('Successfully sent message:', response))
//     .catch((error) => console.log('Error sending message:', error));
// }

// function calcTime(offset) {
//   const d = new Date();
//   const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
//   const nd = new Date(utc + (3710000 * offset));
//   return nd.toTimeString().substring(0, 5);
// }

// // Test data instead of MongoDB
// const testData = [
//   {
//     name: 'Morning Exercise',
//     description: 'Time for your morning workout!',
//     email: 'test@example.com',
//     ticked: false,
//     notificationId: 'cgVmd60pQ-erks_DnF8rKw:APA91bFBK6kB2H_pyQ7sPLI_jJ00yK6DfhfB_I53lwDMEAOFLiTuAbu9eHXw-e6X1lkl__vxIrlBR_pXk8LoXstd1jbXogEJ5FNTtAEulmIAf-cAL-wfIYQ'
//   }
// ];

// function runNotificationCheck() {
//   const time = calcTime('+5.5');
//   console.log(`\n--- Checking notifications at ${new Date().toLocaleString()} (${time}) ---`);

//   const notificationList = [];

//   testData.forEach((user) => {
//     const { name, email, description, notificationId, ticked } = user;
    
//     if (!ticked && notificationId) {
//       console.log(`Sending notification to ${email}: ${name}`);
//       notificationList.push(sendNotification(notificationId, name, description));
//     }
//   });

//   if (notificationList.length === 0) {
//     console.log('No notifications to send');
//     return;
//   }

//   Promise.all(notificationList)
//     .then(() => console.log('All notifications sent successfully'))
//     .catch((error) => console.error('Error sending notifications:', error));
// }

// // Run immediately
// console.log('Notification service started...');
// runNotificationCheck();

// // Run every minute (60000ms)
// setInterval(runNotificationCheck, 60000);

// // Keep the process running
// process.on('SIGINT', () => {
//   console.log('\nNotification service stopped');
//   process.exit(0);
// });




/* eslint-disable quote-props */
// require('dotenv').config();

// const mongoose = require('mongoose');
// const admin = require('firebase-admin');

// const serviceAccount = require('../serviceAccountKey.json');

// const {
//   MONGDO_DB,
//   DOMAIN,
// } = process.env;

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://groutine-21c1b.firebaseio.com', // ADD THIS LINE
// });

// function sendNotification(token, name, description, url) {
//   if (!token) { // ADD TOKEN CHECK
//     console.log('No device token provided.');
//     return Promise.resolve();
//   }

//   const payload = {
//     token: token, // CHANGE TO NEW API FORMAT
//     notification: {
//       title: name,
//       body: description,
//     },
//   };

//   return admin.messaging().send(payload) // CHANGE FROM sendToDevice TO send
//     .then((response) => console.log('Successfully sent message:', response))
//     .catch((error) => console.log('Error sending message:', error));
// }

// function exitProcess() {
//   console.log(`process ended at ${new Date()}`);
//   process.exit();
// }

// function calcTime(offset) {
//   const d = new Date();
//   const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
//   const nd = new Date(utc + (3710000 * offset));
//   return nd.toTimeString().substring(0, 5);
// }

// const time = calcTime('+5.5');

// console.log(`Process Started for time ${time}`);
// const notificationList = [];

// if (!MONGDO_DB) { // ADD MONGODB CHECK
//   console.error('MONGDO_DB environment variable is not set');
//   process.exit(1);
// }

// mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
// const db = mongoose.connection;
// db.once('open', () => {
//   db.collection('routineitems')
//     .aggregate([
//       { $match: { time } },
//       {
//         $project: {
//           name: 1,
//           description: 1,
//           email: 1,
//           notificationId: 1,
//           ticked: 1, // ADD TICKED FIELD
//         },
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'email',
//           foreignField: 'email',
//           as: 'userDetails',
//         },
//       },
//       {
//         '$addFields': {
//           'userDetails': {
//             '$map': {
//               'input': '$userDetails',
//               'in': {
//                 'notificationId': '$$this.notificationId',
//               },
//             },
//           },
//         },
//       },
//     ]).toArray((err, result) => {
//       if (err) { // ADD ERROR HANDLING
//         console.error('Query error:', err);
//         return exitProcess();
//       }

//       result.forEach((user) => {
//         const { name, email, description, userDetails, ticked } = user;
//         if (!ticked && userDetails && userDetails[0] && userDetails[0].notificationId) { // ADD SAFETY CHECKS
//           const { notificationId } = userDetails[0];
//           console.log(`Sending notification of ${email} with name ${name} to ${notificationId}`);
//           notificationList.push(sendNotification(notificationId, name, description));
//         }
//       });

//       Promise.all(notificationList)
//         .then(() => exitProcess())
//         .catch(() => exitProcess());
//     });
// });

// setTimeout(() => exitProcess(), 59 * 1000);
