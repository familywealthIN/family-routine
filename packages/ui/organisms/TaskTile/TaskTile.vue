<template>
  <AtomListTile
    :class="[{ 'active': active }, tileClass]"
    @click="$emit('click', task)"
    avatar
  >
    <AtomProgressCircular
      :value="percentage"
      :size="48"
      :rotate="-90"
      class="mr-3 circular-task"
      :width="2"
      color="warning"
    >
      <AtomListTileAvatar>
        <AtomButton
          fab
          small
          class="elevation-0"
          :disabled="disabled"
          :color="buttonColor"
          @click.stop="$emit('action-click', task)"
        >
          <AtomIcon :name="buttonIcon" />
        </AtomButton>
      </AtomListTileAvatar>
    </AtomProgressCircular>
    <AtomListTileContent>
      <AtomListTileTitle>
        <span>{{ task.name }}</span>
        <slot name="title-append" />
      </AtomListTileTitle>
      <AtomListTileSubTitle v-if="showSubtitle">
        <slot name="subtitle">
          <div class="time-text">
            {{ displayTime }} - {{ completedCount }}/{{ totalCount }}
          </div>
        </slot>
      </AtomListTileSubTitle>
      <slot name="content" />
    </AtomListTileContent>
    <AtomListTileAction v-if="$slots.action || showActionCount">
      <slot name="action">
        <AtomListTileActionText>
          <b>{{ completedCount }}</b>/{{ totalCount }}
        </AtomListTileActionText>
        <AtomListTileActionText>tasks</AtomListTileActionText>
      </slot>
    </AtomListTileAction>
  </AtomListTile>
</template>

<script>
import {
  AtomButton,
  AtomIcon,
  AtomListTile,
  AtomListTileAction,
  AtomListTileActionText,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomProgressCircular,
} from '../../atoms';

export default {
  name: 'OrganismTaskTile',
  components: {
    AtomButton,
    AtomIcon,
    AtomListTile,
    AtomListTileAction,
    AtomListTileActionText,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomProgressCircular,
  },
  props: {
    task: {
      type: Object,
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
    displayTime: {
      type: String,
      default: '',
    },
    buttonIcon: {
      type: String,
      default: 'mdi-check',
    },
    buttonColor: {
      type: String,
      default: 'primary',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    showSubtitle: {
      type: Boolean,
      default: true,
    },
    showActionCount: {
      type: Boolean,
      default: false,
    },
    tileClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },
};
</script>

<style scoped>
.circular-task {
  flex-shrink: 0;
}
</style>
