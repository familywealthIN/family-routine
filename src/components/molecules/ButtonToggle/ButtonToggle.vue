<template>
  <AtomBtnToggle
    :value="value"
    :mandatory="mandatory"
    :multiple="multiple"
    :dark="dark"
    :light="light"
    :class="toggleClass"
    v-bind="$attrs"
    @change="$emit('input', $event)"
    v-on="filteredListeners"
  >
    <AtomButton
      v-for="(option, index) in options"
      :key="option.value !== undefined ? option.value : index"
      :value="option.value"
      :disabled="option.disabled"
      :flat="flat"
      :color="buttonColor"
      :small="small"
      :large="large"
    >
      <AtomIcon v-if="option.icon" :left="!!option.text" :small="small">{{ option.icon }}</AtomIcon>
      <span v-if="option.text">{{ option.text }}</span>
    </AtomButton>
  </AtomBtnToggle>
</template>

<script>
import {
  AtomBtnToggle,
  AtomButton,
  AtomIcon,
} from '../../atoms';

export default {
  name: 'MoleculeButtonToggle',
  components: {
    AtomBtnToggle,
    AtomButton,
    AtomIcon,
  },
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number, Array],
      default: undefined,
    },
    options: {
      type: Array,
      required: true,
      validator: (options) => options.every(
        (opt) => typeof opt === 'object'
            && (opt.text !== undefined || opt.icon !== undefined),
      ),
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    flat: {
      type: Boolean,
      default: true,
    },
    buttonColor: {
      type: String,
      default: undefined,
    },
    small: {
      type: Boolean,
      default: false,
    },
    large: {
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
    toggleClass: {
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
