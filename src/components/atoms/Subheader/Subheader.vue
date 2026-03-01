<template>
  <v-subheader :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-subheader>
</template>

<script>
export default {
  name: 'AtomSubheader',
  inheritAttrs: false,
};
</script>
