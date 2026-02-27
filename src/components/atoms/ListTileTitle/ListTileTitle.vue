<template>
  <v-list-tile-title :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-list-tile-title>
</template>

<script>
export default {
  name: 'AtomListTileTitle',
  inheritAttrs: false,
};
</script>
