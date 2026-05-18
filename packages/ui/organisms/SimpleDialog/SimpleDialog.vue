<template>
  <AtomDialog
    :value="value"
    :max-width="maxWidth"
    :persistent="persistent"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    v-on="$listeners"
  >
    <AtomCard>
      <AtomCardTitle v-if="title" :class="titleClass">
        <span :class="titleTextClass">{{ title }}</span>
      </AtomCardTitle>
      <AtomCardText v-if="$slots.default || message" :class="contentClass">
        <slot>{{ message }}</slot>
      </AtomCardText>
      <AtomDivider v-if="showDivider" />
      <AtomCardActions v-if="$slots.actions || showDefaultActions">
        <slot name="actions">
          <AtomSpacer />
          <AtomButton
            v-if="showCancel"
            flat
            :color="cancelColor"
            @click="$emit('cancel')"
          >
            {{ cancelText }}
          </AtomButton>
          <AtomButton
            v-if="showConfirm"
            :color="confirmColor"
            :loading="confirmLoading"
            :disabled="confirmDisabled"
            flat
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </AtomButton>
        </slot>
      </AtomCardActions>
    </AtomCard>
  </AtomDialog>
</template>

<script>
import {
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomDialog,
  AtomDivider,
  AtomSpacer,
} from '../../atoms';

export default {
  name: 'OrganismSimpleDialog',
  components: {
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomDialog,
    AtomDivider,
    AtomSpacer,
  },
  inheritAttrs: false,
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: undefined,
    },
    message: {
      type: String,
      default: undefined,
    },
    maxWidth: {
      type: [Number, String],
      default: 500,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
    showDivider: {
      type: Boolean,
      default: true,
    },
    showDefaultActions: {
      type: Boolean,
      default: true,
    },
    showCancel: {
      type: Boolean,
      default: true,
    },
    showConfirm: {
      type: Boolean,
      default: true,
    },
    cancelText: {
      type: String,
      default: 'Cancel',
    },
    confirmText: {
      type: String,
      default: 'Confirm',
    },
    cancelColor: {
      type: String,
      default: undefined,
    },
    confirmColor: {
      type: String,
      default: 'primary',
    },
    confirmLoading: {
      type: Boolean,
      default: false,
    },
    confirmDisabled: {
      type: Boolean,
      default: false,
    },
    titleClass: {
      type: [String, Array, Object],
      default: 'headline grey lighten-2',
    },
    titleTextClass: {
      type: [String, Array, Object],
      default: undefined,
    },
    contentClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
