<template>
  <v-timeline-item v-bind="$attrs" v-on="$listeners">
    <template v-for="(_, slot) in $scopedSlots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
    <slot />
  </v-timeline-item>
</template>

<script>
/**
 * AtomTimelineItem - Atomic wrapper for Vuetify v-timeline-item
 *
 * A component for displaying an item within a timeline.
 * Supports icon slot and various customization options.
 * Passes all attributes, events, and scoped slots to the underlying v-timeline-item.
 *
 * @example
 * <atom-timeline-item color="primary" fill-dot>
 *   <template #icon>
 *     <atom-icon>check</atom-icon>
 *   </template>
 *   Event description
 * </atom-timeline-item>
 */
export default {
  name: 'AtomTimelineItem',
  inheritAttrs: false,
};
</script>

<style scoped>
/* Timeline item styles can be customized here */
</style>
