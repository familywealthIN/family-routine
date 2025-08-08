<template>
  <div>
    <!-- Android/Chrome Install Prompt -->
    <v-snackbar
      v-model="showAndroidInstall"
      :timeout="0"
      bottom
      color="primary"
      multi-line
    >
      <div class="d-flex align-center">
        <v-icon left color="white">get_app</v-icon>
        <div>
          <div class="subtitle-2 white--text">Install Routine Notes</div>
          <div class="caption white--text">Add to your home screen for a better experience</div>
        </div>
      </div>
      <template v-slot:action="{ attrs }">
        <v-btn
          color="white"
          text
          v-bind="attrs"
          @click="installPWA"
          class="mr-2"
        >
          Install
        </v-btn>
        <v-btn
          color="white"
          text
          v-bind="attrs"
          @click="dismissAndroidInstall"
        >
          Not Now
        </v-btn>
      </template>
    </v-snackbar>

    <!-- iOS Install Instructions Dialog -->
    <v-dialog
      v-model="showIOSInstall"
      max-width="400"
      persistent
    >
      <v-card>
        <v-card-title class="headline primary white--text">
          <v-icon left color="white">phone_iphone</v-icon>
          Install Routine Notes on {{ installInstructions.platform }}
        </v-card-title>

        <v-card-text class="pt-4">
          <div class="text-center mb-3">
            <v-icon size="48" color="primary">get_app</v-icon>
          </div>

          <p class="body-1 mb-3">
            Install this app on your {{ installInstructions.platform }} device for a better experience:
          </p>

          <div class="instruction-steps">
            <div
              v-for="(step, index) in installInstructions.steps"
              :key="index"
              class="d-flex align-start mb-3"
            >
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-content">
                <div class="d-flex align-center mb-1">
                  <span>{{ step.text }}</span>
                  <v-icon class="ml-2" size="20">{{ step.icon }}</v-icon>
                </div>
                <div class="caption grey--text">
                  {{ step.detail }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            text
            @click="dismissIOSInstall"
          >
            Not Now
          </v-btn>
          <v-btn
            color="primary"
            @click="dismissIOSInstall"
          >
            Got It
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Standalone mode notification (when app is already installed) -->
    <v-snackbar
      v-model="showStandaloneMessage"
      :timeout="4000"
      bottom
      color="success"
    >
      <v-icon left color="white">check_circle</v-icon>
      App is running in standalone mode!
    </v-snackbar>
  </div>
</template>

<script>
import {
  isStandalone,
  isIOS,
  isAndroid,
  hasInstallBeenDismissed,
  markInstallAsDismissed,
  getInstallInstructions,
  trackPWAEvent,
  getPWACapabilities,
} from '../utils/pwaUtils';
import { getInstallStatus, installPWADirect } from '../utils/pwaInstaller';

export default {
  name: 'PWAInstallPrompt',

  data() {
    return {
      showAndroidInstall: false,
      showIOSInstall: false,
      showStandaloneMessage: false,
      installDismissed: false,
      installCheckInterval: null,
    };
  },

  computed: {
    isIOS() {
      return isIOS();
    },

    isAndroid() {
      return isAndroid();
    },

    isStandalone() {
      return isStandalone();
    },

    hasBeenDismissed() {
      return hasInstallBeenDismissed();
    },

    installInstructions() {
      return getInstallInstructions();
    },

    pwaCapabilities() {
      return getPWACapabilities();
    },
  },

  mounted() {
    this.checkInstallPrompt();
    this.setupEventListeners();

    // Listen for fallback install request
    this.$root.$on('pwaInstallRequested', this.triggerInstallPrompt);
  },

  beforeDestroy() {
    // Clean up event listener
    this.$root.$off('pwaInstallRequested', this.triggerInstallPrompt);

    // Clean up interval
    if (this.installCheckInterval) {
      clearInterval(this.installCheckInterval);
    }
  },

  methods: {
    checkInstallPrompt() {
      // Don't show if already dismissed recently
      if (this.hasBeenDismissed) {
        return;
      }

      // Don't show if already in standalone mode
      if (this.isStandalone) {
        this.showStandaloneMessage = true;
        trackPWAEvent('already_installed');
        return;
      }

      // Wait a bit before showing the prompt to let the user get oriented
      setTimeout(() => {
        if (this.isIOS && !this.isStandalone) {
          this.showIOSInstallPrompt();
        }
      }, 3000); // Show after 3 seconds
    },

    setupEventListeners() {
      // Listen for app installed event
      window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        trackPWAEvent('install_success');
        this.showAndroidInstall = false;
        this.showIOSInstall = false;

        // Show success message
        this.$notify({
          group: 'notify',
          type: 'success',
          title: 'App Installed!',
          text: 'Routine Notes has been added to your home screen.',
        });
      });

      // Check for install availability periodically
      this.checkInstallAvailability();
      this.installCheckInterval = setInterval(() => {
        this.checkInstallAvailability();
      }, 2000); // Check every 2 seconds
    },

    checkInstallAvailability() {
      const status = getInstallStatus();

      // Show Android install prompt if available and not dismissed
      if (status.hasPrompt && !this.hasBeenDismissed && !status.isStandalone && !this.showAndroidInstall) {
        setTimeout(() => {
          if (!this.hasBeenDismissed && !isStandalone()) {
            this.showAndroidInstall = true;
            trackPWAEvent('prompt_shown', { type: 'android' });
          }
        }, 5000); // Show after 5 seconds
      }
    },

    async installPWA() {
      // Use the global installer instead of local deferredPrompt
      const result = await installPWADirect();

      if (result.success) {
        console.log('Installation successful:', result.message);
        if (result.action === 'install_accepted') {
          this.showAndroidInstall = false;
        }
      } else {
        console.log('Installation failed:', result.message);
        if (result.action === 'install_dismissed') {
          this.markAsDismissed();
        }
      }

      this.showAndroidInstall = false;
    },

    showIOSInstallPrompt() {
      this.showIOSInstall = true;
      trackPWAEvent('prompt_shown', { type: 'ios' });
    },

    dismissAndroidInstall() {
      this.showAndroidInstall = false;
      trackPWAEvent('prompt_dismissed', { type: 'android' });
      this.markAsDismissed();
    },

    dismissIOSInstall() {
      this.showIOSInstall = false;
      trackPWAEvent('prompt_dismissed', { type: 'ios' });
      this.markAsDismissed();
    },

    markAsDismissed() {
      markInstallAsDismissed();
    },

    // Public method to manually trigger install prompt
    async triggerInstallPrompt() {
      trackPWAEvent('manual_trigger');

      const result = await installPWADirect();

      if (result.success) {
        console.log('Manual installation successful:', result.message);
        if (result.action !== 'ios_instructions') {
          // Show success notification for non-iOS platforms
          this.$notify({
            group: 'notify',
            type: 'success',
            title: 'Installation Started',
            text: result.message,
          });
        }
      } else {
        console.log('Manual installation failed:', result.message);
        this.$notify({
          group: 'notify',
          type: 'info',
          title: 'Installation Info',
          text: result.message,
        });
      }
    },
  },
};
</script>

<style scoped>
.instruction-steps {
  max-width: 100%;
}

.step-number {
  background: #1976d2;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-content {
  flex: 1;
}

.v-snackbar {
  margin-bottom: 60px; /* Adjust based on your bottom navigation */
}

@media (max-width: 600px) {
  .v-dialog {
    margin: 16px;
  }
}
</style>
