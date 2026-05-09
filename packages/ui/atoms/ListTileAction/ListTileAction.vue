<template>
  <v-list-tile-action :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-list-tile-action>
</template>

<script>
export default {
  name: 'AtomListTileAction',
  inheritAttrs: false,
};
</script>
