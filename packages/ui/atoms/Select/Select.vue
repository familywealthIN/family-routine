<template>
  <v-select
    :value="value"
    :items="items"
    :label="label"
    :placeholder="placeholder"
    :hint="hint"
    :persistent-hint="persistentHint"
    :item-text="itemText"
    :item-value="itemValue"
    :item-disabled="itemDisabled"
    :return-object="returnObject"
    :multiple="multiple"
    :chips="chips"
    :small-chips="smallChips"
    :deletable-chips="deletableChips"
    :color="color"
    :disabled="disabled"
    :readonly="readonly"
    :loading="loading"
    :clearable="clearable"
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
    :dense="dense"
    :menu-props="menuProps"
    :attach="attach"
    :dark="dark"
    :light="light"
    :class="selectClass"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    @change="$emit('change', $event)"
    v-on="filteredListeners"
  >
    <template v-if="$slots.selection" #selection="data">
      <slot name="selection" v-bind="data" />
    </template>
    <template v-if="$slots.item" #item="data">
      <slot name="item" v-bind="data" />
    </template>
    <template v-if="$slots.prepend" #prepend>
      <slot name="prepend" />
    </template>
    <template v-if="$slots.append" #append>
      <slot name="append" />
    </template>
    <template v-if="$slots['no-data']" #no-data>
      <slot name="no-data" />
    </template>
  </v-select>
</template>

<script>
export default {
  name: 'AtomSelect',
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number, Array, Object],
      default: undefined,
    },
    items: {
      type: Array,
      default: () => [],
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
    itemText: {
      type: [String, Array, Function],
      default: 'text',
    },
    itemValue: {
      type: [String, Array, Function],
      default: 'value',
    },
    itemDisabled: {
      type: [String, Array, Function],
      default: 'disabled',
    },
    returnObject: {
      type: Boolean,
      default: false,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    chips: {
      type: Boolean,
      default: false,
    },
    smallChips: {
      type: Boolean,
      default: false,
    },
    deletableChips: {
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
    dense: {
      type: Boolean,
      default: false,
    },
    menuProps: {
      type: [String, Array, Object],
      default: undefined,
    },
    attach: {
      type: [Boolean, String, Object],
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
    selectClass: {
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
};
</script>
