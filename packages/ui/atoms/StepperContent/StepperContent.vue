<template>
  <v-stepper-content v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-stepper-content>
</template>

<script>
/**
 * AtomStepperContent - Vuetify stepper content wrapper atom
 *
 * This atom wraps v-stepper-content providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomStepperContent',
  inheritAttrs: false,
};
</script>
