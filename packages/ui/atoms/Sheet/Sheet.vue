<template>
  <v-sheet v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-sheet>
</template>

<script>
/**
 * AtomSheet - Atomic wrapper for Vuetify v-sheet
 *
 * A simple component that provides a surface for content.
 * It's used as a container for other components.
 * Passes all attributes and events to the underlying v-sheet.
 *
 * @example
 * <atom-sheet elevation="2">
 *   Content here
 * </atom-sheet>
 *
 * @example colored
 * <atom-sheet color="grey lighten-3" class="pa-3">
 *   Colored sheet
 * </atom-sheet>
 */
export default {
  name: 'AtomSheet',
  inheritAttrs: false,
};
</script>

<style scoped>
/* Sheet styles can be customized here */
</style>
