<template>
  <v-list
    :dense="dense"
    :expand="expand"
    :flat="flat"
    :subheader="subheader"
    :three-line="threeLine"
    :two-line="twoLine"
    :class="$attrs.class"
    :style="$attrs.style"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-list>
</template>

<script>
export default {
  name: 'AtomList',
  inheritAttrs: false,
  props: {
    dense: { type: Boolean, default: false },
    expand: { type: Boolean, default: false },
    flat: { type: Boolean, default: false },
    subheader: { type: Boolean, default: false },
    threeLine: { type: Boolean, default: false },
    twoLine: { type: Boolean, default: false },
  },
};
</script>
