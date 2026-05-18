<template>
  <v-textarea
    :value="value"
    :label="label"
    :placeholder="placeholder"
    :hint="hint"
    :persistent-hint="persistentHint"
    :color="color"
    :disabled="disabled"
    :readonly="readonly"
    :loading="loading"
    :clearable="clearable"
    :counter="counter"
    :maxlength="maxlength"
    :rows="rows"
    :row-height="rowHeight"
    :auto-grow="autoGrow"
    :no-resize="noResize"
    :prepend-icon="prependIcon"
    :prepend-inner-icon="prependInnerIcon"
    :append-icon="appendIcon"
    :append-outer-icon="appendOuterIcon"
    :rules="rules"
    :error="error"
    :error-messages="errorMessages"
    :success="success"
    :success-messages="successMessages"
    :hide-details="hideDetails"
    :single-line="singleLine"
    :solo="solo"
    :solo-inverted="soloInverted"
    :flat="flat"
    :filled="filled"
    :outline="outline"
    :box="box"
    :dark="dark"
    :light="light"
    :class="textareaClass"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    v-on="filteredListeners"
  >
    <template v-if="$slots.prepend" #prepend>
      <slot name="prepend" />
    </template>
    <template v-if="$slots.append" #append>
      <slot name="append" />
    </template>
  </v-textarea>
</template>

<script>
export default {
  name: 'AtomTextarea',
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number],
      default: '',
    },
    label: {
      type: String,
      default: undefined,
    },
    placeholder: {
      type: String,
      default: undefined,
    },
    hint: {
      type: String,
      default: undefined,
    },
    persistentHint: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: undefined,
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
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    counter: {
      type: [Boolean, Number, String],
      default: undefined,
    },
    maxlength: {
      type: [Number, String],
      default: undefined,
    },
    rows: {
      type: [Number, String],
      default: 5,
    },
    rowHeight: {
      type: [Number, String],
      default: 24,
    },
    autoGrow: {
      type: Boolean,
      default: false,
    },
    noResize: {
      type: Boolean,
      default: false,
    },
    prependIcon: {
      type: String,
      default: undefined,
    },
    prependInnerIcon: {
      type: String,
      default: undefined,
    },
    appendIcon: {
      type: String,
      default: undefined,
    },
    appendOuterIcon: {
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
    singleLine: {
      type: Boolean,
      default: false,
    },
    solo: {
      type: Boolean,
      default: false,
    },
    soloInverted: {
      type: Boolean,
      default: false,
    },
    flat: {
      type: Boolean,
      default: false,
    },
    filled: {
      type: Boolean,
      default: false,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    box: {
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
    textareaClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
  computed: {
    filteredListeners() {
      const { input, ...listeners } = this.$listeners;
      return listeners;
    },
  },
};
</script>
