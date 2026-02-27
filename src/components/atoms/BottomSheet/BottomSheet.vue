<template>
  <v-bottom-sheet
    v-model="internalValue"
    :hide-overlay="hideOverlay"
    :max-width="maxWidth"
    :persistent="persistent"
    :inset="inset"
    :fullscreen="fullscreen"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-bottom-sheet>
</template>

<script>
export default {
  name: 'AtomBottomSheet',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: false },
    hideOverlay: { type: Boolean, default: false },
    maxWidth: { type: [String, Number], default: undefined },
    persistent: { type: Boolean, default: false },
    inset: { type: Boolean, default: false },
    fullscreen: { type: Boolean, default: false },
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
