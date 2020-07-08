<template>
  <div class="login-box">
    <div v-if="isLoading">
      <v-progress-circular :size="50" indeterminate color="primary"></v-progress-circular>
    </div>
    <div v-else>
        <img
          src="/img/google-button.png"
          class="google-button"
          alt="Login with Google"
          @click="handleClickSignIn"
          v-if="!isSignIn"
          :disabled="!isInit"
        />
        <v-btn @click="handleClickSignOut" v-if="isSignIn" :disabled="!isInit">signOut</v-btn>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
/**
 * You should first need to place these 2 lines of code in your APP ENTRY file, e.g. src/main.js
 *
 * import GAuth from 'vue-google-oauth2'
 * Vue.use(GAuth, {clientId: '...'})
 *
 */
import gql from 'graphql-tag';

import {
  GC_USER_NAME,
  GC_PICTURE,
  GC_USER_EMAIL,
  GC_AUTH_TOKEN,
  GC_NOTIFICATION_TOKEN,
} from '../constants/settings';

export default {
  name: 'Login',
  data() {
    return {
      isInit: false,
      isSignIn: false,
      isLoading: true,
    };
  },

  methods: {
    handleClickSignIn() {
      this.$gAuth
        .signIn()
        .then((user) => {
          // On success do something, refer to https://developers.google.com/api-client-library/javascript/reference/referencedocs#googleusergetid
          const accessToken = user.getAuthResponse().access_token;
          const notificationId = localStorage.getItem(GC_NOTIFICATION_TOKEN) || '';
          this.createSession(accessToken, notificationId);
        })
        .catch((error) => {
          // On fail do something
          console.log(error);
          this.isLoading = false;
        });
    },

    handleClickSignOut() {
      this.$gAuth
        .signOut()
        .then(() => {
          // On success do something
          this.isSignIn = this.$gAuth.isAuthorized;
          localStorage.removeItem(GC_USER_EMAIL);
          localStorage.removeItem(GC_USER_NAME);
          localStorage.removeItem(GC_PICTURE);
          localStorage.removeItem(GC_AUTH_TOKEN);
          localStorage.removeItem(GC_NOTIFICATION_TOKEN);
          this.$root.$data.userName = localStorage.getItem(GC_USER_NAME);
          this.$root.$data.userEmail = localStorage.getItem(GC_USER_EMAIL);
          this.$root.$data.picture = localStorage.getItem(GC_PICTURE);
        })
        .catch((error) => {
          console.log(error);
          this.$notify({
            title: 'Logout',
            text: 'Unable to Logout',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },

    createSession(accessToken, notificationId = '') {
      this.$apollo.mutate({
        mutation: gql`
          mutation authGoogle($accessToken: String!, $notificationId: String!) {
            authGoogle(
              accessToken: $accessToken
              notificationId: $notificationId
            ) {
              name
              email
              picture
              isNew
              token
            }
          }
        `,
        variables: {
          accessToken,
          notificationId,
        },
        update: (store, { data: { authGoogle } }) => {
          const {
            name, email, picture, token, isNew,
          } = authGoogle;

          this.isSignIn = this.$gAuth.isAuthorized;
          localStorage.setItem(GC_USER_NAME, name);
          localStorage.setItem(GC_USER_EMAIL, email);
          localStorage.setItem(GC_PICTURE, picture);
          localStorage.setItem(GC_AUTH_TOKEN, token);
          this.$root.$data.name = localStorage.getItem(GC_USER_NAME);
          this.$root.$data.email = localStorage.getItem(GC_USER_EMAIL);
          this.$root.$data.picture = localStorage.getItem(GC_PICTURE);

          if (isNew) {
            this.$router.push('wizard');
          } else {
            this.$router.push('home');
          }

          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.$notify({
            title: 'Login',
            text: 'Unable to Login',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        },
      });
    },
  },
  mounted() {
    const checkGauthLoad = setInterval(() => {
      this.isInit = this.$gAuth.isInit;
      this.isSignIn = this.$gAuth.isAuthorized;
      if (this.isSignIn) {
        this.$router.push('home');
        this.isLoading = false;
      }
      if (this.isInit) {
        this.isLoading = false;
        clearInterval(checkGauthLoad);
      }
    }, 50);
  },
};
</script>

<style>
.google-button {
  cursor: pointer;
}
.login-box {
  text-align: center;
  width: 360px;
  padding: 200px 15px 0;
  margin: 0 auto;
}
</style>
