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
import { TASK_STATUS_CONFIG, resolveDisplayStatus } from '../../utils/taskStatus';

export default {
  name: 'TaskStatusTag',
  props: {
    status: {
      type: String,
      required: true,
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    showStatus: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    statusConfig() {
      // resolveDisplayStatus only ever returns a labelled status, so there is no
      // "Unknown" chip to fall into and a ticked item can never read as missed.
      return TASK_STATUS_CONFIG[resolveDisplayStatus({
        status: this.status,
        isComplete: this.isComplete,
      })];
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
