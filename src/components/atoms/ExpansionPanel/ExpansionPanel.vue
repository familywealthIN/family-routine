<template>
  <v-expansion-panel v-model="localValue" v-bind="$attrs" v-on="$listeners">
    <slot></slot>
  </v-expansion-panel>
</template>

<script>
export default {
  name: 'AtomExpansionPanel',
  props: {
    value: {
      type: [Number, Array],
      default: undefined,
    },
  },
  computed: {
    localValue: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },
  },
};
</script>
