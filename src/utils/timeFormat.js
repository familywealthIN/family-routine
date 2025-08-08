/**
 * Time formatting utilities
 * Handles 12-hour and 24-hour time format conversion based on user preferences
 */

import moment from 'moment';

/**
 * Get the user's preferred time format from localStorage
 * @returns {string} '12' or '24'
 */
export function getUserTimeFormat() {
    return localStorage.getItem('timeFormat') || '24';
}

/**
 * Format time string based on user preference
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @param {string} format - Optional format override ('12' or '24')
 * @returns {string} Formatted time string
 */
export function formatTime(timeString, format = null) {
    if (!timeString) return '';

    const userFormat = format || getUserTimeFormat();

    try {
        const time = moment(timeString, 'HH:mm');

        if (!time.isValid()) {
            return timeString; // Return original if parsing fails
        }

        if (userFormat === '12') {
            return time.format('h:mm A'); // 12-hour format with AM/PM
        }
        return time.format('HH:mm'); // 24-hour format
    } catch (error) {
        console.warn('Error formatting time:', error);
        return timeString; // Return original if error occurs
    }
}

/**
 * Format time for display in components
 * @param {string} timeString - Time in HH:mm format
 * @returns {string} Formatted time string
 */
export function displayTime(timeString) {
    return formatTime(timeString);
}

/**
 * Convert 12-hour format to 24-hour format for storage
 * @param {string} timeString - Time in 12-hour format (h:mm A)
 * @returns {string} Time in 24-hour format (HH:mm)
 */
export function convertTo24Hour(timeString) {
    if (!timeString) return '';

    try {
        const time = moment(timeString, ['h:mm A', 'hh:mm A', 'H:mm', 'HH:mm']);

        if (!time.isValid()) {
            return timeString;
        }

        return time.format('HH:mm');
    } catch (error) {
        console.warn('Error converting to 24-hour format:', error);
        return timeString;
    }
}

/**
 * Mixin for Vue components to use time formatting
 */
export const TimeFormatMixin = {
    data() {
        return {
            userTimeFormat: getUserTimeFormat(),
        };
    },

    methods: {
        formatTime(timeString, format = null) {
            return formatTime(timeString, format || this.userTimeFormat);
        },

        displayTime(timeString) {
            return this.formatTime(timeString);
        },

        updateTimeFormat() {
            this.userTimeFormat = getUserTimeFormat();
            this.$forceUpdate(); // Force re-render to update time displays
        },
    },

    mounted() {
        // Listen for time format changes
        this.$root.$on('timeFormatChanged', this.updateTimeFormat);
    },

    beforeDestroy() {
        // Clean up event listener
        this.$root.$off('timeFormatChanged', this.updateTimeFormat);
    },
};
