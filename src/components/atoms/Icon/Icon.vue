<template>
  <v-icon
    :color="color"
    :size="size"
    :small="small"
    :medium="medium"
    :large="large"
    :x-large="xLarge"
    :left="left"
    :right="right"
    :disabled="disabled"
    :dark="dark"
    :light="light"
    :class="iconClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-icon>
</template>

<script>
export default {
  name: 'AtomIcon',
  inheritAttrs: false,
  props: {
    color: {
      type: String,
      default: undefined,
    },
    size: {
      type: [Number, String],
      default: undefined,
    },
    small: {
      type: Boolean,
      default: false,
    },
    medium: {
      type: Boolean,
      default: false,
    },
    large: {
      type: Boolean,
      default: false,
    },
    xLarge: {
      type: Boolean,
      default: false,
    },
    left: {
      type: Boolean,
      default: false,
    },
    right: {
      type: Boolean,
      default: false,
    },
    disabled: {
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
    iconClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
