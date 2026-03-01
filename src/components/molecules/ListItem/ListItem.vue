<template>
  <AtomListTile
    :avatar="avatar || !!$slots.avatar"
    :inactive="inactive"
    :ripple="ripple"
    :disabled="disabled"
    :to="to"
    :href="href"
    :target="target"
    :value="value"
    :class="tileClass"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <AtomListTileAvatar v-if="avatar || $slots.avatar" :size="avatarSize" :color="avatarColor" :tile="avatarTile">
      <slot name="avatar">
        <img v-if="avatarSrc" :src="avatarSrc" :alt="avatarAlt" />
        <AtomIcon v-else-if="avatarIcon" :color="avatarIconColor">{{ avatarIcon }}</AtomIcon>
        <span v-else-if="avatarText" class="white--text">{{ avatarText }}</span>
      </slot>
    </AtomListTileAvatar>

    <AtomListTileAction v-if="$slots['action-left']" class="list-item__action-left">
      <slot name="action-left" />
    </AtomListTileAction>

    <AtomListTileContent>
      <AtomListTileTitle v-if="title || $slots.title">
        <slot name="title">{{ title }}</slot>
      </AtomListTileTitle>
      <AtomListTileSubTitle v-if="subtitle || $slots.subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </AtomListTileSubTitle>
      <slot name="content" />
    </AtomListTileContent>

    <AtomListTileAction v-if="$slots.action">
      <slot name="action" />
    </AtomListTileAction>
  </AtomListTile>
</template>

<script>
import {
  AtomIcon,
  AtomListTile,
  AtomListTileAction,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
} from '../../atoms';

export default {
  name: 'MoleculeListItem',
  components: {
    AtomIcon,
    AtomListTile,
    AtomListTileAction,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
  },
  inheritAttrs: false,
  props: {
    title: {
      type: String,
      default: undefined,
    },
    subtitle: {
      type: String,
      default: undefined,
    },
    avatar: {
      type: Boolean,
      default: false,
    },
    avatarSrc: {
      type: String,
      default: undefined,
    },
    avatarAlt: {
      type: String,
      default: '',
    },
    avatarIcon: {
      type: String,
      default: undefined,
    },
    avatarIconColor: {
      type: String,
      default: 'white',
    },
    avatarText: {
      type: String,
      default: undefined,
    },
    avatarSize: {
      type: [Number, String],
      default: 40,
    },
    avatarColor: {
      type: String,
      default: undefined,
    },
    avatarTile: {
      type: Boolean,
      default: false,
    },
    inactive: {
      type: Boolean,
      default: false,
    },
    ripple: {
      type: [Boolean, Object],
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    to: {
      type: [String, Object],
      default: undefined,
    },
    href: {
      type: String,
      default: undefined,
    },
    target: {
      type: String,
      default: undefined,
    },
    value: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    tileClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>

<style scoped>
.list-item__action-left {
  margin-right: 16px;
}
</style>
