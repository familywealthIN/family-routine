<template>
  <v-sparkline v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-sparkline>
</template>

<script>
/**
 * AtomSparkline - Atomic wrapper for Vuetify v-sparkline
 *
 * A component for displaying sparkline charts (miniature line graphs).
 * Passes all attributes and events to the underlying v-sparkline.
 *
 * @example
 * <atom-sparkline
 *   :value="[0, 2, 5, 9, 5, 10, 3, 5, 0, 0, 1, 8, 2, 9, 0]"
 *   smooth
 *   color="primary"
 *   line-width="2"
 *   auto-draw
 * />
 */
export default {
  name: 'AtomSparkline',
  inheritAttrs: false,
};
</script>

<style scoped>
/* Sparkline styles can be customized here */
</style>
