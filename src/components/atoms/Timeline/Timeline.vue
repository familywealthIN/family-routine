<template>
  <v-timeline v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-timeline>
</template>

<script>
/**
 * AtomTimeline - Atomic wrapper for Vuetify v-timeline
 *
 * A component for displaying a timeline with items.
 * Passes all attributes and events to the underlying v-timeline.
 *
 * @example
 * <atom-timeline dense>
 *   <atom-timeline-item>Event 1</atom-timeline-item>
 *   <atom-timeline-item>Event 2</atom-timeline-item>
 * </atom-timeline>
 */
export default {
  name: 'AtomTimeline',
  inheritAttrs: false,
};
</script>

<style scoped>
/* Timeline styles can be customized here */
</style>
