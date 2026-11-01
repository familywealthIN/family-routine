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
      <!-- Same rule as every header action: the + glyph alone on phone, the
           label beside it where there is room. -->
      <button
        type="button"
        class="rn-shell__act rn-shell__act--primary"
        :class="isPhone ? 'rn-shell__act--icon' : 'rn-shell__act--label'"
        title="New agent"
        data-testid="agents-new"
        @click="openNew"
      >
        <i class="rn-mi rn-shell__act-glyph">add</i>
        <span v-if="!isPhone">New agent</span>
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
<style src="@routine-notes/ui/styles/app/pages/AgentsBoard.css"></style>
