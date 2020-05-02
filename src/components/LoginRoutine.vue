
<template>
  <div class="login-box">
    <img
      src="/img/google-button.png"
      class="google-button"
      @click="handleClickSignIn"
      v-if="!isSignIn"
      :disabled="!isInit"
    />
    <v-btn @click="handleClickSignOut" v-if="isSignIn" :disabled="!isInit">signOut</v-btn>
  </div>
</template>

<script>
/* eslint-disable no-console */
/**
 * You should first need to place these 2 lines of code in your APP ENTRY file, e.g. src/main.js
 *
 * import GAuth from 'vue-google-oauth2'
 * Vue.use(GAuth, {clientId: '4584XXXXXXXX-2gqknkvdjfkdfkvb8uja2k65sldsms7qo9.apps.googleusercontent.com'})
 *
 */
import gql from "graphql-tag";

import {
  GC_USER_NAME,
  GC_PICTURE,
  GC_USER_EMAIL,
  GC_AUTH_TOKEN,
  GC_NOTIFICATION_TOKEN
} from "../constants/settings";

export default {
  name: "Login",
  data() {
    return {
      isInit: false,
      isSignIn: false
    };
  },

  methods: {
    handleClickSignIn() {
      this.$gAuth
        .signIn()
        .then(user => {
          // On success do something, refer to https://developers.google.com/api-client-library/javascript/reference/referencedocs#googleusergetid
          const accessToken = user.getAuthResponse().access_token;
          const notificationId = localStorage.getItem(GC_NOTIFICATION_TOKEN) || '';
          this.createSession(accessToken, notificationId);
        })
        .catch(error => {
          // On fail do something
          console.log(error);
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
        .catch(error => {
          console.log(error);
          // On fail do something
        });
    },

    createSession(accessToken, notificationId = '') {
      this.$apollo.mutate({
        mutation: gql`
          mutation authGoogle($accessToken: String!, $notificationId: String!) {
            authGoogle(accessToken: $accessToken, notificationId: $notificationId) {
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
          const { name, email, picture, token, isNew } = authGoogle;

          this.isSignIn = this.$gAuth.isAuthorized;
          localStorage.setItem(GC_USER_NAME, name);
          localStorage.setItem(GC_USER_EMAIL, email);
          localStorage.setItem(GC_PICTURE, picture);
          localStorage.setItem(GC_AUTH_TOKEN, token);
          this.$root.$data.name = localStorage.getItem(GC_USER_NAME);
          this.$root.$data.email = localStorage.getItem(GC_USER_EMAIL);
          this.$root.$data.picture = localStorage.getItem(GC_PICTURE);
          isNew ? this.$router.push("wizard") : this.$router.push("home");
        }
      });
    }
  },
  mounted() {
    let that = this;
    let checkGauthLoad = setInterval(function() {
      that.isInit = that.$gAuth.isInit;
      that.isSignIn = that.$gAuth.isAuthorized;
      if(that.isSignIn){ that.$router.push("home"); }
      if (that.isInit) clearInterval(checkGauthLoad);
    }, 50);
  }
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