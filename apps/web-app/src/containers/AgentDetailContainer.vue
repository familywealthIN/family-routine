<template>
  <!--
    Read container for the detail pane. One organism, one GraphQL operation
    (the same no-variable routine query the list declares — identical variables
    means ONE cache entry, the MissedDayRecovery/WeekdaySelector precedent, not
    two copies that can drift).

    The pane is rendered on every shell. Tablet and desktop keep it permanently
    beside the list; the phone page puts this same container inside a sheet.
  -->
  <agent-detail
    :agent="agent"
    :routine-time="routineTime"
    :routine-name="routineName"
    :shell="shell"
    :can-run-test="canRunTest"
    @edit="$emit('edit', $event)"
    @open-routine="$emit('open-routine', $event)"
    @open-result="openResult"
  />
</template>

<script>
import AgentDetail from '@routine-notes/ui/organisms/AgentDetail/AgentDetail.vue';
import { AGENT_ROUTINE_ITEMS_QUERY } from '../composables/graphql/agentQueries';
import { indexRoutines } from '../utils/agentRoutines';

export default {
  name: 'AgentDetailContainer',
  components: { AgentDetail },
  props: {
    agentId: { type: String, default: '' },
    shell: { type: String, default: 'phone' },
  },
  data() {
    return { routineItems: [] };
  },
  apollo: {
    routineItems: {
      query: AGENT_ROUTINE_ITEMS_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) { return (data && data.routineItems) || []; },
    },
  },
  computed: {
    agent() {
      if (!this.agentId) return null;
      return this.$agent.agents.find((candidate) => candidate.id === this.agentId) || null;
    },
    routine() {
      if (!this.agent) return null;
      return indexRoutines(this.routineItems)[this.agent.taskRef] || null;
    },
    routineTime() {
      return (this.routine && this.routine.time) || '';
    },
    routineName() {
      return (this.routine && this.routine.name) || (this.agent && this.agent.taskRef) || '';
    },
    /**
     * STUBBED, deliberately. There is no server operation that starts an agent:
     * `apps/server/src/resolvers/agent.js` only *records* an execution
     * (`recordAgentExecution`), and the client-side dispatcher
     * (`agentStore.fireStartEventIfPresent`) needs a real goal-item id to
     * substitute for `{{ goal_id }}` plus an open run to close — neither of which
     * a page-level "test" has. Faking the lifecycle on a timer (as the mock does)
     * would report a success nothing performed and would increment the real
     * success/failure counters. So the button renders, with its three labels, and
     * says why it is off until `triggerAgentRun` exists.
     */
    canRunTest() {
      return false;
    },
  },
  methods: {
    /**
     * An HTML result is a third party's HTTP response. The app already has one
     * sandboxed viewer for it (App.vue's AgentResultModal, fed by the store), so
     * this re-opens that rather than injecting markup into the page.
     */
    openResult() {
      const { agent } = this;
      if (!agent || agent.lastResultType !== 'html' || !agent.lastResultBody) return;
      this.$agent.showSavedResult(agent.taskRef, agent.lastResultBody);
    },
  },
};
</script>
