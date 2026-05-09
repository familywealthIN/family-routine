<template>
  <v-btn-toggle
    v-model="internalValue"
    :mandatory="mandatory"
    :multiple="multiple"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot></slot>
  </v-btn-toggle>
</template>

<script>
export default {
  name: 'AtomBtnToggle',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number, Array], default: undefined },
    mandatory: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
  },
  computed: {
    internalValue: {
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
