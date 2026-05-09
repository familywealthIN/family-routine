<template>
  <v-tab
    :disabled="disabled"
    :ripple="ripple"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-tab>
</template>

<script>
export default {
  name: 'AtomTab',
  inheritAttrs: false,
  props: {
    disabled: { type: Boolean, default: false },
    ripple: { type: [Boolean, Object], default: true },
  },
};
</script>
