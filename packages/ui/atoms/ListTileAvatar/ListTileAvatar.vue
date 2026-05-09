<template>
  <v-list-tile-avatar :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-list-tile-avatar>
</template>

<script>
export default {
  name: 'AtomListTileAvatar',
  inheritAttrs: false,
};
</script>
