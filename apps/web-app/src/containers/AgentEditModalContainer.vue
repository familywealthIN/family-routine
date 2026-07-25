<template>
  <!--
    Modal container for the agent editor (see ARCHITECTURE.md).
    Owns the agent domain end-to-end: the modal, the routine-option list it
    needs, its open state, and the post-save agent refetch ($agent.fetchAll).
    The page just calls `open(taskRef)` — it no longer carries agent-modal
    state or the AGENTS query wiring.
  -->
  <AgentEditModal
    v-model="isOpen"
    :prefilled-task-ref="taskRef"
    :routine-options="routineOptions"
    @saved="onSaved"
  />
</template>

<script>
import { AgentEditModal } from '@routine-notes/ui/organisms';

export default {
  name: 'AgentEditModalContainer',
  components: { AgentEditModal },
  props: {
    // Routine tasks the agent can be attached to (the page owns the shared
    // routineDate read; the modal only needs id + label).
    tasklist: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      isOpen: false,
      taskRef: '',
    };
  },
  computed: {
    routineOptions() {
      return (this.tasklist || []).map((t) => ({
        label: t.time ? `${t.time} — ${t.name}` : t.name,
        value: t.id,
      }));
    },
  },
  methods: {
    // Imperative API so the page holds no open/taskRef state.
    open(taskRef) {
      if (!taskRef) return;
      this.taskRef = taskRef;
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
    },
    onSaved() {
      // Agent CRUD lives in the $agent store; refresh the local cache so the
      // dashboard's agent badges/quick-goal reflect the change.
      this.$agent.fetchAll();
      this.$emit('saved');
    },
  },
};
</script>
