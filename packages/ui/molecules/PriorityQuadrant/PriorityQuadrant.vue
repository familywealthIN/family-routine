<template>
  <v-card class="ma-2 quadrant-card elevation-2" :style="{ borderTop: `3px solid ${colorHex}` }">
    <v-card-title class="pb-1">
      <v-icon left :color="color">{{ icon }}</v-icon>
      <div class="flex-grow-1">
        <h3 class="headline" :style="{ color: colorHex }">{{ title }}</h3>
        <div class="caption grey--text">{{ subtitle }}</div>
      </div>
      <v-chip small :color="color" dark>{{ items.length }}</v-chip>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="pa-0">
      <priority-goal-list
        :items="items"
        :tasklist="tasklist"
        :color="color"
        :empty-text="`No ${title.toLowerCase()} items`"
        @item-click="$emit('item-click', $event)"
        @toggle-complete="$emit('toggle-complete', $event)"
        @edit-item="$emit('edit-item', $event)"
        @open-transcript="$emit('open-transcript', $event)"
      />
    </v-card-text>
  </v-card>
</template>

<script>
import PriorityGoalList from '../PriorityGoalList/PriorityGoalList.vue';

export default {
  name: 'MoleculePriorityQuadrant',
  components: { PriorityGoalList },
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: 'primary',
    },
    icon: {
      type: String,
      default: 'label',
    },
    items: {
      type: Array,
      default: () => [],
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    colorHex() {
      const map = {
        error: '#F44336',
        primary: '#1976D2',
        warning: '#FF9800',
        'grey darken-1': '#757575',
      };
      return map[this.color] || '#1976D2';
    },
  },
};
</script>

<style scoped>
.quadrant-card {
  min-height: 350px;
  display: flex;
  flex-direction: column;
}

.flex-grow-1 {
  flex-grow: 1;
}
</style>
