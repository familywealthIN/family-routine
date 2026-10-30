<template>
  <v-card v-if="tasks && tasks.length > 0" outlined class="modern-shadow-sm">
    <v-card-title class="pb-2">
      <v-icon left small>track_changes</v-icon>
      <span class="subtitle-2">Related Goals ({{ tasks.length }})</span>
    </v-card-title>
    <v-card-text class="pt-0">
      <!--
        One timeline stop per day: a day's related goals sit together under its
        date instead of each repeating it. The dot is green only when every goal
        that day is done.
      -->
      <v-timeline dense>
        <v-timeline-item
          v-for="group in dayGroups"
          :key="group.key"
          :color="group.allComplete ? 'green' : 'orange'"
          small
          class="mb-1"
        >
          <div v-if="group.date" class="caption text--secondary">
            {{ formatDate(group.date) }}
            <span v-if="group.tasks.length > 1">· {{ group.tasks.length }} goals</span>
          </div>
          <div
            v-for="(task, index) in group.tasks"
            :key="task.id || `${group.key}-${index}`"
            class="related-task"
          >
            <v-icon size="14" :color="task.isComplete ? 'green' : 'grey'" class="mr-1">
              {{ task.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
            </v-icon>
            <span v-if="task.time" class="caption text--secondary mr-1">{{ task.time }}</span>
            <span class="body-2">{{ task.body }}</span>
          </div>
        </v-timeline-item>
      </v-timeline>
    </v-card-text>
  </v-card>
</template>

<script>
import moment from 'moment';

export default {
  name: 'MoleculeRelatedTasksTimeline',
  props: {
    tasks: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    /**
     * The rows grouped by date, keeping the incoming order (newest day first).
     * Within a day, goals with a routine time come in time order; the rest keep
     * their place after them.
     */
    dayGroups() {
      const groups = [];
      const byDate = {};
      (this.tasks || []).forEach((task) => {
        const key = task.date || 'undated';
        if (!byDate[key]) {
          byDate[key] = { key, date: task.date || '', tasks: [] };
          groups.push(byDate[key]);
        }
        byDate[key].tasks.push(task);
      });
      groups.forEach((group) => {
        group.tasks = group.tasks
          .map((task, index) => ({ task, index }))
          .sort((a, b) => {
            const ta = a.task.time || '';
            const tb = b.task.time || '';
            if (ta && tb && ta !== tb) return ta < tb ? -1 : 1;
            if (ta && !tb) return -1;
            if (!ta && tb) return 1;
            return a.index - b.index;
          })
          .map(({ task }) => task);
        group.allComplete = group.tasks.every((task) => task.isComplete);
      });
      return groups;
    },
  },
  methods: {
    formatDate(date) {
      if (!date) return '';
      return moment(date, 'DD-MM-YYYY').format('ddd, MMM D');
    },
  },
};
</script>

<style scoped>
.modern-shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.body-2 {
  font-weight: 500;
}

.related-task {
  display: flex;
  align-items: baseline;
  padding: 2px 0;
}
</style>
