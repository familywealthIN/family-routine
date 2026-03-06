/**
 * Android Safe Area Utility
 * Handles safe area detection and management for Android 14+ devices
 */

export class AndroidSafeAreaManager {
  constructor() {
    this.isAndroid14Plus = false;
    this.androidVersion = null;
    this.init();
  }

  init() {
    this.detectAndroidVersion();
    this.applySafeAreaClasses();
    this.setupViewportHandler();
  }

  detectAndroidVersion() {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const androidMatch = ua.match(/Android\s([0-9\.]+)/);
    
    if (androidMatch) {
      this.androidVersion = parseFloat(androidMatch[1]);
      this.isAndroid14Plus = this.androidVersion >= 14;
      
      console.log(`Detected Android version: ${this.androidVersion}`);
      console.log(`Android 14+ support: ${this.isAndroid14Plus}`);
    }
  }

  applySafeAreaClasses() {
    if (!this.isAndroid14Plus) return;

    const body = document.body;
    const html = document.documentElement;

    // Add Android 14+ classes
    body.classList.add('android14-plus');
    html.classList.add('android14-plus');

    // Set CSS custom properties
    html.style.setProperty('--android-version', this.androidVersion.toString());
    
    // Apply safe area CSS variables
    this.updateSafeAreaVariables();
  }

  updateSafeAreaVariables() {
    if (!this.isAndroid14Plus) return;

    const html = document.documentElement;
    
    // Set safe area inset variables with fallbacks
    html.style.setProperty('--safe-area-inset-top', 'max(env(safe-area-inset-top), 24px)');
    html.style.setProperty('--safe-area-inset-bottom', 'max(env(safe-area-inset-bottom), 16px)');
    html.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    html.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
  }

  setupViewportHandler() {
    if (!this.isAndroid14Plus) return;

    // Handle viewport changes (orientation, keyboard, etc.)
    const handleViewportChange = () => {
      this.updateSafeAreaVariables();
    };

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleViewportChange);
    
    // Listen for resize events (keyboard show/hide)
    window.addEventListener('resize', handleViewportChange);
    
    // Visual viewport API support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
  }

  // Method to manually refresh safe area handling
  refresh() {
    this.updateSafeAreaVariables();
  }

  // Get current safe area values
  getSafeAreaInsets() {
    if (!this.isAndroid14Plus) {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const computedStyle = getComputedStyle(document.documentElement);
    return {
      top: computedStyle.getPropertyValue('--safe-area-inset-top'),
      bottom: computedStyle.getPropertyValue('--safe-area-inset-bottom'),
      left: computedStyle.getPropertyValue('--safe-area-inset-left'),
      right: computedStyle.getPropertyValue('--safe-area-inset-right'),
    };
  }
}

// Create singleton instance
export const androidSafeArea = new AndroidSafeAreaManager();

// Auto-initialize when module is imported
export default androidSafeArea;