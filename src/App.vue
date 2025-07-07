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

  /* Modern Box Shadow Utilities */
  .modern-shadow-sm {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
  }

  .modern-shadow {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  }

  .modern-shadow-md {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  }

  .modern-shadow-lg {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  }

  .modern-shadow-xl {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  }

  .modern-shadow-2xl {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  }

  .modern-shadow-inner {
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06) !important;
  }

  /* Enhanced card shadows with subtle depth */
  .v-card.modern-card {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    transition: box-shadow 0.3s ease-in-out;
  }

  .v-card.modern-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  }

  .v-card.modern-card-elevated {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
    transition: box-shadow 0.3s ease-in-out;
  }

  .v-card.modern-card-elevated:hover {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  }

  /* Special handling for dialog cards */
  .v-dialog .v-card.modern-card-elevated {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  }

  /* Interactive cards with enhanced feedback */
  .v-card.modern-card.interactive {
    cursor: pointer;
    transform: translateY(0);
    transition: box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out;
  }

  .v-card.modern-card.interactive:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  }

  .v-card.modern-card.interactive:active {
    transform: translateY(0);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  }

  /* Floating cards for special UI elements */
  .v-card.modern-card-floating {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    transition: box-shadow 0.3s ease-in-out;
  }

  .v-card.modern-card-floating:hover {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important;
  }

  /* Override Vuetify elevation classes with modern shadows */
  .elevation-0 {
    box-shadow: none !important;
  }

  .elevation-1 {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
  }

  .elevation-2 {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  }

  .elevation-3 {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  }

  .elevation-4 {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  }

  .elevation-5 {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  }

  /* Ensure modern shadows work well with border radius */
  .v-card.modern-card,
  .v-card.modern-card-elevated,
  .v-card.modern-card-floating {
    border-radius: 16px !important;
  }

  /* Subtle shadow for flat cards that still need some depth */
  .v-card[flat].modern-shadow-sm {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
  }

  /* Remove conflicting shadows from specific utility classes */
  .no-shadow {
    box-shadow: none !important;
  }

  /* Single button in toggle group should have full rounded corners */
  .v-btn-toggle .v-btn:only-child {
    border-radius: 16px !important;
  }
</style>
