<template>
  <v-card-actions :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-card-actions>
</template>

<script>
export default {
  name: 'AtomCardActions',
  inheritAttrs: false,
};
</script>
