<template>
  <v-alert
    :value="value"
    :type="type"
    :color="color"
    :icon="icon"
    :dismissible="dismissible"
    :outline="outline"
    :transition="transition"
    :mode="mode"
    :origin="origin"
    :dark="dark"
    :light="light"
    :class="alertClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </v-alert>
</template>

<script>
export default {
  name: 'AtomAlert',
  inheritAttrs: false,
  props: {
    value: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      default: undefined,
      validator: (value) => ['success', 'info', 'warning', 'error'].includes(value) || value === undefined,
    },
    color: {
      type: String,
      default: undefined,
    },
    icon: {
      type: [String, Boolean],
      default: undefined,
    },
    dismissible: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    transition: {
      type: String,
      default: undefined,
    },
    mode: {
      type: String,
      default: undefined,
    },
    origin: {
      type: String,
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
    alertClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
