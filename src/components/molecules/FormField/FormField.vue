<template>
  <div class="form-field">
    <AtomTextField
      v-if="type !== 'textarea'"
      :value="value"
      :label="label"
      :placeholder="placeholder"
      :hint="hint"
      :persistent-hint="persistentHint"
      :type="inputType"
      :color="color"
      :disabled="disabled"
      :readonly="readonly"
      :loading="loading"
      :clearable="clearable"
      :counter="counter"
      :maxlength="maxlength"
      :prefix="prefix"
      :suffix="suffix"
      :prepend-icon="prependIcon"
      :prepend-inner-icon="prependInnerIcon"
      :append-icon="computedAppendIcon"
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
      :rounded="rounded"
      :dense="dense"
      :autofocus="autofocus"
      :autocomplete="autocomplete"
      :dark="dark"
      :light="light"
      v-bind="$attrs"
      @input="$emit('input', $event)"
      @click:append="handleAppendClick"
      v-on="filteredListeners"
    >
      <template v-if="$slots.prepend" #prepend>
        <slot name="prepend" />
      </template>
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
    </AtomTextField>

    <AtomTextarea
      v-else
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
      :auto-grow="autoGrow"
      :no-resize="noResize"
      :prepend-icon="prependIcon"
      :append-icon="appendIcon"
      :rules="rules"
      :error="error"
      :error-messages="errorMessages"
      :success="success"
      :success-messages="successMessages"
      :hide-details="hideDetails"
      :solo="solo"
      :filled="filled"
      :outline="outline"
      :box="box"
      :dark="dark"
      :light="light"
      v-bind="$attrs"
      @input="$emit('input', $event)"
      v-on="filteredListeners"
    />
  </div>
</template>

<script>
import {
  AtomTextField,
  AtomTextarea,
} from '../../atoms';

export default {
  name: 'MoleculeFormField',
  components: {
    AtomTextField,
    AtomTextarea,
  },
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
    type: {
      type: String,
      default: 'text',
      validator: (value) => ['text', 'password', 'email', 'number', 'tel', 'url', 'textarea'].includes(value),
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
    prefix: {
      type: String,
      default: undefined,
    },
    suffix: {
      type: String,
      default: undefined,
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
    rounded: {
      type: Boolean,
      default: false,
    },
    dense: {
      type: Boolean,
      default: false,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
    autocomplete: {
      type: String,
      default: undefined,
    },
    dark: {
      type: Boolean,
      default: false,
    },
    light: {
      type: Boolean,
      default: false,
    },
    // Textarea specific
    rows: {
      type: [Number, String],
      default: 5,
    },
    autoGrow: {
      type: Boolean,
      default: false,
    },
    noResize: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      showPassword: false,
    };
  },
  computed: {
    inputType() {
      if (this.type === 'password') {
        return this.showPassword ? 'text' : 'password';
      }
      return this.type;
    },
    computedAppendIcon() {
      if (this.type === 'password') {
        return this.showPassword ? 'mdi-eye-off' : 'mdi-eye';
      }
      return this.appendIcon;
    },
    filteredListeners() {
      const { input, ...listeners } = this.$listeners;
      return listeners;
    },
  },
  methods: {
    handleAppendClick() {
      if (this.type === 'password') {
        this.showPassword = !this.showPassword;
      }
      this.$emit('click:append');
    },
  },
};
</script>

<style scoped>
.form-field {
  width: 100%;
}
</style>
