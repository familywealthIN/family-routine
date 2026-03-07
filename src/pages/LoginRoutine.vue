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
      <a href="javascript:void(0)" class="apple-button" alt="Login with Apple" @click="handleAppleSignIn"
      v-if="!isSignIn && isIOS" :disabled="!isInit">
      <div class="apple-box">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20px" height="20px" fill="#000">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      </div>
      <div class="apple-text">
        Sign in with Apple
      </div>
    </a>
    </div>
    <!-- <footer> -->
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
    <!-- </footer> -->
  </container-box>

</template>

<script>

import gql from 'graphql-tag';
import { saveData, clearData, getSessionItem, isRunningStandalone } from '../token';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { MeasurementMixin } from '@/utils/measurementMixins.js';

import {
  GC_USER_NAME,
  GC_PICTURE,
  GC_USER_EMAIL,
  GC_NOTIFICATION_TOKEN,
  USER_TAGS,
  GC_AUTH_TOKEN,
} from '../constants/settings';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';

export default {
  name: 'Login',
  mixins: [MeasurementMixin],
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
      isIOS: false,
    };
  },

  methods: {
 async handleAppleSignIn() {
  this.isLoading = true;
  
  try {
    const result = await SignInWithApple.authorize({
      clientId: 'com.routine.note',
      scopes: 'name email'
    });
    
    console.log('Apple Sign-In result:', result);
    
    const { identityToken, email, givenName, familyName } = result.response;
    const name = (givenName && familyName) ? `${givenName} ${familyName}`.trim() : 'Apple User';
    const userEmail = email || 'apple.user@example.com';
    
    this.createAppleSession(identityToken, userEmail, name);
    
  } catch (error) {
    console.error('Apple Sign-In failed:', error);
    this.isLoading = false;
    
    // Don't show error for user cancellation
    if (error.code !== 1001) {
      this.$notify({
        title: 'Login Error',
        text: 'Apple sign in failed. Please try again.',
        group: 'notify',
        type: 'error',
        duration: 3000,
      });
    }
  }
},


 createAppleSession(identityToken, email, name) {
  console.log('=== Apple Session Creation Started ===');
  console.log('Identity Token:', identityToken);
  console.log('Email:', email);
  console.log('Name:', name);
  
  const notificationId = localStorage.getItem('GC_NOTIFICATION_TOKEN') || '';
  console.log('Notification ID:', notificationId);
  
  console.log('Starting GraphQL mutation...');
  
  this.$apollo.mutate({
    mutation: gql`
      mutation authApple($identityToken: String!, $notificationId: String!) {
        authApple(
          identityToken: $identityToken
          notificationId: $notificationId
        ) {
          name
          email
          picture
          needsOnboarding
          token
          tags
        }
      }
    `,
    variables: {
      identityToken: identityToken,
      notificationId,
    },
    update: async (store, { data: { authApple } }) => {
      console.log('=== GraphQL Response Received ===');
      console.log('Auth Apple Response:', authApple);
      
      const {
        name, email, picture, token, needsOnboarding, tags = []
      } = authApple;
      
      console.log('Extracted data:', { name, email, picture, token, needsOnboarding, tags });
      
      this.isSignIn = true;
      this.isAuthenticatedSignIn = true;
      
      const userData = { token, email, name, picture };
      console.log('Saving user data:', userData);
      
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

      console.log('Navigation decision - needsOnboarding:', needsOnboarding);
      
      if (needsOnboarding) {
        console.log('Redirecting to wizard');
        this.$router.push('wizard');
      } else {
        console.log('Redirecting to home');
        this.$router.push('home');
      }

      setTimeout(() => { 
        console.log('Setting loading to false');
        this.isLoading = false;
      }, 500);
    },
  }).catch((error) => {
    console.error('=== GraphQL Error ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    this.isLoading = false;
    this.$notify({
      title: 'Login Error',
      text: 'Apple sign in failed. Please try again.',
      group: 'notify',
      type: 'error',
      duration: 3000,
    });
  });
},



   
    async handleClickSignIn() {
      this.isLoading = true;

      if (this.isNative) {
        console.log('native function called')
        // Native Google login
        try {
          // Re-initialize GoogleAuth to ensure it's properly configured
          const platform = Capacitor.getPlatform();
      const clientId = platform === 'ios' 
        ? '350952942983-48lis9mbeudskd9rovrnov5gm35h0vre.apps.googleusercontent.com'
        : '350952942983-6h4a30scu81ra204ndpe1md2sccukrhv.apps.googleusercontent.com';
          console.log(platform)
      // const clientId = platform === 'ios' 
      //   ? '350952942983-48lis9mbeudskd9rovrnov5gm35h0vre.apps.googleusercontent.com'
      //   : '350952942983-6h4a30scu81ra204ndpe1md2sccukrhv.apps.googleusercontent.com';

      //     await GoogleAuth.initialize({
      //       clientId: clientId,
      //       scopes: ['profile', 'email'],
      //       grantOfflineAccess: true,
      //       forceCodeForRefreshToken: true
      //     });
          if(platform === 'ios'){
                await GoogleAuth.initialize({
                  clientId: clientId,
                  scopes: ['profile', 'email'],
                  grantOfflineAccess: true,
                  forceCodeForRefreshToken: true
                });

          }else{
          await GoogleAuth.initialize({
            clientId: clientId,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
            forceCodeForRefreshToken: true
          });
        }
          
          console.log('Attempting to sign in with GoogleAuth');
          const result = await GoogleAuth.signIn();
          console.log('GoogleAuth sign in result:', result);
          
          if (!result || !result.authentication.idToken) {
            throw new Error('Authentication data missing from sign in result');
          }
          
          const accessToken = result.authentication.idToken;
          const notificationId = localStorage.getItem('GC_NOTIFICATION_TOKEN') || '';
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
          // Using the new Google Identity Services API response format
          // The credential property contains the JWT access token
          const accessToken = user.credential;
          const notificationId = localStorage.getItem('GC_NOTIFICATION_TOKEN') || '';
          console.log('Access Token:', accessToken);  
          console.log('Notification ID:', notificationId);

          this.createSession(accessToken, notificationId);
        })
        .catch((error) => {
          console.log(error);
          this.trackError('login_error', error, {
            provider: 'google',
            error_type: 'auth_failure',
          });
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
      this.trackUserInteraction('logout_attempt', 'button_click', {
        provider: 'google',
      });

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

          this.trackUserInteraction('logout_success', 'auth_flow', {
            provider: 'google',
          });
        })
        .catch((error) => {
          console.log(error);
          this.trackError('logout_error', error, {
            provider: 'google',
            error_type: 'signout_failure',
          });
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
              needsOnboarding
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
            name, email, picture, token, needsOnboarding, tags = []
          } = authGoogle;
          
          if(this.isNative){
            this.isSignIn=true;
            this.isAuthenticatedSignIn=true;
          }else{
            this.isSignIn = this.$gAuth.isAuthorized;
            this.isAuthenticatedSignIn = this.$gAuth.isAuthorized;
          }
          
          const userData = { token, email, name, picture, notificationId: notificationId };
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

          // Track successful login
          this.trackBusinessEvent('user_login', {
            provider: 'google',
            is_new_user: needsOnboarding,
            user_email: email,
            tags_count: tags.length,
          });

          if (needsOnboarding) {
            this.trackUserInteraction('onboarding_redirect', 'navigation', {
              from_page: 'login',
              to_page: 'wizard',
            });
            this.$router.push('wizard');
          } else {
            this.trackUserInteraction('dashboard_redirect', 'navigation', {
              from_page: 'login',
              to_page: 'home',
            });
            this.$router.push('home');
          }

          setTimeout(() => { 
            this.isLoading = false;
          }, 500);
        },
      }).catch((error) => {
          this.isLoading = false;
          this.trackError('login_session_error', error, {
            provider: 'google',
            error_type: 'auth_mutation_failure',
          });
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
    this.isIOS = Capacitor.getPlatform() === 'ios';
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
        this.trackUserInteraction('auto_redirect_authenticated', 'navigation', {
          from_page: 'login',
          to_page: 'home',
          redirect_count: this.redirectCount,
        });
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
  padding: 30px 16px 60px;
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
  /* bottom: calc(8px + env(safe-area-inset-bottom)); */
  bottom: 0 !important;
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
 /* .login-box {
  margin-bottom: 80px;
} */
.apple-button {
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  background-color: #000;
  color: white;
  text-decoration: none;
  padding-right: 16px;
  border-radius: 2px;
  cursor: pointer;
  margin-top: 10px;
  width: 100%;
  max-width: 280px;
}

.apple-box {
  background-color: white;
  margin: 2px;
  padding: 12px;
  min-height: 42px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
}

.google-button {
  width: 100%;
  max-width: 280px;
}

/* .login-box {
  margin-bottom: 120px;
} */


.apple-text {
  margin-left: 12px;
  flex: 1;
  text-align: center;
}

</style>
