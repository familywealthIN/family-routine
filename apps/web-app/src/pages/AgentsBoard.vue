<template>
  <!--
    The Agents page (`packages/design/Agents.dc.html`).

    Layout + composition only — every read and write belongs to a container
    (ARCHITECTURE.md §1). What the page does own is the two things that are
    genuinely page state: which agent is selected, and the toast.

    The split is the thing to get right: tablet and desktop render the list and
    the detail SIDE BY SIDE in a 2:3 flex split, with no sheet and the detail
    pane always mounted. Only phone turns the detail into a sheet (`top:56px`,
    near full screen). One `shell` value, from the one breakpoint rule.
  -->
  <!-- The chassis shell, through its container: `AppShellContainer` owns the one
       piece of server state the header needs (the points balance), so this page
       stays free of queries. -->
  <app-shell-container
    active="agents"
    title="Agents"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <template v-slot:header-actions>
      <button type="button" class="rn-shell__act rn-shell__act--primary rn-shell__act--label" data-testid="agents-new" @click="openNew">
        <i class="rn-mi rn-shell__act-glyph">add</i>New agent
      </button>
    </template>

    <div class="rn-agents" :class="`rn-agents--${shell}`" data-testid="agents-page">
      <div class="rn-agents__list">
        <agents-list-container
          :selected-id="selectedId"
          :shell="shell"
          @select="select"
          @summary="onSummary"
        />
      </div>

      <!-- Tablet + desktop: the detail IS the right-hand column. No sheet. -->
      <div v-if="!isPhone" class="rn-agents__pane" data-testid="agents-detail-pane">
        <div :key="selectedId" class="rn-agents__card">
          <agent-detail-container
            :agent-id="selectedId"
            :shell="shell"
            @edit="openEdit"
            @open-routine="openRoutine"
          />
        </div>
      </div>
    </div>

    <!-- Phone only: the same container, inside a near-full-screen sheet. -->
    <div v-if="isPhone" class="rn-agents__sheet-host" data-testid="agents-detail-sheet">
      <responsive-sheet
        :open="detailOpen"
        shell="phone"
        :closable="false"
        @close="closeDetail"
      >
        <agent-detail-container
          :agent-id="selectedId"
          shell="phone"
          @edit="openEdit"
          @open-routine="openRoutine"
        />
      </responsive-sheet>
    </div>

    <agent-form-container
      ref="form"
      :shell="shell"
      @saved="onSaved"
      @removed="onRemoved"
      @failed="onFailed"
    />

    <app-toast
      :shell="shell"
      :title="toast.title"
      :sub="toast.sub"
      :icon="toast.icon"
      :icon-color="toast.color"
      :seq="toast.seq"
    />
  </app-shell-container>
</template>

<script>
import AppToast from '@routine-notes/ui/molecules/AppToast/AppToast.vue';
import ResponsiveSheet from '@routine-notes/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import AgentsListContainer from '../containers/AgentsListContainer.vue';
import AgentDetailContainer from '../containers/AgentDetailContainer.vue';
import AgentFormContainer from '../containers/AgentFormContainer.vue';
import { signOut } from '../utils/signOut';

const noToast = () => ({
  title: '', sub: '', icon: 'check_circle', color: '#81c784', seq: 0,
});

