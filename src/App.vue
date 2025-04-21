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
  },
};
</script>

<style>
  .v-toolbar--fixed {
    z-index: 5;
  }
</style>
