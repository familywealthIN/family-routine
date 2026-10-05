<template>
  <!--
    Write container for the agent form — the New/Edit sheet plus the agent write
    CRUD behind it (create · update · delete), the way GoalItemListContainer owns
    "goal-item write CRUD" as one responsibility: all three write the SAME entity
    through the same store path, so the blast radius is still one slice.

    Imperative `openNew()` / `openEdit(agent)` so the page carries no sheet state
    (the AgentEditModalContainer convention).
  -->
  <agent-form-sheet
    :open="open"
    :shell="shell"
    :agent="agent"
    :routine-options="routineOptions"
    :prefill-task-ref="prefillTaskRef"
    :error-message="errorMessage"
    @close="close"
    @save="save"
    @delete="remove"
  />
</template>

<script>
import AgentFormSheet from '@routine-notes/ui/organisms/AgentFormSheet/AgentFormSheet.vue';
import { AGENT_ROUTINE_ITEMS_QUERY } from '../composables/graphql/agentQueries';
import { indexRoutines, routineOptionsFor } from '../utils/agentRoutines';

export default {
  name: 'AgentFormContainer',
  components: { AgentFormSheet },
  props: {
    shell: { type: String, default: 'phone' },
  },
  data() {
    return {
      open: false,
      agent: null,
      prefillTaskRef: '',
      errorMessage: '',
      routineItems: [],
    };
  },
  apollo: {
    routineItems: {
      query: AGENT_ROUTINE_ITEMS_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) { return (data && data.routineItems) || []; },
    },
  },
  computed: {
    routineOptions() {
      const keepFor = this.agent && this.agent.id ? this.agent.id : '';
      return routineOptionsFor(this.routineItems, this.$agent.agents, keepFor);
    },
  },
  methods: {
    openNew(taskRef = '') {
      this.agent = null;
      this.prefillTaskRef = taskRef;
      this.errorMessage = '';
      this.open = true;
    },
    openEdit(agent) {
      if (!agent) return;
      this.agent = agent;
      this.prefillTaskRef = '';
      this.errorMessage = '';
      this.open = true;
    },
    close() {
      this.open = false;
    },
    /** "06:00 Review payment" for the agent's routine; '' when it is not loaded. */
    routineLabelFor(agent) {
      const taskRef = agent && agent.taskRef;
      const item = taskRef && indexRoutines(this.routineItems)[taskRef];
      if (!item || !item.name) return '';
      return item.time ? `${item.time} ${item.name}` : item.name;
    },
    /**
     * `addAgent` / `updateAgent` both return the COMPLETE Agent (§3.2), so the
     * store's `upsertAgent` plus Apollo's own normalization is the whole cache
     * update — there is no list surgery to do here. `fetchAll` afterwards keeps
     * the dashboard's badges honest about a routine binding that changed.
     */
    async save(payload) {
      this.errorMessage = '';
      try {
        let saved;
        if (payload.id) {
          saved = await this.$agent.update(payload.id, {
            name: payload.name,
            startEvent: payload.startEvent,
            endEvent: payload.endEvent,
          });
        } else {
          saved = await this.$agent.add({
            name: payload.name,
            taskRef: payload.taskRef,
            startEvent: payload.startEvent,
            endEvent: payload.endEvent,
          });
        }
        this.open = false;
        // The Agent carries only `taskRef`; this container is the one holding
        // the routine list, so it names the routine for the page's toast
        // rather than letting a raw ObjectId reach the user.
        this.$emit('saved', saved, !payload.id, this.routineLabelFor(saved || payload));
        return saved;
      } catch (error) {
        // Stay open with the reason on screen: the unique-index message ("An
        // agent already exists for this routine") is actionable, and a sheet that
        // closed on failure would read as a successful save.
        this.errorMessage = (error && error.message) || 'Failed to save agent';
        this.$emit('failed', this.errorMessage);
        return null;
      }
    },
    async remove(id) {
      if (!id) return;
      const removed = this.agent;
      try {
        await this.$agent.remove(id);
        this.open = false;
        this.$emit('removed', removed);
      } catch (error) {
        this.errorMessage = (error && error.message) || 'Failed to delete agent';
        this.$emit('failed', this.errorMessage);
      }
    },
  },
};
</script>
