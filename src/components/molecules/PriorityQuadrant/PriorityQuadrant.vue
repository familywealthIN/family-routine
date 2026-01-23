<template>
  <v-card :color="color" dark class="ma-2 quadrant-card elevation-2">
    <v-card-title class="pb-1">
      <v-icon left>{{ icon }}</v-icon>
      <div class="flex-grow-1">
        <h3 class="headline">{{ title }}</h3>
        <div class="caption" style="opacity: 0.9;">{{ subtitle }}</div>
      </div>
      <v-chip dark small>{{ items.length }}</v-chip>
    </v-card-title>
    <v-divider dark></v-divider>
    <v-card-text class="pa-0">
      <v-list dark dense class="transparent">
        <template v-if="items.length">
          <v-list-tile
            v-for="item in items"
            :key="item.id"
            @click="$emit('item-click', item)"
            class="quadrant-item"
          >
            <v-list-tile-action @click.stop>
              <v-checkbox
                :input-value="item.isComplete"
                @change="$emit('toggle-complete', item)"
                dark
                color="white"
              />
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title :class="{ 'completed': item.isComplete }">
                {{ item.body }}
              </v-list-tile-title>
              <v-list-tile-sub-title class="caption white--text" style="opacity: 0.8;">
                {{ formatPeriod(item.period) }}
                <span v-if="item.taskRef"> • {{ getTaskName(item.taskRef) }}</span>
              </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-btn icon small @click.stop="$emit('edit-item', item)">
                <v-icon size="18">edit</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
        </template>
        <v-list-tile v-else>
          <v-list-tile-content>
            <v-list-tile-title class="grey--text text--lighten-2 text-xs-center pa-3">
              No {{ title.toLowerCase() }} items
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'MoleculePriorityQuadrant',
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
  methods: {
    formatPeriod(period) {
      if (!period) return '';
      return period.charAt(0).toUpperCase() + period.slice(1);
    },
    getTaskName(taskRef) {
      if (!taskRef || !this.tasklist) return '';
      const task = this.tasklist.find((t) => t.id === taskRef);
      return task ? task.name : '';
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

.quadrant-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.quadrant-item:last-child {
  border-bottom: none;
}

.quadrant-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.completed {
  text-decoration: line-through;
  opacity: 0.6;
}

.flex-grow-1 {
  flex-grow: 1;
}
</style>
