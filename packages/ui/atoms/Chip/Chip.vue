<template>
  <v-chip
    :color="color"
    :text-color="textColor"
    :small="small"
    :label="label"
    :outline="outline"
    :selected="selected"
    :disabled="disabled"
    :close="close"
    :value="value"
    :dark="dark"
    :light="light"
    :class="chipClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </v-chip>
</template>

<script>
export default {
  name: 'AtomChip',
  inheritAttrs: false,
  props: {
    color: {
      type: String,
      default: undefined,
    },
    textColor: {
      type: String,
      default: undefined,
    },
    small: {
      type: Boolean,
      default: false,
    },
    label: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    close: {
      type: Boolean,
      default: false,
    },
    value: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    dark: {
      type: Boolean,
      default: false,
    },
    light: {
      type: Boolean,
      default: false,
    },
    chipClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
