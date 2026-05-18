<template>
  <v-tabs
    v-model="internalValue"
    :centered="centered"
    :fixed-tabs="fixedTabs"
    :grow="grow"
    :icons-and-text="iconsAndText"
    :right="right"
    :show-arrows="showArrows"
    :slider-color="sliderColor"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-tabs>
</template>

<script>
export default {
  name: 'AtomTabs',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: undefined },
    centered: { type: Boolean, default: false },
    fixedTabs: { type: Boolean, default: false },
    grow: { type: Boolean, default: false },
    iconsAndText: { type: Boolean, default: false },
    right: { type: Boolean, default: false },
    showArrows: { type: Boolean, default: false },
    sliderColor: { type: String, default: undefined },
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
