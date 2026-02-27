<template>
  <v-form
    ref="form"
    v-model="internalValid"
    :lazy-validation="lazyValidation"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-form>
</template>

<script>
export default {
  name: 'AtomForm',
  inheritAttrs: false,
  props: {
    value: { type: Boolean, default: true },
    lazyValidation: { type: Boolean, default: false },
  },
  computed: {
    internalValid: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },
  },
  methods: {
    validate() {
      return this.$refs.form.validate();
    },
    reset() {
      return this.$refs.form.reset();
    },
    resetValidation() {
      return this.$refs.form.resetValidation();
    },
  },
};
</script>
