/**
 * Direct PWA installation handler
 * This file provides a fallback method for triggering PWA installation
 * without relying on component references
 */

import {
    isStandalone,
    isIOS,
    trackPWAEvent,
    getInstallInstructions,
} from './pwaUtils';

// Store the deferred prompt globally
let deferredPrompt = null;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event received');
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt deferred, deferredPrompt is now:', !!deferredPrompt);
    trackPWAEvent('prompt_available');
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    trackPWAEvent('install_success');
});

/**
 * Direct PWA installation function
 * Can be called from anywhere in the app
 */
export async function installPWADirect() {
  console.log('=== installPWADirect called ===');
  console.log('deferredPrompt exists:', !!deferredPrompt);
  console.log('isStandalone:', isStandalone());
  console.log('isIOS:', isIOS());
  
  trackPWAEvent('direct_install_trigger');

    // Check if already installed
    if (isStandalone()) {
        console.log('App is already installed');
        return {
            success: false,
            message: 'App is already installed',
            action: 'already_installed',
        };
    }

    // Handle iOS
    if (isIOS()) {
        trackPWAEvent('ios_manual_instructions_shown');
        const instructions = getInstallInstructions();

        // Create a simple alert with instructions
        const message = `To install this app on your ${instructions.platform} device:\n\n${instructions.steps.map((step, index) => `${index + 1}. ${step.text}`).join('\n')
            }`;

        alert(message);

        return {
            success: true,
            message: 'iOS installation instructions shown',
            action: 'ios_instructions',
        };
    }

    // Handle Android/Chrome with deferred prompt
    if (deferredPrompt) {
        try {
            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                trackPWAEvent('install_accepted');
                deferredPrompt = null;

                return {
                    success: true,
                    message: 'User accepted installation',
                    action: 'install_accepted',
                };
            }

      console.log('User dismissed the install prompt');
      trackPWAEvent('install_dismissed');
      // Don't set deferredPrompt to null on dismiss, keep it available

      return {
        success: false,
        message: 'User dismissed installation',
        action: 'install_dismissed',
      };
        } catch (error) {
            console.error('Error during installation:', error);
            trackPWAEvent('install_error', { error: error.message });

            return {
                success: false,
                message: `Installation error: ${error.message}`,
                action: 'install_error',
            };
        }
    }

  // No install prompt available - check why
  console.log('No install prompt available');
  console.log('User agent:', navigator.userAgent);
  console.log('Current URL:', window.location.href);
  console.log('Service worker registered:', 'serviceWorker' in navigator);
  
  trackPWAEvent('no_install_prompt_available', {
    userAgent: navigator.userAgent,
    hasServiceWorker: 'serviceWorker' in navigator,
    currentUrl: window.location.href,
  });

  return {
    success: false,
    message: 'Installation not available on this browser/device. Try refreshing the page or check if the app is already installed.',
    action: 'not_available',
  };
}

/**
 * Check if PWA installation is available
 */
export function canInstallPWA() {
    return !isStandalone() && (deferredPrompt !== null || isIOS());
}

/**
 * Get installation availability status
 */
export function getInstallStatus() {
    const status = {
        isStandalone: isStandalone(),
        canInstall: canInstallPWA(),
        hasPrompt: deferredPrompt !== null,
        platform: isIOS() ? 'ios' : 'android',
        deferredPromptExists: !!deferredPrompt,
    };

    console.log('Current install status:', status);
    return status;
}

/**
 * Debug function to log current state
 */
export function debugPWAStatus() {
    console.log('=== PWA Debug Status ===');
    console.log('deferredPrompt exists:', !!deferredPrompt);
    console.log('isStandalone:', isStandalone());
    console.log('isIOS:', isIOS());
    console.log('canInstallPWA:', canInstallPWA());
    console.log('getInstallStatus:', getInstallStatus());
    console.log('========================');
}

/**
 * Reset PWA install state - useful for testing or manual refresh
 */
export function resetInstallState() {
  console.log('Resetting PWA install state');
  // Note: We can't force the beforeinstallprompt event to fire again
  // but we can at least clear our state and provide info to the user
  if (deferredPrompt) {
    console.log('Clearing existing deferredPrompt');
    deferredPrompt = null;
  }
  
  // Track the reset
  trackPWAEvent('install_state_reset');
  
  return {
    message: 'Install state reset. The install prompt may become available again after navigating away and returning to the site.',
    needsRefresh: true,
  };
}
