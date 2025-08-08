<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="isLoading || isAuthenticatedSignIn">
    <!-- PWA Install Banner -->
    <div v-if="showPWAInstallBanner" class="pwa-install-banner" @click="triggerPWAInstall">
      <div class="pwa-banner-content">
        <v-icon left color="white">get_app</v-icon>
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">Install Routine Notes</div>
          <div class="pwa-banner-subtitle">Get the app for a better experience</div>
        </div>
        <v-icon right color="white" size="16" @click.stop="dismissPWABanner">close</v-icon>
      </div>
    </div>

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
import { MeasurementMixin } from '@/utils/measurementMixins.js';
import { canInstallPWA, installPWADirect, getInstallStatus } from '../utils/pwaInstaller';
import { isStandalone, trackPWAEvent } from '../utils/pwaUtils';

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
      pwaInstallBannerDismissed: false,
    };
  },

  computed: {
    showPWAInstallBanner() {
      // Show PWA install banner if:
      // 1. PWA installation is available
      // 2. App is not already installed
      // 3. Banner hasn't been dismissed
      // 4. User is not loading/signing in
      return canInstallPWA()
        && !isStandalone()
        && !this.pwaInstallBannerDismissed
        && !this.isLoading
        && !this.isAuthenticatedSignIn;
    },
  },

  methods: {
    async triggerPWAInstall() {
      trackPWAEvent('login_page_install_clicked');

      try {
        const result = await installPWADirect();

        if (result.success) {
          console.log('PWA installation successful:', result.message);
          this.pwaInstallBannerDismissed = true;

          // Track successful installation
          this.trackUserInteraction('pwa_install_success', 'banner_click', {
            page: 'login',
            platform: getInstallStatus().platform,
          });
        } else {
          console.log('PWA installation failed:', result.message);

          // Show user-friendly message when install isn't available
          if (result.action === 'not_available') {
            // Create a helpful message for the user
            const helpMessage = result.message + '\n\nTip: Try refreshing the page, or the app might already be installed!';
            
            // You could also show a toast/snackbar here instead of alert
            alert(helpMessage);
          }

          // Track installation failure
          this.trackUserInteraction('pwa_install_failed', 'banner_click', {
            page: 'login',
            reason: result.action,
            message: result.message,
          });
        }
      } catch (error) {
        console.error('Error during PWA installation:', error);
        this.trackError('pwa_install_error', error, {
          page: 'login',
        });
      }
    },

    dismissPWABanner() {
      this.pwaInstallBannerDismissed = true;
      trackPWAEvent('login_page_banner_dismissed');

      this.trackUserInteraction('pwa_banner_dismissed', 'close_click', {
        page: 'login',
      });
    },

    handleClickSignIn() {
      this.trackUserInteraction('login_attempt', 'button_click', {
        provider: 'google',
        page: 'login',
      });

      this.isLoading = true;
      this.$gAuth
        .signIn()
        .then((user) => {
          // Using the new Google Identity Services API response format
          // The credential property contains the JWT access token
          const accessToken = user.credential;
          const notificationId = getSessionItem(GC_NOTIFICATION_TOKEN) || '';
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
    },

    handleClickSignOut() {
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

          this.isSignIn = this.$gAuth.isAuthorized;
          this.isAuthenticatedSignIn = this.$gAuth.isAuthorized;
          const userData = { token, email, name, picture };
          await saveData(userData);
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

          setTimeout(() => { this.isLoading = false; }, 500);
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
    // Track login page view
    this.trackPageView('login');

    const checkGauthLoad = setInterval(() => {
      const token = getSessionItem(GC_AUTH_TOKEN);
      this.isInit = this.$gAuth.isInit;
      this.isSignIn = this.$gAuth.isAuthorized && !window.appSignedOut;
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
}

.login footer {
  position: absolute;
  bottom: 8px;
  margin: 0 auto;
  display: block;
  width: 100%;
}

/* PWA Install Banner Styles */
.pwa-install-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.pwa-install-banner:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.pwa-banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pwa-banner-text {
  flex: 1;
  margin-left: 12px;
  text-align: left;
}

.pwa-banner-title {
  font-weight: 600;
  font-size: 16px;
  line-height: 1.2;
}

.pwa-banner-subtitle {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.2;
  margin-top: 2px;
}

/* Close button hover effect */
.pwa-install-banner .v-icon:last-child {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.pwa-install-banner .v-icon:last-child:hover {
  opacity: 1;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .pwa-banner-title {
    font-size: 14px;
  }

  .pwa-banner-subtitle {
    font-size: 12px;
  }
}
</style>
