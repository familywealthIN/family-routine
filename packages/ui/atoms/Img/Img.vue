<template>
  <v-img v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-img>
</template>

<script>
/**
 * AtomImg - Atomic wrapper for Vuetify v-img
 *
 * A component for displaying images with lazy loading, gradients,
 * and aspect ratio control built in.
 * Passes all attributes and events to the underlying v-img.
 *
 * @example
 * <atom-img src="path/to/image.jpg" aspect-ratio="1.7" />
 *
 * @example with gradient
 * <atom-img
 *   src="path/to/image.jpg"
 *   gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
 * >
 *   <div>Overlay Content</div>
 * </atom-img>
 */
export default {
  name: 'AtomImg',
  inheritAttrs: false,
};
</script>

<style scoped>
/* Image styles can be customized here */
</style>
