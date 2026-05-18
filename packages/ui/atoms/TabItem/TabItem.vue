<template>
  <v-tab-item
    :value="value"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-tab-item>
</template>

<script>
export default {
  name: 'AtomTabItem',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: undefined },
  },
};
</script>
