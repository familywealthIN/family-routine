<template>
  <v-card-title :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-card-title>
</template>

<script>
export default {
  name: 'AtomCardTitle',
  inheritAttrs: false,
};
</script>
