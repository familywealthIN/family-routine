<template>
  <v-card>
    <v-card-title class="headline pb-0">
      Next Steps
      <v-spacer></v-spacer>
      <v-btn icon @click="$emit('refresh')">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text class="pt-1">
      <div v-if="loading" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>
      <div v-else-if="error" class="error--text">
        {{ error }}
      </div>
      <div v-else class="next-steps-content">
        <vue-markdown :source="nextSteps"></vue-markdown>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import VueMarkdown from 'vue-markdown';

export default {
  name: 'NextSteps',
  components: {
    VueMarkdown,
  },
  props: {
    nextSteps: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: '',
    },
  },
};
</script>

<style scoped>
.next-steps-content {
  padding: 0 16px;
}
</style>
