<template>
  <container-box :isLoading="$agent.loading && !agents.length">
    <atom-card dark flat class="image-card">
      <atom-button
        absolute
        dark
        fab
        bottom
        right
        color="info"
        @click="openCreate"
      >
        <atom-icon>add</atom-icon>
      </atom-button>
      <atom-img
        class="image-card-img"
        src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=60"
        gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
      >
        <atom-container fill-height>
          <atom-layout align-center justify-center class="agent-stats-row">
            <div class="agent-stat-item text-xs-center">
              <div class="overline white--text stat-label">Agents</div>
              <div class="display-3 white--text font-weight-medium">{{ agents.length }}</div>
            </div>
            <v-divider vertical dark class="agent-stat-divider"></v-divider>
            <div class="agent-stat-item text-xs-center">
              <div class="overline white--text stat-label">Active</div>
              <div class="display-3 white--text font-weight-medium">{{ activeCount }}</div>
            </div>
            <v-divider vertical dark class="agent-stat-divider"></v-divider>
            <div class="agent-stat-item text-xs-center">
              <div class="overline white--text stat-label">Success</div>
              <div class="display-3 white--text font-weight-medium">{{ successTotal }}</div>
            </div>
            <v-divider vertical dark class="agent-stat-divider"></v-divider>
            <div class="agent-stat-item text-xs-center">
              <div class="overline white--text stat-label">Failures</div>
              <div class="display-3 white--text font-weight-medium">{{ failureTotal }}</div>
            </div>
          </atom-layout>
        </atom-container>
      </atom-img>
    </atom-card>
    <atom-card-text class="image-card-page px-0">
      <atom-data-table
        :headers="headers"
        :items="agents"
        class="elevation-0 mt-2"
        hide-actions
      >
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td>{{ routineName(props.item.taskRef) }}</td>
          <td>{{ statusLabel(props.item) }}</td>
          <td v-if="!isMobile" class="text-xs-right">{{ props.item.successCount || 0 }}</td>
          <td v-if="!isMobile" class="text-xs-right">{{ props.item.failureCount || 0 }}</td>
          <td class="text-xs-right agent-actions-cell">
            <atom-button flat icon class="mr-0" @click="openEdit(props.item)">
              <atom-icon>edit</atom-icon>
            </atom-button>
            <atom-button flat icon class="ml-0" @click="confirmRemove(props.item)">
              <atom-icon>delete</atom-icon>
            </atom-button>
          </td>
        </template>
        <template v-slot:no-data>
          <td :colspan="headers.length" class="text-xs-center pa-4">
            No agents yet. Create one to start automating routine actions —
            each agent fires a start event when its routine becomes active and
            (optionally) an end event when its goals are complete.
          </td>
        </template>
      </atom-data-table>
    </atom-card-text>

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
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import { AgentEditModal } from '@routine-notes/ui/organisms';
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomContainer,
  AtomDataTable,
  AtomIcon,
  AtomImg,
  AtomLayout,
} from '@routine-notes/ui/atoms';

const ROUTINE_ITEMS_QUERY = gql`
  query agentsRoutineItems {
    routineItems {
      id
      name
      time
    }
  }
`;

const ACTIVE_STATUSES = ['running', 'listening'];

export default {
  name: 'AgentsPage',
  components: {
    ContainerBox,
    AgentEditModal,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomContainer,
    AtomDataTable,
    AtomIcon,
    AtomImg,
    AtomLayout,
  },
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
    activeCount() {
      return this.agents.filter((a) => ACTIVE_STATUSES.includes(a.executionStatus)).length;
    },
    successTotal() {
      return this.agents.reduce((total, a) => total + (a.successCount || 0), 0);
    },
    failureTotal() {
      return this.agents.reduce((total, a) => total + (a.failureCount || 0), 0);
    },
    isMobile() {
      return this.$vuetify && this.$vuetify.breakpoint && this.$vuetify.breakpoint.xs;
    },
    headers() {
      const headers = [
        { text: 'Name', value: 'name', sortable: false },
        { text: 'Routine', value: 'taskRef', sortable: false },
        { text: 'Status', value: 'executionStatus', sortable: false },
      ];
      // Success/Failures totals already show in the hero stats; drop the
      // per-agent columns on phones so the Action buttons stay reachable.
      if (!this.isMobile) {
        headers.push(
          {
            text: 'Success', value: 'successCount', sortable: false, align: 'right',
          },
          {
            text: 'Failures', value: 'failureCount', sortable: false, align: 'right',
          },
        );
      }
      headers.push({
        text: 'Action', value: 'actions', sortable: false, align: 'right',
      });
      return headers;
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
.image-card-img {
  height: 180px;
  border-radius: 12px 12px 0 0;
}
@media (max-width: 600px) {
  .image-card-img {
    height: 260px;
  }
}
.agent-stats-row {
  gap: 0;
}
.agent-stat-item {
  flex: 1;
  padding: 4px 8px;
}
.agent-stat-divider >>> .v-divider--vertical {
  margin: 8px 0;
  min-height: 48px;
  opacity: 0.5;
}
.stat-label {
  letter-spacing: 2px !important;
  font-size: 11px !important;
  margin-bottom: 4px;
  opacity: 0.85;
}
.agent-actions-cell {
  width: 105px;
  padding: 0 8px 0 0 !important;
  white-space: nowrap;
}
</style>
