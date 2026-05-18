<template>
  <v-switch
    :input-value="value"
    :label="label"
    :color="color"
    :disabled="disabled"
    :readonly="readonly"
    :loading="loading"
    :true-value="trueValue"
    :false-value="falseValue"
    :hint="hint"
    :persistent-hint="persistentHint"
    :prepend-icon="prependIcon"
    :append-icon="appendIcon"
    :rules="rules"
    :error="error"
    :error-messages="errorMessages"
    :success="success"
    :success-messages="successMessages"
    :hide-details="hideDetails"
    :inset="inset"
    :flat="flat"
    :dark="dark"
    :light="light"
    :class="switchClass"
    v-bind="$attrs"
    @change="handleChange"
    v-on="filteredListeners"
  >
    <template v-if="$slots.label" #label>
      <slot name="label" />
    </template>
  </v-switch>
</template>

<script>
export default {
  name: 'AtomSwitch',
  inheritAttrs: false,
  model: {
    prop: 'value',
    event: 'input',
  },
  props: {
    value: {
      type: [Boolean, String, Number],
      default: false,
    },
    label: {
      type: String,
      default: undefined,
    },
    color: {
      type: String,
      default: 'primary',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: [Boolean, String],
      default: false,
    },
    trueValue: {
      type: [Boolean, String, Number],
      default: true,
    },
    falseValue: {
      type: [Boolean, String, Number],
      default: false,
    },
    hint: {
      type: String,
      default: undefined,
    },
    persistentHint: {
      type: Boolean,
      default: false,
    },
    prependIcon: {
      type: String,
      default: undefined,
    },
    appendIcon: {
      type: String,
      default: undefined,
    },
    rules: {
      type: Array,
      default: () => [],
    },
    error: {
      type: Boolean,
      default: false,
    },
    errorMessages: {
      type: [String, Array],
      default: () => [],
    },
    success: {
      type: Boolean,
      default: false,
    },
    successMessages: {
      type: [String, Array],
      default: () => [],
    },
    hideDetails: {
      type: [Boolean, String],
      default: false,
    },
    inset: {
      type: Boolean,
      default: false,
    },
    flat: {
      type: Boolean,
      default: false,
    },
    dark: {
      type: Boolean,
      default: false,
    },
    light: {
      type: Boolean,
      default: false,
    },
    switchClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
  computed: {
    filteredListeners() {
      const { input, change, ...listeners } = this.$listeners;
      return listeners;
    },
  },
  methods: {
    handleChange(value) {
      this.$emit('input', value);
      this.$emit('change', value);
    },
  },
};
</script>
