import Vue from 'vue'
import './plugins/vuetify'
import App from './App.vue'
import router from './router'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')

import firebase from 'firebase/app';
import 'firebase/messaging';
import {
  config,
  publicKey
} from './blob/config'

firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.usePublicVapidKey(publicKey);

// Request Permission of Notifications
messaging.requestPermission().then(() => {
  console.log('Notification permission granted.');

  // Get Token
  messaging.getToken().then((token) => {
    console.log(token);
  })
}).catch((err) => {
  console.log('Unable to get permission to notify.', err);
});