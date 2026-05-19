<template>
  <v-toolbar-title class="atom-toolbar-title" v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-toolbar-title>
</template>

<script>
/**
 * AtomToolbarTitle - Atomic wrapper for Vuetify v-toolbar-title
 *
 * A component for displaying the title text within a toolbar.
 * Passes all attributes and events to the underlying v-toolbar-title.
 *
 * @example
 * <atom-toolbar-title>My Page Title</atom-toolbar-title>
 */
export default {
  name: 'AtomToolbarTitle',
  inheritAttrs: false,
};
</script>

<style>
.v-toolbar__content .atom-toolbar-title.v-toolbar__title {
  display: flex;
  align-items: center;
  line-height: 1;
}
</style>
