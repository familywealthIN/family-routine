<template>
  <v-progress-linear v-bind="$attrs" v-on="$listeners">
    <slot />
  </v-progress-linear>
</template>

<script>
export default {
  name: 'AtomProgressLinear',
  inheritAttrs: false,
};
</script>
