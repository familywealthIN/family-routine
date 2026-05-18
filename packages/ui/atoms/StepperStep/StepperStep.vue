<template>
  <v-stepper-step v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-stepper-step>
</template>

<script>
/**
 * AtomStepperStep - Vuetify stepper step wrapper atom
 *
 * This atom wraps v-stepper-step providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomStepperStep',
  inheritAttrs: false,
};
</script>
