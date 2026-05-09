<template>
  <AtomDialog
    :value="value"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    v-on="$listeners"
  >
    <AtomCard>
      <molecule-dialog-header
        :title="title"
        :color="headerColor"
        :showClose="showClose"
        :showSave="showSave"
        :saveText="saveText"
        :saveDisabled="saveDisabled"
        :saveLoading="saveLoading"
        @close="$emit('close')"
        @save="$emit('save')"
      >
        <template v-if="$slots['header-actions']" #actions>
          <slot name="header-actions" />
        </template>
      </molecule-dialog-header>
      <AtomCardText :class="contentClass">
        <slot />
      </AtomCardText>
      <AtomCardActions v-if="$slots.footer">
        <slot name="footer" />
      </AtomCardActions>
    </AtomCard>
  </AtomDialog>
</template>

<script>
import MoleculeDialogHeader from '../../molecules/DialogHeader/DialogHeader.vue';
import {
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomDialog,
} from '../../atoms';

export default {
  name: 'OrganismFullscreenDialog',
  components: {
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomDialog,
    MoleculeDialogHeader,
  },
  inheritAttrs: false,
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    headerColor: {
      type: String,
      default: 'primary',
    },
    showClose: {
      type: Boolean,
      default: true,
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
    contentClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
