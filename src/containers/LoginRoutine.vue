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
          Routine Notes,
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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

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
  },
  data() {
    return {
      isInit: false,
      isSignIn: false,
      isAuthenticatedSignIn: false,
      isLoading: true,
      redirectCount: 0,
      isNative: false,
    };
  },

  methods: {
    async handleClickSignIn() {
      this.isLoading = true;

      if (this.isNative) {
        console.log('native function called')
        // Native Google login
        try {
          // Re-initialize GoogleAuth to ensure it's properly configured
          await GoogleAuth.initialize({
            //clientId: '350952942983-eu6bevc5ve0pjkfqarolulruhbokat05.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
            androidClientId: '350952942983-eu6bevc5ve0pjkfqarolulruhbokat05.apps.googleusercontent.com',
            iosClientId: '350952942983-48lis9mbeudskd9rovrnov5gm35h0vre.apps.googleusercontent.com',
            webClientId: '350952942983-eu6bevc5ve0pjkfqarolulruhbokat05.apps.googleusercontent.com',
            forceCodeForRefreshToken: true
          });
          
          console.log('Attempting to sign in with GoogleAuth');
          const result = await GoogleAuth.signIn();
          console.log('GoogleAuth sign in result:', result);
          
          if (!result || !result.authentication) {
            throw new Error('Authentication data missing from sign in result');
          }
          
          const accessToken = result.authentication.accessToken;
          const notificationId = getSessionItem(GC_NOTIFICATION_TOKEN) || '';
          console.log('Access Token:', accessToken);
          //console.log('Notification ID:', notificationId);
          this.createSession(accessToken, notificationId);
        } catch (err) {
          console.error('Native Google login failed:', err);
          this.$notify({
            title: 'Login Error',
            text: 'Google sign in failed. Please try again.',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
          this.isLoading = false;
        }
      } else {
        console.log('web function called')
      this.$gAuth
        .signIn()
        .then((user) => {
          // On success do something, refer to https://developers.google.com/api-client-library/javascript/reference/referencedocs#googleusergetid
          const accessToken = user.getAuthResponse().access_token;
          const notificationId = getSessionItem(GC_NOTIFICATION_TOKEN) || '';
          console.log('Access Token:', accessToken);  
          console.log('Notification ID:', notificationId);

          this.createSession(accessToken, notificationId);
        })
        .catch((error) => {
          console.log(error);
          this.isLoading = false;
          window.location.reload();
        });
      }
    },


    handleClickSignOut() {
      if (this.isNative) {
        GoogleAuth.signOut().then(async () => {
          this.isSignIn = false;
          this.isAuthenticatedSignIn = false;
          await clearData();
          localStorage.removeItem(USER_TAGS);
          this.$root.$data.userName = '';
          this.$root.$data.userEmail = '';
          this.$root.$data.picture = '';
        }).catch((error) => {
          console.log(error);
        });
      } else {
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
      }
    },

    createSession(accessToken, notificationId = '') {
      console.log('Creating session with access token:', {accessToken, notificationId});
      if(!this.$apollo){
        this.isLoading=false;
        this.$notify({
          title:'Login Error',
          text:'GraphQL client not initialized',
          group:'notify',
          type:'error',
          duration:3000
        });
        return;
      }
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
          
          if(this.isNative){
            this.isSignIn=true;
            this.isAuthenticatedSignIn=true;
          }else{
            this.isSignIn = this.$gAuth.isAuthorized;
            this.isAuthenticatedSignIn = this.$gAuth.isAuthorized;
          }
          
          const userData = { token, email, name, picture };
          try {
            await saveData(userData);
            console.log('saveData completed successfully');
          } catch (saveError) {
            console.error('saveData failed:', saveError);
            // Continue execution even if saveData fails
          }
          
          localStorage.setItem(USER_TAGS, JSON.stringify(tags));
          
          this.$root.$data.name = getSessionItem(GC_USER_NAME);
          
          this.$root.$data.email = getSessionItem(GC_USER_EMAIL);
          
          this.$root.$data.picture = getSessionItem(GC_PICTURE);

          if (isNew) {
            this.$router.push('wizard');
          } else {
            this.$router.push('home');
          }

          setTimeout(() => { 
            this.isLoading = false;
          }, 500);
        },
      }).catch((error) => {
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
    console.log('Capacitor platform:', Capacitor.getPlatform());
    this.isNative = Capacitor.isNativePlatform();
    console.log('Is native platform:', this.isNative);
    
    // Initialize Google Auth for native platforms
    if (this.isNative) {
      try {
        // No need to initialize here as it's already done in main.js
        // and will be re-initialized in handleClickSignIn
        console.log('GoogleAuth will be initialized when signing in');
      } catch (error) {
        console.error('Failed to initialize GoogleAuth:', error);
      }
    }
    // this.isNative = window?.Capacitor?.isNativePlatform?.() || !window.location.href.startsWith('http');
    // this.isNative = window && window.location && window.location.protocol && window.location.protocol.startsWith('http')
    const checkGauthLoad = setInterval(() => {
      const token = getSessionItem(GC_AUTH_TOKEN);
      // this.isInit = this.$gAuth.isInit;
      // this.isSignIn = this.$gAuth.isAuthorized && !window.appSignedOut;

      this.isInit = this.isNative ? true : this.$gAuth.isInit;
      //this.$gAuth.isInit;
      this.isSignIn = this.isNative ? !!token : (this.$gAuth.isAuthorized && !window.appSignedOut)

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

@media (min-width: 768px) and (max-width: 1200px) {
  .banner-box img {
    width: 60%;
  }
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
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.login footer {
  position: absolute;
  bottom: calc(8px + env(safe-area-inset-bottom));
  margin: 0 auto;
  display: block;
  width: 100%;
  padding: 0 16px;
}

/* Add top spacing for status bar */
.login h2:first-of-type {
  margin-top: 20px;
}

/* Ensure content doesn't overlap with footer */
.login-box {
  margin-bottom: 80px;
}
</style>
