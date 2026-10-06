<template>
  <!--
    Read container for the Agents list (ARCHITECTURE.md §1-§4).

    Owns exactly one GraphQL operation — the routine list it joins agents to —
    and renders exactly one organism. The agent records themselves come from the
    `$agent` store, which is the agent domain's single owner (the Home badges,
    the quick-goal Start Agent button and the SW replay all read it); giving this
    page a second `agents` query would be the two-owners drift §3 warns about.
  -->
  <agent-list
    :agents="agents"
    :selected-id="selectedId"
    :shell="shell"
    :load-error="loadError"
    :retrying="$agent.loading"
    @select="$emit('select', $event)"
    @retry="reload"
  />
</template>

<script>
import AgentList from '@routine-notes/ui/organisms/AgentList/AgentList.vue';
import { agentTotals } from '@routine-notes/ui/constants/agents';
import { AGENT_ROUTINE_ITEMS_QUERY } from '../composables/graphql/agentQueries';
import { joinAgentRoutines } from '../utils/agentRoutines';

export default {
  name: 'AgentsListContainer',
  components: { AgentList },
  props: {
    selectedId: { type: String, default: '' },
    shell: { type: String, default: 'phone' },
  },
  data() {
    return { routineItems: [] };
  },
  apollo: {
    routineItems: {
      query: AGENT_ROUTINE_ITEMS_QUERY,
      // §3.4 — a stale or partial slice self-heals on the next paint instead of
      // sitting cache-first until something unrelated refetches.
      fetchPolicy: 'cache-and-network',
      update(data) { return (data && data.routineItems) || []; },
    },
  },
  computed: {
    agents() {
      return joinAgentRoutines(this.$agent.agents, this.routineItems);
    },
    /**
     * D-10. `fetchAll` swallows a failed load into the store and leaves `agents`
     * empty, so without this the page tells the user they have no agents when
     * the server simply could not be reached. Agents we already have outrank the
     * error: a failed *refetch* must not blank a working list.
     */
    loadError() {
      return !!this.$agent.error && !this.agents.length;
    },
  },
  watch: {
    // The page needs the count, the live count and the ids (to validate its
    // selection) for the shell header. It gets them as an event rather than by
    // reading the store itself, so the read stays in one place.
    agents: {
      immediate: true,
      handler() { this.emitSummary(); },
    },
    loadError() { this.emitSummary(); },
  },
  created() {
    this.$agent.fetchAll();
  },
  methods: {
    reload() {
      this.$agent.fetchAll();
    },
    emitSummary() {
      const totals = agentTotals(this.agents);
      this.$emit('summary', {
        count: totals.count,
        live: totals.live,
        error: this.loadError,
        ids: this.agents.map((agent) => agent.id),
      });
    },
  },
};
</script>
