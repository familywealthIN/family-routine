// /* eslint-disable no-undef */
// // [START initialize_firebase_in_sw]
// // Give the service worker access to Firebase Messaging.
// // Note that you can only use Firebase Messaging here, other Firebase libraries
// // are not available in the service worker.
// importScripts('https://www.gstatic.com/firebasejs/5.5.6/firebase-app.js');
// importScripts('https://www.gstatic.com/firebasejs/5.5.6/firebase-messaging.js');
// // Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// firebase.initializeApp({
//   messagingSenderId: '350952942983', // 4. Get Firebase Configuration
// });

// // Retrieve an instance of Firebase Messaging so that it can handle background messages.
// const messaging = firebase.messaging();
// console.log(messaging);
// // [END initialize_firebase_in_sw]




// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
messaging.onMessage((payload) => {
  console.log('Message received. ', payload);
  // ...
});

// Foreground messages
messaging.onMessage((payload) => {
  console.log('Message received in foreground:', payload);
  this.$notify({
    group: 'notify',
    title: payload.notification.title,
    text: payload.notification.body,
  });
});
