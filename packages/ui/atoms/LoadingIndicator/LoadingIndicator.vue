<template>
  <div v-if="loading" class="loading-indicator">
    <v-progress-circular
      :size="size"
      :width="width"
      color="primary"
      indeterminate
    />
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'AtomLoadingIndicator',
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: '',
    },
    size: {
      type: [String, Number],
      default: 40,
    },
    width: {
      type: [String, Number],
      default: 4,
    },
  },
};
</script>

<style scoped>
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
}

.loading-message {
  margin: 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
}
</style>
