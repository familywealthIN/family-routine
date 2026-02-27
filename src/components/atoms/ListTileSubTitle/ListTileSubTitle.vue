<template>
  <v-list-tile-sub-title :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-list-tile-sub-title>
</template>

<script>
export default {
  name: 'AtomListTileSubTitle',
  inheritAttrs: false,
};
</script>
