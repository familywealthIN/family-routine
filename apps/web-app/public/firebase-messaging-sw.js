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
  apiKey: "AIzaSyBkpoFkuAAT2eJVWX_rE9pLVww1ncBSUt8",
  authDomain: "groutine-21c1b.firebaseapp.com",
  databaseURL: "https://groutine-21c1b.firebaseio.com",
  projectId: "groutine-21c1b",
  storageBucket: "groutine-21c1b.firebasestorage.app",
  messagingSenderId: "350952942983",
  appId: "1:350952942983:web:b935acc08daebd64977722",
  measurementId: "G-FNR8VD551J"
});

const messaging = firebase.messaging();

// Pushes with a `notification` block are shown by the Firebase SDK itself and
// open `webpush.fcmOptions.link` (set by apps/cron/src/utils/push.js). Only a
// data-only message is shown here — showing both displayed every push twice.
messaging.onBackgroundMessage(function (payload) {
  if (payload.notification) return;
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'Routine Notes', {
    body: data.body || '',
    icon: '/img/icons/android-chrome-512x512.png',
    data,
  });
});

// Data-only notifications shown above: open the app at their route, reusing
// an open tab if there is one.
self.addEventListener('notificationclick', function (event) {
  const data = (event.notification && event.notification.data) || {};
  // SDK-shown notifications (FCM_MSG) are opened by the SDK's own handler.
  if (data.FCM_MSG) return;
  event.notification.close();
  const route = data.route || '/home';
  const url = new URL(route, self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    const open = list.find(function (c) { return c.url.indexOf(self.location.origin) === 0; });
    if (open) return open.navigate(url).then(function (c) { return (c || open).focus(); });
    return clients.openWindow(url);
  }));
});
