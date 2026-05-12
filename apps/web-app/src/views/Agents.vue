<template>
  <v-container fluid grid-list-md>
    <v-layout row wrap align-center class="mb-2">
      <v-flex grow>
        <h2 class="agents-heading">Agents</h2>
        <div class="agents-subheading">
          One agent per routine. Each agent fires a start event when its routine becomes
          active and (optionally) an end event when its goals are complete.
        </div>
      </v-flex>
      <v-flex shrink>
        <v-btn color="primary" :loading="$agent.loading" @click="openCreate">
          <v-icon left>add</v-icon> New agent
        </v-btn>
      </v-flex>
    </v-layout>

    <v-card v-if="!agents.length && !$agent.loading">
      <v-card-text class="text-xs-center pa-4">
        <p>No agents yet. Create one to start automating routine actions.</p>
      </v-card-text>
    </v-card>

    <v-data-table
      v-else
      :headers="headers"
      :items="agents"
      hide-actions
      class="elevation-1"
    >
      <template #items="props">
        <tr>
          <td>{{ props.item.name }}</td>
          <td>{{ routineName(props.item.taskRef) }}</td>
          <td>{{ statusLabel(props.item) }}</td>
          <td class="text-xs-right">{{ props.item.successCount || 0 }}</td>
          <td class="text-xs-right">{{ props.item.failureCount || 0 }}</td>
          <td>
            <v-btn icon small @click="openEdit(props.item)">
              <v-icon small>edit</v-icon>
            </v-btn>
            <v-btn icon small @click="confirmRemove(props.item)">
              <v-icon small>delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>

    <agent-edit-modal
      v-model="modalOpen"
      :agent="selectedAgent"
      :routine-options="routineOptions"
      @saved="onSaved"
    />

    <v-dialog v-model="confirmOpen" max-width="400">
      <v-card>
        <v-card-title class="headline">Delete agent?</v-card-title>
        <v-card-text>
          This will remove the agent and stop firing its start/end events. The routine
          itself stays.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn flat @click="confirmOpen = false">Cancel</v-btn>
          <v-btn color="error" :loading="removing" @click="doRemove">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import gql from 'graphql-tag';
import { AgentEditModal } from '@routine-notes/ui/organisms';

const ROUTINE_ITEMS_QUERY = gql`
  query agentsRoutineItems {
    routineItems {
      id
      name
      time
    }
  }
`;

export default {
  name: 'AgentsPage',
  components: { AgentEditModal },
  data() {
    return {
      modalOpen: false,
      selectedAgent: null,
      confirmOpen: false,
      pendingRemoval: null,
      removing: false,
      routineItems: [],
    };
  },
  apollo: {
    routineItems: {
      query: ROUTINE_ITEMS_QUERY,
      update(data) { return data && data.routineItems ? data.routineItems : []; },
    },
  },
  computed: {
    agents() { return this.$agent.agents; },
    headers() {
      return [
        { text: 'Name', value: 'name', sortable: false },
        { text: 'Routine', value: 'taskRef', sortable: false },
        { text: 'Status', value: 'executionStatus', sortable: false },
        {
          text: 'Success', value: 'successCount', sortable: false, align: 'right',
        },
        {
          text: 'Failures', value: 'failureCount', sortable: false, align: 'right',
        },
        { text: '', value: 'actions', sortable: false },
      ];
    },
    routineOptions() {
      const assigned = new Set(
        this.agents
          .filter((a) => !this.selectedAgent || a.id !== this.selectedAgent.id)
          .map((a) => a.taskRef),
      );
      return this.routineItems
        .filter((r) => !assigned.has(r.id))
        .map((r) => ({
          label: r.time ? `${r.time} — ${r.name}` : r.name,
          value: r.id,
        }));
    },
  },
  created() {
    this.$agent.fetchAll();
  },
  methods: {
    routineName(taskRef) {
      const r = this.routineItems.find((item) => item.id === taskRef);
      return r ? r.name : taskRef;
    },
    statusLabel(agent) {
      return agent.executionStatus || 'idle';
    },
    openCreate() {
      this.selectedAgent = null;
      this.modalOpen = true;
    },
    openEdit(agent) {
      this.selectedAgent = agent;
      this.modalOpen = true;
    },
    confirmRemove(agent) {
      this.pendingRemoval = agent;
      this.confirmOpen = true;
    },
    async doRemove() {
      if (!this.pendingRemoval) return;
      this.removing = true;
      try {
        await this.$agent.remove(this.pendingRemoval.id);
        this.confirmOpen = false;
        this.pendingRemoval = null;
      } catch (err) {
        console.error('Delete agent failed:', err);
      } finally {
        this.removing = false;
      }
    },
    onSaved() {
      this.$agent.fetchAll();
    },
  },
};
</script>

<style scoped>
.agents-heading {
  margin: 0;
  font-size: 22px;
}
.agents-subheading {
  font-size: 13px;
  color: #777;
  margin-top: 4px;
}
</style>
