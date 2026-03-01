<template>
  <v-fab-transition v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-fab-transition>
</template>

<script>
/**
 * AtomFabTransition - Vuetify fab transition wrapper atom
 *
 * This atom wraps v-fab-transition providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomFabTransition',
  inheritAttrs: false,
};
</script>
