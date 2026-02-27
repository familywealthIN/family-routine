<template>
  <v-menu
    v-model="internalValue"
    :bottom="bottom"
    :close-on-click="closeOnClick"
    :close-on-content-click="closeOnContentClick"
    :disabled="disabled"
    :left="left"
    :offset-x="offsetX"
    :offset-y="offsetY"
    :open-on-hover="openOnHover"
    :origin="origin"
    :right="right"
    :top="top"
    :transition="transition"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template v-slot:activator="{ on }">
      <slot name="activator" :on="on"></slot>
    </template>
    <slot></slot>
  </v-menu>
</template>

<script>
export default {
  name: 'AtomMenu',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: false },
    bottom: { type: Boolean, default: false },
    closeOnClick: { type: Boolean, default: true },
    closeOnContentClick: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    left: { type: Boolean, default: false },
    offsetX: { type: Boolean, default: false },
    offsetY: { type: Boolean, default: false },
    openOnHover: { type: Boolean, default: false },
    origin: { type: String, default: 'top left' },
    right: { type: Boolean, default: false },
    top: { type: Boolean, default: false },
    transition: { type: String, default: 'v-menu-transition' },
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
