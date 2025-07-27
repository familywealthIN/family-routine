<template>
  <v-app>
    <template v-if="isMobile">
      <mobile-layout />
    </template>
    <template v-else>
      <desktop-layout />
    </template>
    <notifications group="notify" position="bottom center" />
    <!-- <v-footer app></v-footer> -->
  </v-app>
</template>

<script>
import firebase from 'firebase/app';
import {
  config, publicKey, isDevelopment, netlify,
} from './blob/config';
import {
  GC_NOTIFICATION_TOKEN,
} from './constants/settings';
import MobileLayout from './layouts/MobileLayout.vue';
import DesktopLayout from './layouts/DesktopLayout.vue';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
export default {
  components: {
    MobileLayout,
    DesktopLayout,
  },
  data() {
    return {
      drawer: null,
      mottoDialog: false,
    };
  },
  computed: {
    name() {
      return this.$root.$data.name;
    },
    email() {
      return this.$root.$data.email;
    },
    picture() {
      return this.$root.$data.picture;
    },
    pageTitle() {
      return (this.$route.name && this.$route.name[0].toUpperCase() + this.$route.name.substr(1))
        || 'Routine Notes';
    },
    isMobile() {
      return this.$vuetify.breakpoint.name === 'xs';
    },
  },
  created() {
    if (Capacitor.isNativePlatform()) {
      // Native logic using Capacitor Push Notifications
      this.initNativeFCM();
    } else {
      // PWA logic
      this.initPwaFCM();
    }



  },
  methods: {
    initPwaFCM() {
      if (isDevelopment || netlify) {
        firebase.initializeApp(config);

        const messaging = firebase.messaging();
        messaging.usePublicVapidKey(publicKey);
        console.log('testttttttttttt')

        // Request Permission of Notifications
        messaging.requestPermission().then(() => {
          console.log('testttttttttttt111')
          console.log('Notification permission granted.');

          // Get Token
          messaging.getToken().then((token) => {
            console.log('token', token);
            localStorage.setItem(GC_NOTIFICATION_TOKEN, token);
          });
        }).catch((err) => {
          console.log('Unable to get permission to notify.', err);
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
      }
    },

    async initNativeFCM() {
      // Request Local Notifications permission first
      const localPerm = await LocalNotifications.requestPermissions();
      if (localPerm.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return;
      }

      PushNotifications.requestPermissions().then(result => {
      console.log('pust notification result', result)
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('registration', token => {
        console.log('Device registered', token.value);
        localStorage.setItem('fcm_token', token.value);
      });

      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('Push received: ', notification);
        // show toast or alert here
        await LocalNotifications.schedule({
          notifications: [
            {
              title: notification.title || 'Notification',
              body: notification.body || '',
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: null,
              attachments: null,
              actionTypeId: '',
              extra: notification.data,
              importance: 5, // 'high' = 5
             
            },
          ],
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('Push action performed', notification);
        // handle navigation if needed
      });
    }
  },
};
</script>

<style>
.v-toolbar--fixed {
  z-index: 5;
}
  .v-toolbar--fixed {
    z-index: 5;
  }
</style>
