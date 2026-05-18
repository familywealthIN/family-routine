<template>
  <v-stepper v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-stepper>
</template>

<script>
/**
 * AtomStepper - Vuetify stepper wrapper atom
 *
 * This atom wraps v-stepper providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomStepper',
  inheritAttrs: false,
};
</script>
