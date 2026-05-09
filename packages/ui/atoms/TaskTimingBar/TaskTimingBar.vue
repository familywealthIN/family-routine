<template>
  <div :class="['task-timing-bar', { vertical: vertical }]">
    <div class="timing-half timing-in-time">
      <span class="timing-label">Tasks in Time:</span>
      <span class="timing-count">{{ inTimeCount }}</span>
    </div>
    <div class="timing-half timing-out-of-time">
      <span class="timing-label">Tasks out of Time:</span>
      <span class="timing-count">{{ outOfTimeCount }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AtomTaskTimingBar',
  props: {
    inTimeCount: {
      type: Number,
      default: 0,
    },
    outOfTimeCount: {
      type: Number,
      default: 0,
    },
    vertical: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.task-timing-bar {
  display: flex;
  width: 100%;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.task-timing-bar.vertical {
  flex-direction: column;
  border-top: none;
}

.task-timing-bar.vertical .timing-half {
  justify-content: flex-start;
  padding: 6px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  border-right: none;
}

.task-timing-bar.vertical .timing-half:last-child {
  border-bottom: none;
}

.timing-half {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 8px;
  font-size: 12px;
  font-weight: 500;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.timing-half:last-child {
  border-right: none;
}

.timing-in-time {
  color: #4caf50;
}

.timing-out-of-time {
  color: #f44336;
}

.timing-count {
  font-weight: 700;
  font-size: 14px;
}
</style>
