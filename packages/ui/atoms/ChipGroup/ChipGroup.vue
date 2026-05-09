<template>
  <v-chip-group v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-chip-group>
</template>

<script>
/**
 * AtomChipGroup - Vuetify chip group wrapper atom
 *
 * This atom wraps v-chip-group providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomChipGroup',
  inheritAttrs: false,
};
</script>
