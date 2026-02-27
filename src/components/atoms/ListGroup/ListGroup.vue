<template>
  <v-list-group v-bind="$attrs" v-on="$listeners">
    <template v-slot:activator>
      <slot name="activator" />
    </template>
    <slot />
  </v-list-group>
</template>

<script>
/**
 * AtomListGroup - Atomic wrapper for Vuetify v-list-group
 *
 * A component for creating expandable groups within a list.
 * Supports activator slot and nested content.
 * Passes all attributes, events, and slots to the underlying v-list-group.
 *
 * @example
 * <atom-list-group v-model="active">
 *   <template v-slot:activator>
 *     <atom-list-tile>
 *       <atom-list-tile-title>Group Title</atom-list-tile-title>
 *     </atom-list-tile>
 *   </template>
 *   <atom-list-tile>Nested Item</atom-list-tile>
 * </atom-list-group>
 */
export default {
  name: 'AtomListGroup',
  inheritAttrs: false,
};
</script>

<style scoped>
/* List group styles can be customized here */
</style>
