<template>
  <AtomCard :flat="flat" :tile="tile" :class="cardClass">
    <AtomCardTitle v-if="title || $slots.title || showActions" :class="titleClass">
      <slot name="title">
        <span :class="titleTextClass">{{ title }}</span>
      </slot>
      <AtomSpacer v-if="showActions || $slots.actions" />
      <slot name="actions" />
    </AtomCardTitle>

    <AtomCardText v-if="$slots.default" :class="contentClass">
      <slot />
    </AtomCardText>

    <AtomCardActions v-if="$slots.footer">
      <slot name="footer" />
    </AtomCardActions>
  </AtomCard>
</template>

<script>
import {
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomSpacer,
} from '../../atoms';

export default {
  name: 'MoleculeCardHeader',
  components: {
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomSpacer,
  },
  props: {
    title: {
      type: String,
      default: undefined,
    },
    flat: {
      type: Boolean,
      default: false,
    },
    tile: {
      type: Boolean,
      default: false,
    },
    showActions: {
      type: Boolean,
      default: false,
    },
    cardClass: {
      type: [String, Array, Object],
      default: undefined,
    },
    titleClass: {
      type: [String, Array, Object],
      default: undefined,
    },
    titleTextClass: {
      type: [String, Array, Object],
      default: 'headline',
    },
    contentClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>
