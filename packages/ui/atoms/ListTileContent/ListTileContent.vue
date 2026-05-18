<template>
  <v-list-tile-content :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-list-tile-content>
</template>

<script>
export default {
  name: 'AtomListTileContent',
  inheritAttrs: false,
};
</script>
