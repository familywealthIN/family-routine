<template>
  <v-expand-transition v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-expand-transition>
</template>

<script>
export default {
  name: 'AtomExpandTransition',
};
</script>
