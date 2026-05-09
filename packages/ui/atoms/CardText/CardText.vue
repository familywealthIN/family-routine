<template>
  <v-card-text :class="$attrs.class" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-card-text>
</template>

<script>
export default {
  name: 'AtomCardText',
  inheritAttrs: false,
};
</script>
