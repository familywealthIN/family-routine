/* eslint-disable quote-props */
require('dotenv').config();

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});


function sendNotification(token, name, description) {
  const payload = {
    notification: {
      title: name,
      body: description,
      icon: '/img/512.png',
      click_action: 'http://localhost:8080',
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


sendNotification(
  '',
  'Hello',
  'Hello World',
);
