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

  const payload = {
    token: 'fa35f7YxQ7KLdebfPxzlUx:APA91bHnFnjLQ4fPr6sMz8_VnkbHCowDg6mjcl0Qkws9Xa6Eq-qIU6aG3t7J0FV2dFDm672UcoPmAb535ZUz9xEc8kAmzQUkyf2ZUrWcDOWFcO0GROnJ50o',
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