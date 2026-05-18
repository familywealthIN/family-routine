<template>
  <v-card v-if="tasks && tasks.length > 0" outlined class="modern-shadow-sm">
    <v-card-title class="pb-2">
      <v-icon left small>track_changes</v-icon>
      <span class="subtitle-2">Related Goals ({{ tasks.length }})</span>
    </v-card-title>
    <v-card-text class="pt-0">
      <v-timeline dense>
        <v-timeline-item
          v-for="task in tasks"
          :key="task.id"
          :color="task.isComplete ? 'green' : 'orange'"
          small
          class="mb-1"
        >
          <v-layout align-center>
            <v-flex>
              <!-- Date Display -->
              <div v-if="task.date" class="caption text--secondary">
                {{ formatDate(task.date) }}
              </div>
              <!-- Time Display -->
              <span v-if="task.time" class="caption text--secondary">
                {{ task.time }}
              </span>
              <!-- Body/Title -->
              <div class="body-2">{{ task.body }}</div>
            </v-flex>
          </v-layout>
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
</style>
