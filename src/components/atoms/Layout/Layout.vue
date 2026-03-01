<template>
  <v-layout
    :align-baseline="alignBaseline"
    :align-center="alignCenter"
    :align-content-center="alignContentCenter"
    :align-content-end="alignContentEnd"
    :align-content-space-around="alignContentSpaceAround"
    :align-content-space-between="alignContentSpaceBetween"
    :align-content-start="alignContentStart"
    :align-end="alignEnd"
    :align-start="alignStart"
    :column="column"
    :d-flex="dFlex"
    :fill-height="fillHeight"
    :justify-center="justifyCenter"
    :justify-end="justifyEnd"
    :justify-space-around="justifySpaceAround"
    :justify-space-between="justifySpaceBetween"
    :justify-start="justifyStart"
    :reverse="reverse"
    :row="row"
    :wrap="wrap"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-layout>
</template>

<script>
export default {
  name: 'AtomLayout',
  inheritAttrs: false,
  props: {
    alignBaseline: { type: Boolean, default: false },
    alignCenter: { type: Boolean, default: false },
    alignContentCenter: { type: Boolean, default: false },
    alignContentEnd: { type: Boolean, default: false },
    alignContentSpaceAround: { type: Boolean, default: false },
    alignContentSpaceBetween: { type: Boolean, default: false },
    alignContentStart: { type: Boolean, default: false },
    alignEnd: { type: Boolean, default: false },
    alignStart: { type: Boolean, default: false },
    column: { type: Boolean, default: false },
    dFlex: { type: Boolean, default: false },
    fillHeight: { type: Boolean, default: false },
    justifyCenter: { type: Boolean, default: false },
    justifyEnd: { type: Boolean, default: false },
    justifySpaceAround: { type: Boolean, default: false },
    justifySpaceBetween: { type: Boolean, default: false },
    justifyStart: { type: Boolean, default: false },
    reverse: { type: Boolean, default: false },
    row: { type: Boolean, default: false },
    wrap: { type: Boolean, default: false },
  },
};
</script>
