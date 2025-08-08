# PWA Installation Feature

This document describes the Progressive Web App (PWA) installation feature implemented in the Routine Notes application.

## Overview

The PWA installation feature allows users to install the Routine Notes app on their devices (mobile and desktop) for a native app-like experience. The implementation includes automatic prompts, manual installation options, and comprehensive analytics tracking.

## Components

### 1. PWAInstallPrompt Component ( `src/components/PWAInstallPrompt.vue` )

The main component that handles:
* Automatic installation prompts for Android/Chrome browsers
* iOS installation instructions dialog
* Installation state management
* Analytics tracking for user interactions

**Features:**
* Platform-specific installation instructions
* Automatic dismissal with configurable timeouts (30 days default)
* Support for both automatic and manual triggers
* Comprehensive error handling

### 2. PWA Utilities ( `src/utils/pwaUtils.js` )

Utility functions for PWA functionality:

**Functions:**
* `isStandalone()` - Check if app is running in standalone mode
* `isIOS()` / `isAndroid()` - Platform detection
* `hasInstallBeenDismissed()` - Check dismissal status
* `markInstallAsDismissed()` - Mark prompt as dismissed
* `getInstallInstructions()` - Get platform-specific instructions
* `trackPWAEvent()` - Analytics tracking
* `getPWACapabilities()` - Get device/browser PWA capabilities

### 3. Settings PWA Container ( `src/containers/SettingsPWA.vue` )

A settings panel that displays:
* Installation status
* Benefits of installing the app
* Manual installation trigger
* Technical information about PWA capabilities

## Installation Points

### Mobile (Drawer Menu)

* Location: Settings section in navigation drawer
* Visibility: Hidden when app is already installed
* Trigger: Tap "Install App" option

### Desktop (Sidebar)

* Location: Bottom of navigation sidebar (above logout)
* Styling: Highlighted with gradient background
* Visibility: Hidden when app is already installed
* Trigger: Click "Install App" option

### Settings Page

* Location: `/settings` route
* Always visible with current installation status
* Provides detailed information and manual trigger

## Auto-Prompt Behavior

### Android/Chrome

* Triggers after 5 seconds on supported browsers
* Uses native `beforeinstallprompt` event
* Dismissal remembered for 30 days

### iOS/Safari

* Triggers after 3 seconds on iOS devices
* Shows detailed installation instructions
* Dismissal remembered for 30 days

### Standalone Detection

* Shows success message when app is already installed
* Hides installation options in navigation

## Analytics Tracking

All PWA-related user interactions are tracked:

**Events:**
* `PWA prompt_shown` - When installation prompt is displayed
* `PWA install_accepted` - When user accepts installation
* `PWA install_dismissed` - When user dismisses prompt
* `PWA manual_trigger` - When user manually triggers install
* `PWA already_installed` - When app is already installed
* `PWA settings_install_clicked` - Install from settings page
* `PWA mobile_drawer_install_clicked` - Install from mobile drawer
* `PWA desktop_sidebar_install_clicked` - Install from desktop sidebar

## Configuration

### Manifest Settings ( `public/manifest.json` )

* App name and short name
* Icons for various sizes (including maskable)
* Display mode: `standalone`
* Start URL with install parameter
* Theme colors

### Meta Tags ( `public/index.html` )

* Apple-specific PWA meta tags
* Touch icons for iOS
* Splash screens for various device sizes
* Mobile web app capability flags

### Vue Configuration ( `vue.config.js` )

* PWA plugin configuration
* Service worker setup
* Workbox configuration for caching

## Browser Support

**Full Support:**
* Chrome/Edge (Android & Desktop)
* Safari (iOS - with manual instructions)
* Firefox (with limitations)

**Limited Support:**
* Safari (macOS - with manual browser install)
* Other Chromium browsers

## User Experience Flow

1. **First Visit**: User browses the app normally
2. **Auto Prompt**: After 3-5 seconds, installation prompt appears
3. **User Choice**: 
   - Accept: App installs to home screen/desktop
   - Dismiss: Prompt hidden for 30 days
4. **Manual Install**: Users can always trigger install from navigation or settings
5. **Installed State**: App runs in standalone mode with native experience

## Benefits Communicated to Users

* **Offline Access**: Use app without internet connection
* **Home Screen Icon**: Quick access from device home screen
* **Full Screen Experience**: Native app-like interface
* **Push Notifications**: Direct notifications to device
* **Faster Loading**: Cached resources for improved performance

## Technical Requirements

**Service Worker**: Handles caching and offline functionality
**HTTPS**: Required for PWA features (except localhost)
**Manifest**: Defines app metadata and display options
**Icons**: Multiple sizes for various devices and contexts

## Development Notes

* The feature gracefully degrades on unsupported browsers
* All installation options are hidden when app is already installed
* Analytics integration allows tracking of installation funnel
* Dismissal state is persisted in localStorage
* Event-driven architecture allows flexible triggering from any component

## Future Enhancements

* **Install Banners**: Custom designed install banners
* **Update Notifications**: Notify users of app updates
* **Offline Indicators**: Show connectivity status
* **Share Target**: Allow sharing content to the app
* **Shortcuts**: Define app shortcuts for quick actions
