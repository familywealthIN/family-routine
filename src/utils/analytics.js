/* eslint-disable class-methods-use-this */
/**
 * Analytics and Measurement Utility
 * Provides comprehensive tracking for user interactions, performance, and business metrics
 * Supports Firebase Analytics and Custom Events
 */

import firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/performance';

class AnalyticsManager {
  constructor() {
    this.isInitialized = false;
    this.deviceInfo = null;
    this.sessionStartTime = Date.now();
    this.pageViewStartTime = null;
    this.eventQueue = [];
    this.offlineEventQueue = [];
    this.userProperties = {};
    this.customDimensions = {};
    this.currentPage = null;
    this.pageViewCount = 0;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds

    this.init();
  }

  async init() {
    try {
      // Initialize Firebase Analytics if not in development
      if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') {
        if (firebase.apps.length > 0) {
          this.analytics = firebase.analytics();
          this.performance = firebase.performance();
        }
      }

      // Get basic device information
      this.deviceInfo = this.getBasicDeviceInfo();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Setup user session tracking
      this.startSession();

      this.isInitialized = true;

      // Process queued events
      this.processEventQueue();

      console.log('Analytics Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Analytics Manager:', error);
    }
  }

  /**
       * Setup performance monitoring
       */
  setupPerformanceMonitoring() {
    // Web Performance API
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Track page load performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          if (perfData) {
            this.trackPerformance('page_load', {
              load_time: perfData.loadEventEnd - perfData.loadEventStart,
              dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              dns_lookup: perfData.domainLookupEnd - perfData.domainLookupStart,
              tcp_connect: perfData.connectEnd - perfData.connectStart,
              server_response: perfData.responseEnd - perfData.requestStart,
              dom_processing: perfData.domComplete - perfData.domLoading,
              resource_load: perfData.loadEventEnd - perfData.domContentLoadedEventEnd,
            });
          }
        }, 0);
      });
    }
  }

  /**
       * Start user session tracking
       */
  startSession() {
    const sessionId = this.generateSessionId();
    this.setUserProperty('session_id', sessionId);
    this.setUserProperty('session_start_time', this.sessionStartTime);

    this.trackEvent('session_start', {
      session_id: sessionId,
      platform: 'web',
      device_info: this.deviceInfo,
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    });
  }

  /**
       * Track page views
       */
  trackPageView(pageName, additionalProps = {}) {
    this.currentPage = pageName;
    this.pageViewStartTime = Date.now();
    this.pageViewCount += 1;

    const pageViewData = {
      page_title: pageName,
      page_location: window.location.href,
      page_path: window.location.pathname,
      timestamp: Date.now(),
      ...additionalProps,
    };

    this.trackEvent('page_view', pageViewData);

    if (this.analytics) {
      this.analytics.logEvent('page_view', {
        page_title: pageName,
        page_location: window.location.href,
      });
    }
  }

  /**
       * Track user interactions
       */
  trackUserInteraction(action, element, additionalProps = {}) {
    this.trackEvent('user_interaction', {
      action,
      element,
      page: this.currentPage,
      timestamp: Date.now(),
      ...additionalProps,
    });
  }

  /**
       * Track business events (goals, tasks, routines)
       */
  trackBusinessEvent(eventName, properties = {}) {
    const businessEventData = {
      event_category: 'business',
      ...properties,
      timestamp: Date.now(),
      page: this.currentPage,
    };

    this.trackEvent(eventName, businessEventData);

    if (this.analytics) {
      this.analytics.logEvent(eventName, properties);
    }
  }

  /**
       * Track performance metrics
       */
  trackPerformance(metricName, data = {}) {
    this.trackEvent('performance_metric', {
      metric_name: metricName,
      ...data,
      timestamp: Date.now(),
      page: this.currentPage,
    });
  }

  /**
       * Track errors and exceptions
       */
  trackError(error, context = {}) {
    const errorData = {
      error_message: error.message || error,
      error_stack: error.stack || 'No stack trace',
      error_type: error.name || 'Unknown',
      page: this.currentPage,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      ...context,
    };

    this.trackEvent('error', errorData);

    if (this.analytics) {
      this.analytics.logEvent('exception', {
        description: error.message || error,
        fatal: false,
      });
    }

    console.error('Tracked error:', error, context);
  }

  /**
       * Track Apollo GraphQL operations
       */
  trackGraphQLOperation(operationName, operationType, variables = {}, duration = null, error = null) {
    const operationData = {
      operation_name: operationName,
      operation_type: operationType,
      has_variables: Object.keys(variables).length > 0,
      variable_count: Object.keys(variables).length,
      page: this.currentPage,
      timestamp: Date.now(),
    };

    if (duration !== null) {
      operationData.duration = duration;
    }

    if (error) {
      operationData.error = error.message || error;
      operationData.has_error = true;
    } else {
      operationData.has_error = false;
    }

    this.trackEvent('graphql_operation', operationData);
  }

  /**
       * Track custom Firebase Performance traces
       */
  createPerformanceTrace(traceName) {
    if (!this.performance) return null;

    const trace = this.performance.trace(traceName);
    trace.start();

    return {
      stop: (attributes = {}) => {
        Object.keys(attributes).forEach((key) => {
          trace.putAttribute(key, String(attributes[key]));
        });
        trace.stop();
      },
      setAttribute: (key, value) => {
        trace.putAttribute(key, String(value));
      },
      incrementMetric: (metricName, incrementBy = 1) => {
        trace.incrementMetric(metricName, incrementBy);
      },
    };
  }

  /**
       * Set user properties
       */
  setUserProperty(property, value) {
    this.userProperties[property] = value;

    if (this.analytics) {
      this.analytics.setUserProperties({ [property]: value });
    }
  }

  /**
       * Set custom dimensions
       */
  setCustomDimension(index, value) {
    this.customDimensions[`custom_dimension_${index}`] = value;
  }

  /**
       * Core event tracking method
       */
  trackEvent(eventName, properties = {}) {
    const eventData = {
      event: eventName,
      ...properties,
      ...this.userProperties,
      ...this.customDimensions,
      session_duration: Date.now() - this.sessionStartTime,
    };

    if (!this.isInitialized) {
      this.eventQueue.push(eventData);
      return;
    }

    // Send to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', eventName, eventData);
    }

    // Send to Firebase Analytics
    if (this.analytics) {
      this.analytics.logEvent(eventName, properties);
    }

    // Send to custom analytics endpoint if configured
    this.sendToCustomEndpoint(eventData);
  }

  /**
       * Send events to custom analytics endpoint
       */
  sendToCustomEndpoint(eventData) {
    // You can implement your custom analytics endpoint here
    console.debug('Analytics event ready for custom endpoint:', eventData);
  }

  /**
       * Process queued events
       */
  processEventQueue() {
    while (this.eventQueue.length > 0) {
      const eventData = this.eventQueue.shift();
      this.trackEvent(eventData.event, eventData);
    }
  }

  /**
   * Get basic device information
   */
  getBasicDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        platform: 'server',
        userAgent: 'unknown',
        language: 'unknown',
        cookieEnabled: false,
        onLine: false,
      };
    }

    return {
      platform: navigator.platform || 'unknown',
      userAgent: navigator.userAgent || 'unknown',
      language: navigator.language || 'unknown',
      cookieEnabled: navigator.cookieEnabled || false,
      onLine: navigator.onLine || false,
      screen: {
        width: screen.width || 0,
        height: screen.height || 0,
        colorDepth: screen.colorDepth || 0,
      },
      viewport: {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
      },
    };
  }

  /**
       * Generate unique session ID
       */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
       * Get current session data
       */
  getSessionData() {
    return {
      session_id: this.userProperties.session_id,
      session_start_time: this.sessionStartTime,
      session_duration: Date.now() - this.sessionStartTime,
      page_views: this.pageViewCount || 0,
      device_info: this.deviceInfo,
      user_properties: this.userProperties,
    };
  }

  /**
       * End session tracking
       */
  endSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;

    this.trackEvent('session_end', {
      session_duration: sessionDuration,
      total_page_views: this.pageViewCount || 0,
    });
  }
}

// Create singleton instance
const analyticsInstance = new AnalyticsManager();

// Vue plugin for easy integration
export const AnalyticsPlugin = {
  install(Vue) {
    // eslint-disable-next-line no-param-reassign
    Vue.prototype.$analytics = analyticsInstance;

    // Note: Removed automatic page view tracking to prevent duplicates
    // Components should manually call this.trackPageView() in their mounted hooks
  },
};

export default analyticsInstance;
