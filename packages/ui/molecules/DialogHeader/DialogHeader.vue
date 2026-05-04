<template>
  <AtomToolbar :color="color" :dark="dark" :light="light" :flat="flat" :dense="dense" :class="headerClass">
    <AtomButton v-if="showClose" icon @click="$emit('close')">
      <AtomIcon>{{ closeIcon }}</AtomIcon>
    </AtomButton>
    <AtomButton v-else-if="showBack" icon @click="$emit('back')">
      <AtomIcon>{{ backIcon }}</AtomIcon>
    </AtomButton>

    <AtomToolbarTitle v-if="title">{{ title }}</AtomToolbarTitle>
    <slot name="title" />

    <AtomSpacer />

    <slot name="actions" />

    <AtomButton v-if="showSave" :disabled="saveDisabled" :loading="saveLoading" flat @click="$emit('save')">
      {{ saveText }}
    </AtomButton>
  </AtomToolbar>
</template>

<script>
import {
  AtomButton,
  AtomIcon,
  AtomSpacer,
  AtomToolbar,
  AtomToolbarTitle,
} from '../../atoms';

export default {
  name: 'MoleculeDialogHeader',
  components: {
    AtomButton,
    AtomIcon,
    AtomSpacer,
    AtomToolbar,
    AtomToolbarTitle,
  },
  props: {
    title: {
      type: String,
      default: undefined,
    },
    color: {
      type: String,
      default: 'primary',
    },
    dark: {
      type: Boolean,
      default: true,
    },
    light: {
      type: Boolean,
      default: false,
    },
    flat: {
      type: Boolean,
      default: false,
    },
    dense: {
      type: Boolean,
      default: false,
    },
    showClose: {
      type: Boolean,
      default: true,
    },
    closeIcon: {
      type: String,
      default: 'mdi-close',
    },
    showBack: {
      type: Boolean,
      default: false,
    },
    backIcon: {
      type: String,
      default: 'mdi-arrow-left',
    },
    showSave: {
      type: Boolean,
      default: false,
    },
    saveText: {
      type: String,
      default: 'Save',
    },
    saveDisabled: {
      type: Boolean,
      default: false,
    },
    saveLoading: {
      type: Boolean,
      default: false,
    },
    headerClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
