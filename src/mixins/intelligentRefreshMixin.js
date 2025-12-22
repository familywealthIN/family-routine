/**
 * Intelligent Refresh Mixin
 * Provides intelligent refresh functionality for components with routine items
 */

import moment from 'moment';

export default {
  data() {
    return {
      refreshTimerId: null,
      lastRefreshDate: null,
      refreshInterval: 30 * 1000, // 30 seconds default
      isRefreshActive: false,
      onDayChangeCallback: null,
      onRoutineCheckCallback: null,
    };
  },

  methods: {
    /**
     * Start intelligent refresh timer
     * @param {Object} options - Configuration options
     * @param {number} options.interval - Refresh interval in milliseconds (default: 30s)
     * @param {Function} options.onDayChange - Callback when day changes
     * @param {Function} options.onRoutineCheck - Callback for routine item checks
     */
    startIntelligentRefresh(options = {}) {
      const {
        interval = 30 * 1000,
        onDayChange = null,
        onRoutineCheck = null,
      } = options;

      this.refreshInterval = interval;
      this.lastRefreshDate = moment().format('DD-MM-YYYY');
      this.isRefreshActive = true;
      this.onDayChangeCallback = onDayChange;
      this.onRoutineCheckCallback = onRoutineCheck;

      // Clear existing timer
      this.stopIntelligentRefresh();

      this.refreshTimerId = setInterval(() => {
        this.performIntelligentRefresh(onDayChange, onRoutineCheck);
      }, this.refreshInterval);

      console.log('Intelligent refresh started with interval:', interval);
    },

    /**
     * Stop intelligent refresh timer
     */
    stopIntelligentRefresh() {
      if (this.refreshTimerId) {
        clearInterval(this.refreshTimerId);
        this.refreshTimerId = null;
        this.isRefreshActive = false;
        console.log('Intelligent refresh stopped');
      }
    },

    /**
     * Perform intelligent refresh logic
     * @param {Function} onDayChange - Callback when day changes
     * @param {Function} onRoutineCheck - Callback for routine item checks
     */
    performIntelligentRefresh(onDayChange, onRoutineCheck) {
      const currentDate = moment().format('DD-MM-YYYY');

      // Check if day has changed
      if (this.lastRefreshDate !== currentDate) {
        console.log('Day changed detected:', this.lastRefreshDate, '→', currentDate);
        this.lastRefreshDate = currentDate;

        // Update component date if it exists
        if (this.date && this.date !== currentDate) {
          this.date = currentDate;
        }

        // Call day change callback
        if (onDayChange && typeof onDayChange === 'function') {
          onDayChange(currentDate);
        }

        // Refresh Apollo queries if available
        this.refreshApolloQueries();
        return;
      }

      // Check routine items for intelligent refresh
      if (onRoutineCheck && typeof onRoutineCheck === 'function') {
        onRoutineCheck();
      } else {
        this.checkRoutineItemsForRefresh();
      }
    },

    /**
     * Check routine items to determine if refresh is needed
     */
    checkRoutineItemsForRefresh() {
      if (!this.tasklist || !Array.isArray(this.tasklist)) {
        return;
      }

      const now = moment();
      let shouldRefresh = false;
      let nextRefreshIn = null;

      // Use array methods instead of for...of loop
      const activeTasks = this.tasklist.filter((task) => !task.ticked && !task.passed);

      activeTasks.find((task) => {
        const taskTime = moment(task.time, 'HH:mm');
        const minutesToTask = taskTime.diff(now, 'minutes');

        // Check if task is within 1 hour (60 minutes) of beginning
        if (minutesToTask <= 60 && minutesToTask >= -30) {
          shouldRefresh = true;
          console.log(`Task "${task.name}" is within refresh window: ${minutesToTask} minutes`);

          // Calculate next optimal refresh time
          if (minutesToTask > 0) {
            nextRefreshIn = Math.min(nextRefreshIn || Infinity, minutesToTask * 60 * 1000);
          }
          return true;
        }
        return false;
      });

      if (shouldRefresh) {
        console.log('Intelligent refresh triggered by routine item proximity');
        this.refreshApolloQueries();

        // Adjust refresh interval if needed
        if (nextRefreshIn && nextRefreshIn < this.refreshInterval) {
          this.adjustRefreshInterval(nextRefreshIn);
        }
      }
    },

    /**
     * Adjust refresh interval for optimal timing
     * @param {number} newInterval - New interval in milliseconds
     */
    adjustRefreshInterval(newInterval) {
      const minInterval = 10 * 1000; // Minimum 10 seconds
      const adjustedInterval = Math.max(newInterval, minInterval);

      if (adjustedInterval !== this.refreshInterval) {
        console.log('Adjusting refresh interval:', this.refreshInterval, '→', adjustedInterval);
        this.refreshInterval = adjustedInterval;

        // Restart timer with new interval
        this.stopIntelligentRefresh();
        this.startIntelligentRefresh({
          interval: adjustedInterval,
          onDayChange: this.onDayChangeCallback,
          onRoutineCheck: this.onRoutineCheckCallback,
        });
      }
    },

    /**
     * Refresh all Apollo queries in the component
     */
    refreshApolloQueries() {
      try {
        if (this.$apollo && this.$apollo.queries) {
          Object.keys(this.$apollo.queries).forEach((queryName) => {
            const query = this.$apollo.queries[queryName];
            if (query && typeof query.refetch === 'function') {
              console.log(`Refreshing Apollo query: ${queryName}`);
              query.refetch();
            }
          });
        }
      } catch (error) {
        console.warn('Error refreshing Apollo queries:', error);
      }
    },

    /**
     * Get next routine item that needs attention
     * @returns {Object|null} Next routine item or null
     */
    getNextRoutineItem() {
      if (!this.tasklist || !Array.isArray(this.tasklist)) {
        return null;
      }

      const now = moment();
      let nextItem = null;
      let smallestDiff = Infinity;

      // Use array methods instead of for...of loop
      const activeTasks = this.tasklist.filter((task) => !task.ticked && !task.passed);

      activeTasks.forEach((task) => {
        const taskTime = moment(task.time, 'HH:mm');
        const minutesToTask = taskTime.diff(now, 'minutes');

        // Find the nearest upcoming or recently started task
        if (minutesToTask >= -30 && minutesToTask < smallestDiff) {
          smallestDiff = minutesToTask;
          nextItem = {
            ...task,
            minutesToStart: minutesToTask,
            isStartingSoon: minutesToTask <= 60 && minutesToTask >= 0,
            isActive: minutesToTask <= 0 && minutesToTask >= -30,
          };
        }
      });

      return nextItem;
    },
  },

  /**
   * Component lifecycle - clean up timer
   */
  beforeDestroy() {
    this.stopIntelligentRefresh();
  },
};
