<template>
  <v-progress-circular
    :value="value"
    :size="size"
    :width="width"
    :rotate="rotate"
    :color="color"
    :indeterminate="indeterminate"
    :button="button"
    :dark="dark"
    :light="light"
    :class="progressClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </v-progress-circular>
</template>

<script>
export default {
  name: 'AtomProgressCircular',
  inheritAttrs: false,
  props: {
    value: {
      type: [Number, String],
      default: 0,
    },
    size: {
      type: [Number, String],
      default: 32,
    },
    width: {
      type: [Number, String],
      default: 4,
    },
    rotate: {
      type: [Number, String],
      default: 0,
    },
    color: {
      type: String,
      default: 'primary',
    },
    indeterminate: {
      type: Boolean,
      default: false,
    },
    button: {
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
    progressClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
