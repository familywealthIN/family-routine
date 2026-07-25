<template>
  <!--
    The Start Task / Start Agent (or Build Agent) button pair shared by the
    quick-goal modal and the existing-goal action modal. Renders the exact
    original markup (raw v-btn in a d-flex row) so the layout matches what the
    quick modal had before it was extracted. Presentational: emits intent, the
    container/page decides what "start task/agent" means.
  -->
  <v-flex x12 d-flex class="task-action-buttons">
    <v-btn
      color="success"
      :loading="loading && loadingAction !== 'agent'"
      :disabled="loading"
      @click="$emit('start-task')"
    >
      Start Task
    </v-btn>
    <v-btn
      v-if="agentState === 'assigned'"
      color="primary"
      outline
      :loading="loading && loadingAction === 'agent'"
      :disabled="loading"
      @click="$emit('start-agent')"
    >
      Start Agent
    </v-btn>
    <v-btn
      v-else
      color="primary"
      outline
      :disabled="loading"
      @click="$emit('build-agent')"
    >
      Build Agent
    </v-btn>
  </v-flex>
</template>

<script>
export default {
  name: 'TaskActionButtons',
  props: {
    // 'assigned' → show "Start Agent"; anything else → "Build Agent".
    agentState: {
      type: String,
      default: 'none',
    },
    // Global in-flight flag — disables every button.
    loading: {
      type: Boolean,
      default: false,
    },
    // Which action is in flight ('task' | 'agent' | '') — only that button spins.
    loadingAction: {
      type: String,
      default: '',
    },
  },
};
</script>
