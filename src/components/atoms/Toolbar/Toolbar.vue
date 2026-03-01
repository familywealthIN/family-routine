<template>
  <v-toolbar
    :absolute="absolute"
    :card="card"
    :clipped-left="clippedLeft"
    :clipped-right="clippedRight"
    :color="color"
    :dark="dark"
    :dense="dense"
    :extended="extended"
    :extension-height="extensionHeight"
    :flat="flat"
    :floating="floating"
    :height="height"
    :light="light"
    :prominent="prominent"
    :tabs="tabs"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-toolbar>
</template>

<script>
export default {
  name: 'AtomToolbar',
  inheritAttrs: false,
  props: {
    absolute: { type: Boolean, default: false },
    card: { type: Boolean, default: false },
    clippedLeft: { type: Boolean, default: false },
    clippedRight: { type: Boolean, default: false },
    color: { type: String, default: undefined },
    dark: { type: Boolean, default: false },
    dense: { type: Boolean, default: false },
    extended: { type: Boolean, default: false },
    extensionHeight: { type: [Number, String], default: undefined },
    flat: { type: Boolean, default: false },
    floating: { type: Boolean, default: false },
    height: { type: [Number, String], default: undefined },
    light: { type: Boolean, default: false },
    prominent: { type: Boolean, default: false },
    tabs: { type: Boolean, default: false },
  },
};
</script>
