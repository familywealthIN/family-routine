<template>
  <v-list-tile
    :avatar="avatar"
    :inactive="inactive"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-list-tile>
</template>

<script>
export default {
  name: 'AtomListTile',
  inheritAttrs: false,
  props: {
    avatar: { type: Boolean, default: false },
    inactive: { type: Boolean, default: false },
  },
};
</script>
