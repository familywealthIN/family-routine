<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="isLoading || isAuthenticatedSignIn">
    <h2 class="text-xs-center pt-5">Build Your Routine</h2>
    <div class="banner-box">
      <img src="/img/login-banner.png" alt="Login Banner">
    </div>
    <h2 class="text-xs-center pt-3">Set Progressive Goals</h2>
    <p class="text-xs-center pt-2 pl-3 pr-3 text-muted">Build a harmony between your routine and goals to live a
      prosperous healthy life.</p>
    <div class="login-box">
      <a href="javascript:void(0)" class="google-button" alt="Login with Google" @click="handleClickSignIn"
        v-if="!isSignIn" :disabled="!isInit">
        <div class="g-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" width="40px" height="20"
            style="display:inline-flex; align-items:center;">
            <path
              d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
              fill="#4285f4" />
            <path
              d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
              fill="#34a853" />
            <path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
              fill="#fbbc04" />
            <path
              d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
              fill="#ea4335" />
          </svg>
        </div>
        <div class="g-text">
          Sign in with Google
        </div>
      </a>
    </div>
    <footer>
      <div class="text-xs-center text-muted">
        <small>
          By using
          Family Routine,
          you accept our
          <a href="https://familywealth.in/terms">Terms</a>
          and
          <a href="https://familywealth.in/privacy-policy">Privacy Policy</a>.
        </small>
      </div>
    </footer>
  </container-box>

</template>

<script>

import gql from 'graphql-tag';
import { saveData, clearData, getSessionItem, isRunningStandalone } from '../token';

import {
  GC_USER_NAME,
  GC_PICTURE,
  GC_USER_EMAIL,
  GC_NOTIFICATION_TOKEN,
  USER_TAGS,
  GC_AUTH_TOKEN,
} from '../constants/settings';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  name: 'Login',
  components: {
    ContainerBox,
    Stats,
  },
  data() {
    return {
      isInit: false,
      isSignIn: false,
      isAuthenticatedSignIn: false,
      isLoading: true,
      redirectCount: 0,
    };
  },

  methods: {
    handleClickSignIn() {
      this.isLoading = true;
      this.$gAuth
        .signIn()
        .then((user) => {
          // On success do something, refer to https://developers.google.com/api-client-library/javascript/reference/referencedocs#googleusergetid
          const accessToken = user.getAuthResponse().access_token;
          const notificationId = getSessionItem(GC_NOTIFICATION_TOKEN) || '';
          this.createSession(accessToken, notificationId);
        })
        .catch((error) => {
          console.log(error);
          this.isLoading = false;
          window.location.reload();
        });
    },

    handleClickSignOut() {
      this.$gAuth
        .signOut()
        .then(async () => {
          this.isSignIn = this.$gAuth.isAuthorized;
          this.isAuthenticatedSignIn = false;
          await clearData();
          localStorage.removeItem(USER_TAGS);
          this.$root.$data.userName = getSessionItem(GC_USER_NAME);
          this.$root.$data.userEmail = getSessionItem(GC_USER_EMAIL);
          this.$root.$data.picture = getSessionItem(GC_PICTURE);
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
          window.location.reload();
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
              tags
            }
          }
        `,
        variables: {
          accessToken,
          notificationId,
        },
        update: async (store, { data: { authGoogle } }) => {
          const {
            name, email, picture, token, isNew, tags = []
          } = authGoogle;

          this.isSignIn = this.$gAuth.isAuthorized;
          this.isAuthenticatedSignIn = this.$gAuth.isAuthorized;
          const userData = { token, email, name, picture };
          await saveData(userData);
          localStorage.setItem(USER_TAGS, JSON.stringify(tags));
          this.$root.$data.name = getSessionItem(GC_USER_NAME);
          this.$root.$data.email = getSessionItem(GC_USER_EMAIL);
          this.$root.$data.picture = getSessionItem(GC_PICTURE);

          if (isNew) {
            this.$router.push('wizard');
          } else {
            this.$router.push('home');
          }

          setTimeout(() => { this.isLoading = false; }, 500);
        },
      }).catch(() => {
          this.isLoading = false;
          this.$notify({
            title: 'Login',
            text: 'Unable to Login',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
  },
  mounted() {
    const checkGauthLoad = setInterval(() => {
      const token = getSessionItem(GC_AUTH_TOKEN);
      this.isInit = this.$gAuth.isInit;
      this.isSignIn = this.$gAuth.isAuthorized && !window.appSignedOut;
      this.isStandalone = isRunningStandalone() && token;
      this.isAuthenticatedSignIn = this.isSignIn || this.isStandalone;
      if (this.isAuthenticatedSignIn) {
        this.$router.push('home');
        this.isLoading = false;
        // eslint-disable-next-line no-plusplus
        this.redirectCount++;
        if (this.redirectCount > 2) {
          window.dispatchEvent(new Event('sign-out'));
          clearInterval(checkGauthLoad);
        }
      }
      if (this.isInit) {
        this.isLoading = false;
        clearInterval(checkGauthLoad);
      }
    }, 10);
    // window.addEventListener('sign-out', () => this.handleClickSignOut(), false);
  },
};
</script>

<style>
.google-button {
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  background-color: #4285F4;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  color: white;
  text-decoration: none;
  padding-right: 16px;
  border-radius: 2px;
  cursor: pointer;
}

.google-button .g-box {
  background-color: white;
  margin: 2px;
  padding-top: 12px;
  min-height: 42px;
  border-radius: 2px;
}

.google-button .g-text {
  margin-left: 12px;
}

.login {
  background-color: #fff;
}

.login-box {
  text-align: center;
  width: 100%;
  padding: 70px 16px 70px;
  margin: 0 auto;
}

@media (max-width: 359px) {
  .login-box {
    padding-top: 30px;
  }
}

.banner-box {
  padding: 10px 20px 0;
  text-align: center;
}

.banner-box img {
  max-width: 100%;
  width: auto;
}

.text-muted,
.text-muted a {
  color: rgba(0, 0, 0, .54);
}

.text-muted a {
  font-weight: bold;
  text-decoration: none;
}

.login .v-card {
  box-shadow: none;
}

.login,
.login .layout,
.login .v-card {
  height: 100%;
}

.login footer {
  position: absolute;
  bottom: 8px;
  margin: 0 auto;
  display: block;
  width: 100%;
}
</style>
