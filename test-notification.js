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
  'ya29.a0AX9GBdVq-9vM1MlxbKPFC-_WJmiV0Y4w5sgySqEa7npwWj4KHjiiEvBI-QZQmlGWbvOIt6y0jmoya6a9b5P55SjYUvWVHoEBZQyc-kHipEMKfkFbKFpPL5TQE58xjKQ7ALfUMgqYFJ9MrCJX1Wlp3dV8OoBglcsaCgYKASMSARESFQHUCsbCpuaYN1oBovJkdU6KH4P-6g0166',
  'Hello',
  'Hello World',
);
