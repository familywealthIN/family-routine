/**
 * Intelligent Refresh Mixin
 * Provides intelligent refresh functionality for components with routine items
 */

import moment from 'moment';
import { pendingMutations } from '../utils/pendingMutations';

export default {
  data() {
    return {
      refreshTimerId: null,
      lastRefreshDate: null,
      refreshInterval: 30 * 1000, // 30 seconds default
      isRefreshActive: false,
      onDayChangeCallback: null,
      onRoutineCheckCallback: null,
      dayChangeWakeupsWired: false,
      onWakeCheckDay: null,
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

      // The timer alone cannot see a rollover that happened while the app was
      // suspended. Idempotent, so the restart in adjustRefreshInterval is free.
      this.wireDayChangeWakeups();

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
      // The day check runs FIRST, before the pending-mutation gate below.
      //
      // It used to sit behind that gate, which meant a single stuck key in
      // `pendingMutations` (it has no TTL — a mutation that never settles holds
      // its key forever) permanently disabled the rollover: every subsequent
      // tick returned early and the dashboard stayed on yesterday until the app
      // was killed and relaunched. A day change is also not the kind of thing
      // that should ever be skipped to protect an optimistic write — the write
      // belongs to a day that is now over.
      if (this.checkDayChange(onDayChange)) return;

      // Skip the *refetch* portion while any optimistic mutation is in
      // flight — refetching mid-mutation would let a server response
      // returning pre-mutation data race-overwrite the cache and visibly
      // flicker the checkbox.
      if (!pendingMutations.empty()) {
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
     * Detect a day rollover and drive the callback. Split out of
     * `performIntelligentRefresh` so it can also be called directly the moment
     * the app becomes visible again — see `wireDayChangeWakeups`.
     *
     * @param {Function} onDayChange
     * @returns {boolean} true when the day changed (caller should stop)
     */
    checkDayChange(onDayChange = this.onDayChangeCallback) {
      const currentDate = moment().format('DD-MM-YYYY');
      if (this.lastRefreshDate === currentDate) return false;

      console.log('Day changed detected:', this.lastRefreshDate, '→', currentDate);
      this.lastRefreshDate = currentDate;

      // Update component todayDate if it exists (keeps isTodaySelected in sync)
      if (this.todayDate !== undefined) {
        this.todayDate = currentDate;
      }

      // Update component date if it exists
      if (this.date && this.date !== currentDate) {
        this.date = currentDate;
      }

      if (onDayChange && typeof onDayChange === 'function') {
        onDayChange(currentDate);
      }

      this.refreshApolloQueries();
      return true;
    },

    /**
     * Re-check the day whenever the app comes back to the foreground.
     *
     * `setInterval` is the wrong instrument on its own here: a backgrounded tab
     * is throttled to roughly once a minute, and an installed PWA on iOS or
     * Android is suspended outright — the timer simply does not run while the
     * phone is asleep. The overwhelmingly common rollover is "user closes the
     * app at night, opens it in the morning", which is exactly the case a timer
     * never sees. Without these listeners the dashboard shows yesterday until a
     * 30s tick happens to land after resume.
     *
     * `pageshow` covers bfcache restores, where no visibility change fires at
     * all. All four are idempotent — `checkDayChange` no-ops when the date is
     * unchanged.
     */
    wireDayChangeWakeups() {
      if (this.dayChangeWakeupsWired) return;
      this.dayChangeWakeupsWired = true;

      this.onWakeCheckDay = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        this.checkDayChange();
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.onWakeCheckDay);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', this.onWakeCheckDay);
        window.addEventListener('pageshow', this.onWakeCheckDay);
        window.addEventListener('online', this.onWakeCheckDay);
      }
    },

    unwireDayChangeWakeups() {
      if (!this.dayChangeWakeupsWired) return;
      this.dayChangeWakeupsWired = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.onWakeCheckDay);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', this.onWakeCheckDay);
        window.removeEventListener('pageshow', this.onWakeCheckDay);
        window.removeEventListener('online', this.onWakeCheckDay);
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
    // Not unwired in stopIntelligentRefresh: adjustRefreshInterval stops and
    // restarts the timer, and tearing the listeners down on every interval
    // change would leave a window with no rollover detection at all.
    this.unwireDayChangeWakeups();
  },
};
