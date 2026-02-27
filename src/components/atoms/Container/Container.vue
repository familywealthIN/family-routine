<template>
  <v-container
    :fluid="fluid"
    :grid-list-xs="gridListXs"
    :grid-list-sm="gridListSm"
    :grid-list-md="gridListMd"
    :grid-list-lg="gridListLg"
    :grid-list-xl="gridListXl"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-container>
</template>

<script>
export default {
  name: 'AtomContainer',
  inheritAttrs: false,
  props: {
    fluid: { type: Boolean, default: false },
    gridListXs: { type: Boolean, default: false },
    gridListSm: { type: Boolean, default: false },
    gridListMd: { type: Boolean, default: false },
    gridListLg: { type: Boolean, default: false },
    gridListXl: { type: Boolean, default: false },
  },
};
</script>
