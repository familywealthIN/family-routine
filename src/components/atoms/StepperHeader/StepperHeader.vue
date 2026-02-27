<template>
  <v-stepper-header v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-stepper-header>
</template>

<script>
/**
 * AtomStepperHeader - Vuetify stepper header wrapper atom
 *
 * This atom wraps v-stepper-header providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomStepperHeader',
  inheritAttrs: false,
};
</script>
