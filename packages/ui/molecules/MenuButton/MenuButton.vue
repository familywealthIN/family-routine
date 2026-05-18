<template>
  <AtomMenu
    v-model="isOpen"
    :close-on-content-click="closeOnContentClick"
    :offset-x="offsetX"
    :offset-y="offsetY"
    :left="left"
    :right="right"
    :top="top"
    :bottom="bottom"
    :nudge-left="nudgeLeft"
    :nudge-right="nudgeRight"
    :nudge-top="nudgeTop"
    :nudge-bottom="nudgeBottom"
    :disabled="disabled"
    :transition="transition"
    :origin="origin"
    :min-width="minWidth"
    :max-width="maxWidth"
    :max-height="maxHeight"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template #activator="{ on }">
      <slot name="activator" :on="on">
        <AtomButton :icon="iconButton" :flat="flat" :color="buttonColor" :small="small" :large="large" v-on="on">
          <AtomIcon v-if="icon" :left="!!buttonText">{{ icon }}</AtomIcon>
          <span v-if="buttonText">{{ buttonText }}</span>
        </AtomButton>
      </slot>
    </template>

    <AtomList :dense="dense">
      <slot>
        <template v-for="(item, index) in items">
          <AtomDivider v-if="item.divider" :key="`divider-${index}`" />
          <AtomSubheader v-else-if="item.header" :key="`header-${index}`">{{ item.header }}</AtomSubheader>
          <AtomListTile
            v-else
            :key="item.value || index"
            :disabled="item.disabled"
            @click="handleItemClick(item)"
          >
            <AtomListTileAvatar v-if="item.icon">
              <AtomIcon :color="item.iconColor">{{ item.icon }}</AtomIcon>
            </AtomListTileAvatar>
            <AtomListTileContent>
              <AtomListTileTitle>{{ item.text }}</AtomListTileTitle>
              <AtomListTileSubTitle v-if="item.subtitle">{{ item.subtitle }}</AtomListTileSubTitle>
            </AtomListTileContent>
          </AtomListTile>
        </template>
      </slot>
    </AtomList>
  </AtomMenu>
</template>

<script>
import {
  AtomButton,
  AtomDivider,
  AtomIcon,
  AtomList,
  AtomListTile,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomMenu,
  AtomSubheader,
} from '../../atoms';

export default {
  name: 'MoleculeMenuButton',
  components: {
    AtomButton,
    AtomDivider,
    AtomIcon,
    AtomList,
    AtomListTile,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomMenu,
    AtomSubheader,
  },
  inheritAttrs: false,
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    buttonText: {
      type: String,
      default: undefined,
    },
    icon: {
      type: String,
      default: 'mdi-dots-vertical',
    },
    iconButton: {
      type: Boolean,
      default: true,
    },
    flat: {
      type: Boolean,
      default: false,
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
    dense: {
      type: Boolean,
      default: false,
    },
    closeOnContentClick: {
      type: Boolean,
      default: true,
    },
    offsetX: {
      type: Boolean,
      default: false,
    },
    offsetY: {
      type: Boolean,
      default: true,
    },
    left: {
      type: Boolean,
      default: false,
    },
    right: {
      type: Boolean,
      default: false,
    },
    top: {
      type: Boolean,
      default: false,
    },
    bottom: {
      type: Boolean,
      default: false,
    },
    nudgeLeft: {
      type: [Number, String],
      default: 0,
    },
    nudgeRight: {
      type: [Number, String],
      default: 0,
    },
    nudgeTop: {
      type: [Number, String],
      default: 0,
    },
    nudgeBottom: {
      type: [Number, String],
      default: 0,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    transition: {
      type: String,
      default: 'scale-transition',
    },
    origin: {
      type: String,
      default: 'top right',
    },
    minWidth: {
      type: [Number, String],
      default: undefined,
    },
    maxWidth: {
      type: [Number, String],
      default: undefined,
    },
    maxHeight: {
      type: [Number, String],
      default: undefined,
    },
  },
  data() {
    return {
      isOpen: false,
    };
  },
  methods: {
    handleItemClick(item) {
      if (item.action) {
        item.action();
      }
      this.$emit('item-click', item);
    },
  },
};
</script>
