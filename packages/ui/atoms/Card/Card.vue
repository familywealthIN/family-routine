<template>
  <v-card
    :class="cardClasses"
    :color="color"
    :dark="dark"
    :flat="flat"
    :height="height"
    :hover="hover"
    :img="img"
    :light="light"
    :max-height="maxHeight"
    :max-width="maxWidth"
    :min-height="minHeight"
    :min-width="minWidth"
    :raised="raised"
    :tile="tile"
    :width="width"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-card>
</template>

<script>
export default {
  name: 'AtomCard',
  inheritAttrs: false,
  props: {
    color: {
      type: String,
      default: undefined,
    },
    dark: {
      type: Boolean,
      default: false,
    },
    flat: {
      type: Boolean,
      default: false,
    },
    height: {
      type: [Number, String],
      default: undefined,
    },
    hover: {
      type: Boolean,
      default: false,
    },
    img: {
      type: String,
      default: undefined,
    },
    light: {
      type: Boolean,
      default: false,
    },
    maxHeight: {
      type: [Number, String],
      default: undefined,
    },
    maxWidth: {
      type: [Number, String],
      default: undefined,
    },
    minHeight: {
      type: [Number, String],
      default: undefined,
    },
    minWidth: {
      type: [Number, String],
      default: undefined,
    },
    raised: {
      type: Boolean,
      default: false,
    },
    tile: {
      type: Boolean,
      default: false,
    },
    width: {
      type: [Number, String],
      default: undefined,
    },
  },
  computed: {
    cardClasses() {
      return this.$attrs.class || '';
    },
  },
};
</script>
