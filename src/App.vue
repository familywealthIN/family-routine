<template>
  <v-app>
    <template v-if="isMobile">
      <mobile-layout />
    </template>
    <template v-else>
      <desktop-layout />
    </template>
    <notifications group="notify" position="bottom center" />
    <pwa-install-prompt ref="pwaInstall" />
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
import PWAInstallPrompt from './components/PWAInstallPrompt.vue';
import { installPWADirect, debugPWAStatus, resetInstallState } from './utils/pwaInstaller';

export default {
  components: {
    MobileLayout,
    DesktopLayout,
    PWAInstallPrompt,
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
    if (!isDevelopment || netlify) {
      firebase.initializeApp(config);

      const messaging = firebase.messaging();

      messaging.usePublicVapidKey(publicKey);

      // Request Permission of Notifications
      messaging.requestPermission().then(() => {
        console.log('Notification permission granted.');

        // Get Token
        messaging.getToken().then((token) => {
          localStorage.setItem(GC_NOTIFICATION_TOKEN, token);
        });
      }).catch((err) => {
        console.log('Unable to get permission to notify.', err);
      });
    }

    // Listen for PWA install trigger from child components
    this.$root.$on('triggerPWAInstall', this.triggerPWAInstall);

    // Make debug function available globally for development
    if (process.env.NODE_ENV === 'development') {
      window.debugPWAStatus = debugPWAStatus;
      window.resetPWAInstallState = resetInstallState;
      console.log('PWA Debug: debugPWAStatus() and resetPWAInstallState() functions available in console');
    }
  },

  beforeDestroy() {
    // Clean up event listener
    this.$root.$off('triggerPWAInstall', this.triggerPWAInstall);
  },

  methods: {
    // Method to trigger PWA install prompt manually
    async triggerPWAInstall() {
      console.log('triggerPWAInstall called');

      try {
        // First try the component method
        await this.$nextTick();

        if (this.$refs.pwaInstall && typeof this.$refs.pwaInstall.triggerInstallPrompt === 'function') {
          console.log('Using PWA component method');
          this.$refs.pwaInstall.triggerInstallPrompt();
          return;
        }

        // Fallback to direct installation
        console.log('Using direct installation method');
        const result = await installPWADirect();

        if (result.success) {
          console.log('Direct installation successful:', result.message);
          if (result.action !== 'ios_instructions') {
            this.$notify({
              group: 'notify',
              type: 'success',
              title: 'Installation Started',
              text: result.message,
            });
          }
        } else {
          console.log('Direct installation failed:', result.message);
          this.$notify({
            group: 'notify',
            type: 'info',
            title: 'Installation Info',
            text: result.message,
          });
        }
      } catch (error) {
        console.error('Error in triggerPWAInstall:', error);
        this.$notify({
          group: 'notify',
          type: 'error',
          title: 'Installation Error',
          text: 'Failed to trigger app installation',
        });
      }
    },
  },
};
</script>

<style>
  .v-toolbar--fixed {
    z-index: 5;
  }
</style>
