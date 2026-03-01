<template>
  <v-calendar ref="calendar" v-bind="$attrs" v-on="$listeners">
    <template v-for="(_, slot) in $scopedSlots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
    <slot />
  </v-calendar>
</template>

<script>
/**
 * AtomCalendar - Atomic wrapper for Vuetify v-calendar
 *
 * A component for displaying a calendar with various views
 * (month, week, day) and event support.
 * Passes all attributes, events, and scoped slots to the underlying v-calendar.
 *
 * @example
 * <atom-calendar
 *   v-model="selectedDate"
 *   type="month"
 *   color="primary"
 *   @click:date="handleDateClick"
 * >
 *   <template v-slot:day="{ date }">
 *     {{ date }}
 *   </template>
 * </atom-calendar>
 */
export default {
  name: 'AtomCalendar',
  inheritAttrs: false,
  methods: {
    /**
     * Navigate to the previous period
     */
    prev() {
      if (this.$refs.calendar && this.$refs.calendar.prev) {
        this.$refs.calendar.prev();
      }
    },
    /**
     * Navigate to the next period
     */
    next() {
      if (this.$refs.calendar && this.$refs.calendar.next) {
        this.$refs.calendar.next();
      }
    },
  },
};
</script>

<style scoped>
/* Calendar styles can be customized here */
</style>
