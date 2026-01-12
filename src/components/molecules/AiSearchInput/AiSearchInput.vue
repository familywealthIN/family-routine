<template>
  <v-form @submit.prevent="handleSubmit">
    <v-text-field
      :value="value"
      @input="$emit('input', $event)"
      label="Describe what you want to accomplish"
      :placeholder="placeholder"
      prepend-icon="search"
      :loading="loading"
      :disabled="loading"
      @keyup.enter="handleSubmit"
      clearable
      filled
    >
      <template v-slot:append>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!value || loading"
          @click="handleSubmit"
          icon
          class="search-btn"
        >
          <v-icon>{{ mode === 'task' ? 'add_task' : 'search' }}</v-icon>
        </v-btn>
      </template>
    </v-text-field>

    <!-- Mode hint -->
    <div v-if="showHint" class="mode-hint">
      <v-icon small :color="mode === 'task' ? 'success' : 'primary'">
        {{ mode === 'task' ? 'info' : 'info' }}
      </v-icon>
      <span class="ml-1">
        {{ mode === 'task'
          ? 'Task mode: Extract single task from your description'
          : 'Goals mode: Generate milestone plan for this period'
        }}
      </span>
    </div>
  </v-form>
</template>

<script>
export default {
  name: 'MoleculeAiSearchInput',
  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: 'Try: "Exercise for 30 mins" or "Learn Python this month"',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: 'task',
      validator: (value) => ['task', 'goals'].includes(value),
    },
    showHint: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    handleSubmit() {
      if (this.value && !this.loading) {
        this.$emit('submit');
      }
    },
  },
};
</script>

<style scoped>
.search-btn {
  margin-top: -8px;
}

.mode-hint {
  display: flex;
  align-items: center;
  margin-top: -16px;
  margin-bottom: 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}
</style>