export default {
  name: 'AgentsBoard',
  components: {
    AppShellContainer,
    AppToast,
    ResponsiveSheet,
    AgentsListContainer,
    AgentDetailContainer,
    AgentFormContainer,
  },
  data() {
    return {
      selectedId: '',
      detailOpen: false,
      summary: {
        count: 0, live: 0, error: false, ids: [],
      },
      toast: noToast(),
    };
  },
  computed: {
    /** The ONE breakpoint rule — `resolveShell`, never a second scheme. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    isPhone() {
      return this.shell === 'phone';
    },
    subLabel() {
      // A failed load must not be reported as "0 agents" (D-10).
      if (this.summary.error) return "Couldn't load your agents";
      const { count, live } = this.summary;
      const agents = `${count} ${count === 1 ? 'agent' : 'agents'}`;
      return `${agents} · ${live} live now`;
    },
  },
  methods: {
    onNavigate(key, item) {
      const route = item && item.route;
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onSignOut() {
      signOut(this);
    },
    /**
     * Tablet and desktop always show a detail, so the selection self-heals to the
     * first agent whenever the current one disappears (deleted, or a load that
     * replaced the list). Phone keeps an empty selection until something is
     * tapped — its sheet is closed anyway.
     */
    onSummary(summary) {
      this.summary = summary;
      const ids = summary.ids || [];
      if (this.selectedId && ids.indexOf(this.selectedId) !== -1) return;
      if (this.isPhone) {
        if (this.selectedId) {
          this.selectedId = '';
          this.detailOpen = false;
        }
        return;
      }
      this.selectedId = ids.length ? ids[0] : '';
    },
    select(id) {
      this.selectedId = id;
      if (this.isPhone) this.detailOpen = true;
    },
    closeDetail() {
      this.detailOpen = false;
    },
    openNew() {
      this.$refs.form.openNew();
    },
    openEdit(id) {
      const agent = this.$agent.agents.find((candidate) => candidate.id === id);
      if (agent) this.$refs.form.openEdit(agent);
    },
    openRoutine() {
      // The focus home is where a routine is actually worked. It has no
      // focus-a-specific-routine route yet (see the report), so this lands on it.
      this.$router.push('/home').catch(() => {});
    },
    /** Toast copy is always title + sub, the sub carrying the consequence. */
    notify(title, sub, icon, color) {
      this.toast = {
        title, sub, icon, color, seq: this.toast.seq + 1,
      };
    },
    /** `routineLabel` is the routine's name, resolved by the form container. */
    onSaved(agent, created, routineLabel) {
      if (agent && agent.id) this.selectedId = agent.id;
      if (created) {
        const label = routineLabel || this.routineLabelOf(agent);
        this.notify('Agent created', `Runs with ${label}`, 'smart_toy', '#64b5f6');
        return;
      }
      this.notify('Agent saved', (agent && agent.name) || '', 'check_circle', '#81c784');
    },
    onRemoved(agent) {
      this.detailOpen = false;
      this.notify('Agent deleted', `${(agent && agent.name) || 'The agent'} no longer fires events`, 'delete', '#ef9a9a');
    },
    onFailed(message) {
      this.notify("Couldn't save agent", message, 'error_outline', '#ef9a9a');
    },
    /** Never the raw `taskRef` - an ObjectId means nothing to the user. */
    routineLabelOf(agent) {
      return (agent && agent.routineName) || 'its routine';
    },
  },
};
</script>

<!-- Unscoped on purpose: the phone sheet rule reaches into ResponsiveSheet's own
     class, which a scoped block cannot address. Every selector is prefixed with
     the page's root class so nothing leaks (see the web-app CSS convention). -->
<style>
.rn-agents {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rn-agents__list {
  min-width: 0;
}

/* --- phone ------------------------------------------------------------- */

.rn-agents--phone {
  padding-top: 0;
}

/* The detail sheet is near-full-screen rather than a half sheet: it carries the
   lifecycle strip, both events and the result, which do not fit in a half. */
.rn-agents__sheet-host .rn-rsheet__panel--sheet {
  top: 56px;
  max-height: none;
}

/* --- tablet + desktop: the 2:3 split ----------------------------------- */

.rn-agents--tablet,
.rn-agents--desktop {
  flex-direction: row;
  gap: 12px;
  height: 100%;
  overflow: hidden;
}

.rn-agents--tablet .rn-agents__list,
.rn-agents--desktop .rn-agents__list {
  flex: 2 1 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  /* Room for the selected card's 2px inset ring, which would otherwise be
     clipped by the scroll container. */
  padding: 2px 4px 10px;
  margin: -2px -4px 0;
}

.rn-agents--tablet .rn-agents__list::-webkit-scrollbar,
.rn-agents--desktop .rn-agents__list::-webkit-scrollbar {
  display: none;
}

.rn-agents__pane {
  flex: 3 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.rn-agents__card {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
  padding: 8px 20px 20px;
  animation: rn-fade .25s ease;
}

.rn-agents__card::-webkit-scrollbar {
  display: none;
}
