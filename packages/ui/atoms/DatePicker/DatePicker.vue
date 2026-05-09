<template>
  <v-date-picker
    :value="value"
    :allowed-dates="allowedDates"
    :color="color"
    :dark="dark"
    :disabled="disabled"
    :event-color="eventColor"
    :events="events"
    :first-day-of-week="firstDayOfWeek"
    :full-width="fullWidth"
    :header-color="headerColor"
    :landscape="landscape"
    :light="light"
    :locale="locale"
    :max="max"
    :min="min"
    :multiple="multiple"
    :no-title="noTitle"
    :picker-date="pickerDate"
    :reactive="reactive"
    :readonly="readonly"
    :scrollable="scrollable"
    :show-current="showCurrent"
    :type="type"
    :width="width"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    @change="$emit('change', $event)"
    v-on="$listeners"
  >
    <slot />
  </v-date-picker>
</template>

<script>
/**
 * AtomDatePicker - Wrapper for Vuetify's v-date-picker
 * Provides a visual calendar interface for date selection
 *
 * @example
 * <AtomDatePicker
 *   v-model="selectedDate"
 *   :min="minDate"
 *   :max="maxDate"
 *   no-title
 *   scrollable
 * />
 */
export default {
  name: 'AtomDatePicker',
  inheritAttrs: false,
  props: {
    /**
     * Selected date value (v-model)
     * Format: YYYY-MM-DD (ISO format for v-date-picker)
     */
    value: {
      type: [String, Array],
      default: '',
    },
    /**
     * Function to restrict which dates can be selected
     */
    allowedDates: {
      type: Function,
      default: null,
    },
    /**
     * Primary color
     */
    color: {
      type: String,
      default: 'primary',
    },
    /**
     * Dark theme
     */
    dark: {
      type: Boolean,
      default: false,
    },
    /**
     * Disabled state
     */
    disabled: {
      type: Boolean,
      default: false,
    },
    /**
     * Color for event dots
     */
    eventColor: {
      type: [String, Function, Object],
      default: 'warning',
    },
    /**
     * Array of dates or function to mark with dots
     */
    events: {
      type: [Array, Function, Object],
      default: null,
    },
    /**
     * First day of week (0 = Sunday, 1 = Monday, etc.)
     */
    firstDayOfWeek: {
      type: [String, Number],
      default: 0,
    },
    /**
     * Full width mode
     */
    fullWidth: {
      type: Boolean,
      default: false,
    },
    /**
     * Header background color
     */
    headerColor: {
      type: String,
      default: '',
    },
    /**
     * Landscape orientation
     */
    landscape: {
      type: Boolean,
      default: false,
    },
    /**
     * Light theme
     */
    light: {
      type: Boolean,
      default: false,
    },
    /**
     * Locale for date formatting
     */
    locale: {
      type: String,
      default: 'en-us',
    },
    /**
     * Maximum selectable date (YYYY-MM-DD)
     */
    max: {
      type: String,
      default: '',
    },
    /**
     * Minimum selectable date (YYYY-MM-DD)
     */
    min: {
      type: String,
      default: '',
    },
    /**
     * Allow multiple date selection
     */
    multiple: {
      type: Boolean,
      default: false,
    },
    /**
     * Hide the title/header
     */
    noTitle: {
      type: Boolean,
      default: false,
    },
    /**
     * Displayed month/year (YYYY-MM)
     */
    pickerDate: {
      type: String,
      default: '',
    },
    /**
     * Update when clicking year/month
     */
    reactive: {
      type: Boolean,
      default: false,
    },
    /**
     * Read-only mode
     */
    readonly: {
      type: Boolean,
      default: false,
    },
    /**
     * Allow scrolling through months
     */
    scrollable: {
      type: Boolean,
      default: false,
    },
    /**
     * Show current date indicator
     */
    showCurrent: {
      type: [Boolean, String],
      default: true,
    },
    /**
     * Picker type: 'date' or 'month'
     */
    type: {
      type: String,
      default: 'date',
    },
    /**
     * Picker width
     */
    width: {
      type: [Number, String],
      default: 290,
    },
  },
};
</script>

<style scoped>
/* Consistent styling for date picker */
::v-deep .v-picker {
  border-radius: 8px;
}

::v-deep .v-date-picker-table {
  height: auto;
}
</style>
