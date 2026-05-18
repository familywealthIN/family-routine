<template>
  <v-avatar
    :size="size"
    :color="color"
    :tile="tile"
    :left="left"
    :right="right"
    :class="avatarClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot>
      <img v-if="src" :src="src" :alt="alt" />
      <v-icon v-else-if="icon" :color="iconColor">{{ icon }}</v-icon>
      <span v-else-if="text" :class="textClass">{{ text }}</span>
    </slot>
  </v-avatar>
</template>

<script>
export default {
  name: 'AtomAvatar',
  inheritAttrs: false,
  props: {
    size: {
      type: [Number, String],
      default: 48,
    },
    color: {
      type: String,
      default: undefined,
    },
    tile: {
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
    src: {
      type: String,
      default: undefined,
    },
    alt: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: undefined,
    },
    iconColor: {
      type: String,
      default: 'white',
    },
    text: {
      type: String,
      default: undefined,
    },
    textClass: {
      type: [String, Array, Object],
      default: 'white--text',
    },
    avatarClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
