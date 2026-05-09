<template>
  <v-list-tile-action-text v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-list-tile-action-text>
</template>

<script>
/**
 * AtomListTileActionText - Vuetify list tile action text wrapper atom
 *
 * This atom wraps v-list-tile-action-text providing a consistent
 * atomic design interface while maintaining full Vuetify functionality.
 */
export default {
  name: 'AtomListTileActionText',
  inheritAttrs: false,
};
</script>
