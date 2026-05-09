/**
 * Vue Mixins for Measurement and Analytics
 * Provides easy-to-use methods for tracking user interactions and business events
 */

import analytics from './analytics';

export const AnalyticsMixin = {
  data() {
    return {
      componentStartTime: null,
      componentName: null,
    };
  },

  methods: {
    /**
         * Track button clicks
         */
    trackButtonClick(buttonName, additionalProps = {}) {
      analytics.trackUserInteraction('click', 'button', {
        button_name: buttonName,
        ...additionalProps,
      });
    },

    /**
         * Track form submissions
         */
    trackFormSubmit(formName, formData = {}, success = true) {
      analytics.trackUserInteraction('submit', 'form', {
        form_name: formName,
        success,
        field_count: Object.keys(formData).length,
        has_data: Object.keys(formData).length > 0,
      });
    },

    /**
         * Track navigation events
         */
    trackNavigation(from, to, method = 'click') {
      analytics.trackUserInteraction('navigate', 'link', {
        from_page: from,
        to_page: to,
        navigation_method: method,
      });
    },

    /**
         * Track modal/dialog interactions
         */
    trackModalInteraction(modalName, action, additionalProps = {}) {
      analytics.trackUserInteraction(action, 'modal', {
        modal_name: modalName,
        ...additionalProps,
      });
    },

    /**
         * Track search actions
         */
    trackSearch(query, results = null, searchType = 'general') {
      analytics.trackUserInteraction('search', 'search_box', {
        search_query: query,
        search_type: searchType,
        results_count: results !== null ? results.length : null,
        has_results: results !== null ? results.length > 0 : null,
      });
    },

    /**
         * Track page views
         */
    trackPageView(pageName, additionalProps = {}) {
      analytics.trackPageView(pageName, additionalProps);
    },

    /**
         * Track user interactions (direct method)
         */
    trackUserInteraction(action, element, additionalProps = {}) {
      analytics.trackUserInteraction(action, element, additionalProps);
    },

    /**
         * Track errors and exceptions
         */
    trackError(error, context = {}) {
      analytics.trackError(error, context);
    },

    /**
         * Track time spent on component
         */
    startTimeTracking(componentName) {
      this.componentStartTime = Date.now();
      this.componentName = componentName;
    },

    endTimeTracking() {
      if (this.componentStartTime && this.componentName) {
        const timeSpent = Date.now() - this.componentStartTime;
        analytics.trackEvent('component_time_spent', {
          component_name: this.componentName,
          time_spent: timeSpent,
        });
      }
    },
  },

  mounted() {
    // Auto-track component mount
    if (this.$options.name) {
      analytics.trackEvent('component_mounted', {
        component_name: this.$options.name,
      });
      this.startTimeTracking(this.$options.name);
    }
  },

  beforeDestroy() {
    // Auto-track component unmount and time spent
    if (this.$options.name) {
      this.endTimeTracking();
      analytics.trackEvent('component_unmounted', {
        component_name: this.$options.name,
      });
    }
  },
};

export const BusinessEventsMixin = {
  methods: {
    /**
         * Track business events (direct method)
         */
    trackBusinessEvent(eventName, properties = {}) {
      analytics.trackBusinessEvent(eventName, properties);
    },

    /**
         * Track goal-related events
         */
    trackGoalEvent(action, goalData = {}) {
      analytics.trackBusinessEvent(`goal_${action}`, {
        goal_id: goalData.id,
        goal_period: goalData.period,
        goal_type: goalData.type,
        has_deadline: !!goalData.deadline,
        has_tags: goalData.tags && goalData.tags.length > 0,
        tag_count: goalData.tags ? goalData.tags.length : 0,
      });
    },

    /**
         * Track task-related events
         */
    trackTaskEvent(action, taskData = {}) {
      analytics.trackBusinessEvent(`task_${action}`, {
        task_id: taskData.id,
        task_name: taskData.name,
        has_time: !!taskData.time,
        has_points: !!taskData.points,
        is_completed: taskData.ticked || false,
        is_passed: taskData.passed || false,
      });
    },

    /**
         * Track routine-related events
         */
    trackRoutineEvent(action, routineData = {}) {
      analytics.trackBusinessEvent(`routine_${action}`, {
        routine_id: routineData.id,
        routine_name: routineData.name,
        routine_date: routineData.date,
        task_count: routineData.tasklist ? routineData.tasklist.length : 0,
        completed_tasks: routineData.tasklist
          ? routineData.tasklist.filter((task) => task.ticked).length
          : 0,
      });
    },

    /**
         * Track progress and completion events
         */
    trackProgressEvent(type, progressData = {}) {
      analytics.trackBusinessEvent(`progress_${type}`, {
        progress_type: type,
        current_value: progressData.current,
        target_value: progressData.target,
        percentage: progressData.current && progressData.target
          ? Math.round((progressData.current / progressData.target) * 100)
          : null,
        period: progressData.period,
      });
    },

    /**
         * Track user engagement events
         */
    trackEngagementEvent(action, engagementData = {}) {
      analytics.trackBusinessEvent(`engagement_${action}`, {
        engagement_type: action,
        duration: engagementData.duration,
        frequency: engagementData.frequency,
        streak: engagementData.streak,
      });
    },
  },
};

export const PerformanceMixin = {
  data() {
    return {
      performanceMarks: {},
    };
  },

  methods: {
    /**
         * Start performance measurement
         */
    startPerformanceMeasurement(name) {
      this.performanceMarks[name] = Date.now();

      // Use Performance API if available
      if (window.performance && window.performance.mark) {
        window.performance.mark(`${name}_start`);
      }
    },

    /**
         * End performance measurement
         */
    endPerformanceMeasurement(name, additionalData = {}) {
      if (this.performanceMarks[name]) {
        const duration = Date.now() - this.performanceMarks[name];

        analytics.trackPerformance(`component_${name}`, {
          duration,
          component_name: this.$options.name,
          ...additionalData,
        });

        // Use Performance API if available
        if (window.performance && window.performance.mark && window.performance.measure) {
          window.performance.mark(`${name}_end`);
          window.performance.measure(name, `${name}_start`, `${name}_end`);
        }

        delete this.performanceMarks[name];
      }
    },

    /**
         * Track Apollo query performance
         */
    trackQueryPerformance(queryName, variables = {}, startTime = null) {
      if (startTime) {
        const duration = Date.now() - startTime;
        analytics.trackGraphQLOperation(
          queryName,
          'query',
          variables,
          duration,
        );
      }
    },

    /**
         * Track Apollo mutation performance
         */
    trackMutationPerformance(mutationName, variables = {}, startTime = null, error = null) {
      if (startTime) {
        const duration = Date.now() - startTime;
        analytics.trackGraphQLOperation(
          mutationName,
          'mutation',
          variables,
          duration,
          error,
        );
      }
    },
  },
};

// Combined mixin with all measurement capabilities
export const MeasurementMixin = {
  mixins: [AnalyticsMixin, BusinessEventsMixin, PerformanceMixin],
};

export default MeasurementMixin;
