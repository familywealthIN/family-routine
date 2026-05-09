<template>
  <v-dialog
    v-model="internalValue"
    :fullscreen="fullscreen"
    :hide-overlay="hideOverlay"
    :max-width="maxWidth"
    :persistent="persistent"
    :scrollable="scrollable"
    :width="width"
    :transition="transition"
    :content-class="contentClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-dialog>
</template>

<script>
export default {
  name: 'AtomDialog',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: false },
    fullscreen: { type: Boolean, default: false },
    hideOverlay: { type: Boolean, default: false },
    maxWidth: { type: [String, Number], default: undefined },
    persistent: { type: Boolean, default: false },
    scrollable: { type: Boolean, default: false },
    width: { type: [String, Number], default: undefined },
    transition: { type: String, default: 'dialog-transition' },
    contentClass: { type: String, default: undefined },
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
