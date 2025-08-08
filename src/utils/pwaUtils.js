/**
 * PWA (Progressive Web App) utility functions
 * Provides detection and management of PWA installation capabilities
 */

/**
 * Check if the app is currently running in standalone mode (installed)
 * @returns {boolean} True if running in standalone mode
 */
export function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone
        || document.referrer.includes('android-app://');
}

/**
 * Check if the device is iOS
 * @returns {boolean} True if iOS device
 */
export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Check if the device is Android
 * @returns {boolean} True if Android device
 */
export function isAndroid() {
    return /Android/.test(navigator.userAgent);
}

/**
 * Check if PWA installation has been previously dismissed
 * @param {number} daysToDismiss - Number of days to keep dismissal (default: 30)
 * @returns {boolean} True if dismissed within the specified time
 */
export function hasInstallBeenDismissed(daysToDismiss = 30) {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return false;

    const dismissedTime = parseInt(dismissed, 10);
    const timeLimit = daysToDismiss * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    return (Date.now() - dismissedTime) < timeLimit;
}

/**
 * Mark PWA installation prompt as dismissed
 */
export function markInstallAsDismissed() {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
}

/**
 * Clear the dismissal flag (force show install prompt again)
 */
export function clearInstallDismissal() {
    localStorage.removeItem('pwa-install-dismissed');
}

/**
 * Check if the browser supports PWA installation
 * @returns {boolean} True if browser supports PWA installation
 */
export function supportsPWAInstall() {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
}

/**
 * Get platform-specific installation instructions
 * @returns {Object} Instructions object with platform info and steps
 */
export function getInstallInstructions() {
    let platform = 'desktop';
    if (isIOS()) {
        platform = 'ios';
    } else if (isAndroid()) {
        platform = 'android';
    }

    const instructions = {
        ios: {
            platform: 'iOS',
            steps: [
                { icon: 'ios_share', text: 'Tap the share button', detail: 'Located at the bottom of your screen' },
                { icon: 'add_box', text: 'Select "Add to Home Screen"', detail: 'Scroll down if you don\'t see it immediately' },
                { icon: 'check', text: 'Tap "Add" to confirm', detail: 'The app will appear on your home screen' },
            ],
        },
        android: {
            platform: 'Android',
            steps: [
                { icon: 'more_vert', text: 'Tap the menu button', detail: 'Usually three dots in the top right' },
                { icon: 'add_to_home_screen', text: 'Select "Add to Home screen"', detail: 'Or "Install app" if available' },
                { icon: 'check', text: 'Tap "Add" to confirm', detail: 'The app will be installed on your device' },
            ],
        },
        desktop: {
            platform: 'Desktop',
            steps: [
                { icon: 'get_app', text: 'Look for install button', detail: 'Usually in the address bar or browser menu' },
                { icon: 'download', text: 'Click "Install"', detail: 'Follow your browser\'s prompts' },
                { icon: 'launch', text: 'Launch the app', detail: 'Find it in your applications or start menu' },
            ],
        },
    };

    return instructions[platform] || instructions.desktop;
}

/**
 * Track PWA installation events for analytics
 * @param {string} event - Event name ('prompt_shown', 'install_accepted', 'install_dismissed', etc.)
 * @param {Object} data - Additional event data
 */
export function trackPWAEvent(event, data = {}) {
    let platform = 'desktop';
    if (isIOS()) {
        platform = 'ios';
    } else if (isAndroid()) {
        platform = 'android';
    }

    // If analytics is available, track the event
    if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track(`PWA ${event}`, {
            platform,
            standalone: isStandalone(),
            userAgent: navigator.userAgent,
            ...data,
        });
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`PWA Event: ${event}`, data);
    }
}

/**
 * Get PWA capabilities for the current browser/device
 * @returns {Object} Object describing PWA capabilities
 */
export function getPWACapabilities() {
    let platform = 'desktop';
    if (isIOS()) {
        platform = 'ios';
    } else if (isAndroid()) {
        platform = 'android';
    }

    return {
        canInstall: supportsPWAInstall() || isIOS(),
        platform,
        standalone: isStandalone(),
        supportsNotifications: 'Notification' in window,
        supportsServiceWorker: 'serviceWorker' in navigator,
        supportsPushMessaging: 'PushManager' in window,
        supportsBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    };
}
