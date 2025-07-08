<template>
  <v-chip
    v-if="status && showStatus"
    :color="statusConfig.color"
    small
    outlined
    class="task-status-chip"
    :title="statusConfig.description"
  >
    <v-icon small left>{{ statusConfig.icon }}</v-icon>
    {{ statusConfig.label }}
  </v-chip>
</template>

<script>
import { TASK_STATUS_CONFIG } from '@/utils/taskStatus';

export default {
  name: 'TaskStatusTag',
  props: {
    status: {
      type: String,
      required: true,
    },
    showStatus: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    statusConfig() {
      return TASK_STATUS_CONFIG[this.status] || {
        color: 'grey',
        icon: 'help',
        label: 'Unknown',
        description: 'Unknown status',
      };
    },
  },
};
</script>

<style scoped>
.task-status-chip {
  margin-left: 4px;
  margin-right: 4px;
}
</style>
