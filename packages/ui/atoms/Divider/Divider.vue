<template>
  <v-divider
    :vertical="vertical"
    :inset="inset"
    :dark="dark"
    :light="light"
    :class="dividerClass"
    v-bind="$attrs"
    v-on="$listeners"
  />
</template>

<script>
export default {
  name: 'AtomDivider',
  inheritAttrs: false,
  props: {
    vertical: {
      type: Boolean,
      default: false,
    },
    inset: {
      type: Boolean,
      default: false,
    },
    dark: {
      type: Boolean,
      default: false,
    },
    light: {
      type: Boolean,
      default: false,
    },
    dividerClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
