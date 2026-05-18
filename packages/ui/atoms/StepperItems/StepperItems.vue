<template>
  <v-stepper-items v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-stepper-items>
</template>

<script>
/**
 * AtomStepperItems - Vuetify stepper items wrapper atom
 *
 * This atom wraps v-stepper-items providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomStepperItems',
  inheritAttrs: false,
};
</script>
