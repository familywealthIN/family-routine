// /* eslint-disable quote-props */
// require('dotenv').config();

// const admin = require('firebase-admin');

// const serviceAccount = require('./serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://groutine-21c1b.firebaseio.com',
// });

// function sendNotification(token, name, description) {
//   const payload = {
//     notification: {
//       title: name,
//       body: description,
//       icon: '/img/512.png',
//       click_action: 'http://localhost:8080',
//     },
//   };

//   const options = {
//     priority: 'normal',
//     timeToLive: 60 * 60,
//   };

//   return admin.messaging().sendToDevice(token, payload, options)
//     .then((response) => console.log('Successfully sent message:', response))
//     .catch((error) => console.log('Error sending message:', error));
// }

// sendNotification(
//   '',
//   'Hello',
//   'Hello World',
// );



require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function sendNotification(token, name, description) {
  if (!token) {
    console.log('No device token provided.');
    return;
  }

  console.log('Sending notification to token:', token);

  const payload = {
    token: "cgVmd60pQ-erks_DnF8rKw:APA91bFBK6kB2H_pyQ7sPLI_jJ00yK6DfhfB_I53lwDMEAOFLiTuAbu9eHXw-e6X1lkl__vxIrlBR_pXk8LoXstd1jbXogEJ5FNTtAEulmIAf-cAL-wfIYQ",
     notification: {
      title: name,
      body: description,
     // icon: 'https://yourdomain.com/img/512.png', // Must be HTTPS
     // click_action: 'https://yourdomain.com', // Must match your frontend app
    },
    // options: {
    //   priority: 'high',
    //   timeToLive: 60 * 60, // 1 hour
    // }
  };

  const options = {
    priority: 'high',
    timeToLive: 60 * 60, // 1 hour
  };

  return admin.messaging().send(payload)
    .then((response) => console.log('Notification sent:', response))
    .catch((error) => console.error('Error sending notification:', error));
}

// Replace this with an actual device token
sendNotification(
  'YOUR_DEVICE_FCM_TOKEN',
  'Hello',
  'Hello World',
);