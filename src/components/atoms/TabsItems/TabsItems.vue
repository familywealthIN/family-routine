<template>
  <v-tabs-items
    v-model="internalValue"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-tabs-items>
</template>

<script>
export default {
  name: 'AtomTabsItems',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: undefined },
  },
  computed: {
    internalValue: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },
  },
};
</script>
