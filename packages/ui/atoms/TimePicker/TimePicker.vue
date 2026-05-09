<template>
  <v-time-picker v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-time-picker>
</template>

<script>
/**
 * AtomTimePicker - Vuetify time picker wrapper atom
 *
 * This atom wraps v-time-picker providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomTimePicker',
  inheritAttrs: false,
};
</script>
