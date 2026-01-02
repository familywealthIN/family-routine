<template>
  <div class="mode-indicator">
    <v-icon :color="iconColor" :size="size">{{ icon }}</v-icon>
    <span v-if="showLabel" class="mode-label">{{ label }}</span>
  </div>
</template>

<script>
export default {
  name: 'AtomModeIndicator',
  props: {
    mode: {
      type: String,
      required: true,
      validator: (value) => ['task', 'goals'].includes(value),
    },
    showLabel: {
      type: Boolean,
      default: false,
    },
    size: {
      type: [String, Number],
      default: 24,
    },
  },
  computed: {
    icon() {
      return this.mode === 'task' ? 'check_circle' : 'timeline';
    },
    iconColor() {
      return this.mode === 'task' ? 'success' : 'primary';
    },
    label() {
      return this.mode === 'task' ? 'Task Mode' : 'Goals Mode';
    },
  },
};
</script>

<style scoped>
.mode-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mode-label {
  font-size: 14px;
  font-weight: 500;
}
</style>
