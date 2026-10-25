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
    @retry-run="retryRun"
    @cancel-run="cancelRun"
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
      const found = this.$agent.agents.find((candidate) => candidate.id === this.agentId);
      if (!found) return null;
      // `stalled` is a run-level verdict only the store can reach — an end event
      // that was due and never completed (D-13) — attached the same way the
      // routine join attaches `routineTime`. `agentStatusKey` turns it into the
      // stalled token, so the pane needs no second rule of its own.
      const { isStalled } = this.$agent;
      return {
        ...found,
        stalled: typeof isStalled === 'function' && isStalled(found.taskRef),
      };
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
     * Retry is the SAME end-event dispatch the home screen performs, through the
     * store — not a second way to close a run. The store refuses it (with a
     * notification) when the end event needs the day's goal item, which only
     * the home screen holds.
     */
    retryRun() {
      const { agent } = this;
      if (!agent) return;
      this.$agent.retryStalledRun({ taskRef: agent.taskRef });
    },
    /** Closes the run so it stops reading live. Books no success (status idle). */
    cancelRun() {
      const { agent } = this;
      if (!agent) return;
      this.$agent.cancelRun(agent.taskRef).then((ok) => {
        if (ok || !this.$notify) return;
        this.$notify({
          title: "Couldn't cancel the run",
          text: 'The agent could not be reached. Try again in a moment.',
          group: 'notify',
          type: 'warning',
          duration: 4000,
        });
      });
    },
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
