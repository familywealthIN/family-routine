<template>
  <v-btn
    :color="color"
    :disabled="disabled"
    :loading="loading"
    :outline="outline"
    :flat="flat"
    :round="round"
    :block="block"
    :small="small"
    :large="large"
    :depressed="depressed"
    :dark="dark"
    :light="light"
    :fab="fab"
    :icon="icon"
    :absolute="absolute"
    :fixed="fixed"
    :top="top"
    :bottom="bottom"
    :left="left"
    :right="right"
    :to="to"
    :href="href"
    :target="target"
    :type="type"
    :value="value"
    :class="buttonClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </v-btn>
</template>

<script>
export default {
  name: 'AtomButton',
  inheritAttrs: false,
  props: {
    color: {
      type: String,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    flat: {
      type: Boolean,
      default: false,
    },
    round: {
      type: Boolean,
      default: false,
    },
    block: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
    large: {
      type: Boolean,
      default: false,
    },
    depressed: {
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
    fab: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: Boolean,
      default: false,
    },
    absolute: {
      type: Boolean,
      default: false,
    },
    fixed: {
      type: Boolean,
      default: false,
    },
    top: {
      type: Boolean,
      default: false,
    },
    bottom: {
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
    to: {
      type: [String, Object],
      default: undefined,
    },
    href: {
      type: String,
      default: undefined,
    },
    target: {
      type: String,
      default: undefined,
    },
    type: {
      type: String,
      default: 'button',
    },
    value: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    buttonClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>

<style scoped>
/* Match global 16px border-radius for raised/colored buttons */
.v-btn:not(.v-btn--icon):not(.v-btn--fab):not(.v-btn--floating) {
  border-radius: 16px;
}

/* Preserve button group shape */
.v-btn-toggle .v-btn {
  border-radius: 0 !important;
}
.v-btn-toggle .v-btn:first-child {
  border-radius: 16px 0 0 16px !important;
}
.v-btn-toggle .v-btn:last-child {
  border-radius: 0 16px 16px 0 !important;
}
</style>
