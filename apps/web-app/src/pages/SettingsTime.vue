<template>
  <!--
    The Routines screen — `/settings`, route name `routines`
    (packages/design/Routines.dc.html).

    Layout + composition only; every read and write belongs to a container
    (ARCHITECTURE.md §1). What the page genuinely owns is page state — which
    routine is selected, which one just saved, and the toast — plus the two
    cross-domain consequences of a save that no single container may reach for:
    the agent editor, and the daily-task-target notice (§6).

    `AppShellContainer` owns the one piece of server state the chassis header
    needs (the points balance), so this page runs no query of its own.
  -->
  <app-shell-container
    active="routines"
    title="Routines"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <template v-slot:header-actions>
      <button
        type="button"
        class="rn-shell__act rn-shell__act--primary"
        :class="isPhone ? 'rn-shell__act--icon' : 'rn-shell__act--label'"
        title="New routine"
        data-testid="routines-new"
        @click="openNew()"
      >
        <i class="rn-mi rn-shell__act-glyph">add</i>
        <span v-if="!isPhone">New routine</span>
      </button>
    </template>

    <!-- Renderless: the year-goal link map feeds BOTH the timeline chip and the
         editor's LINKED row, so it has one owner and the page hands it to both. -->
    <routine-year-goal-links-container @links="onYearGoalLinks" />

    <div class="rn-routines" :class="`rn-routines--${shell}`" data-testid="routines-page">
      <routine-day-plan-container
        ref="plan"
        :shell="shell"
        :selected-id="selectedId"
        :flash-id="flashId"
        :year-goals="yearGoalLinks"
        @items="onItems"
        @select="onSelect"
        @open="openEdit"
        @insert="openNew"
        @new="openNew()"
      />
    </div>

    <routine-item-editor-container
      ref="editor"
      :shell="shell"
      :siblings="siblings"
      :tag-universe="tagUniverse"
      :tag-usage="tagUsage"
      :year-goals="yearGoalLinks"
      @saved="onSaved"
      @removed="onRemoved"
      @failed="onFailed"
      @manage-agent="manageAgent"
      @open-goal="openYearGoal"
    />

    <!-- The mock leaves "Manage" unwired. The real agent editor is the chassis
         AgentFormContainer, which owns the agent write CRUD; it is mounted AFTER
         the routine editor so its own sheet stacks above it. -->
    <agent-form-container
      ref="agentForm"
      :shell="shell"
      @saved="onAgentSaved"
      @removed="onAgentRemoved"
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
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import { countLabel, pointsLabel, totalPoints } from '@routine-notes/ui/utils/dayDial';
import { MeasurementMixin } from '@/utils/measurementMixins';
import AppShellContainer from '../containers/AppShellContainer.vue';
import AgentFormContainer from '../containers/AgentFormContainer.vue';
import RoutineDayPlanContainer from '../containers/RoutineDayPlanContainer.vue';
import RoutineItemEditorContainer from '../containers/RoutineItemEditorContainer.vue';
import RoutineYearGoalLinksContainer from '../containers/RoutineYearGoalLinksContainer.vue';
import getJSON from '../utils/getJSON';
import { describeSlotChanges } from '../utils/routineSlotCounts';
import { signOut } from '../utils/signOut';

export const LOGOUT_KEY = 'logout';
/** Where the LINKED year-goal row goes. `/year-goals` is the un-linked case. */
export const YEAR_GOALS_ROUTE = '/year-goals';

const noToast = () => ({
  title: '', sub: '', icon: 'check_circle', color: '#81c784', seq: 0,
});

export default {
  name: 'SettingsTime',

  mixins: [MeasurementMixin],

  components: {
    AppShellContainer,
    AppToast,
    AgentFormContainer,
    RoutineDayPlanContainer,
    RoutineItemEditorContainer,
    RoutineYearGoalLinksContainer,
  },

  data() {
    return {
      /** The sorted, de-duped list the read container publishes. */
      items: [],
      /**
       * Whether that list has arrived. The container publishes nothing before
       * its first result, so until then `items: []` means "unknown" — and the
       * day's points budget cannot be worked out from it (E2E BUG-5).
       */
      loaded: false,
      /**
       * A New routine asked for before the list arrived: `{ minutes }`. It opens
       * the moment the list lands rather than against an empty day — or being
       * dropped, which would read as a dead button.
       */
      pendingNew: null,
      yearGoalLinks: {},
      /**
       * `{ id, name, time }` as they stood when the editor opened. Snapshotted
       * there rather than read back at save time, because a mutation result that
       * has already landed in the cache would make "before" and "after"
       * identical and the slot-change notice would never fire.
       */
      scheduleBefore: [],
      selectedId: '',
      flashId: '',
      flashTimer: null,
      toast: noToast(),
      /** The tag vocabulary the user has typed before — same source as before. */
      storedTags: getJSON(localStorage.getItem('userTags'), []),
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
    /** "7 routines · 83 points a day" (+ the hint tablet and desktop have room for). */
    subLabel() {
      if (!this.loaded) return 'Loading routines…';
      const base = `${countLabel(this.items.length)} · ${totalPoints(this.items)} points a day`;
      return this.isPhone ? base : `${base} · tap a routine on the dial or the list`;
    },
    /**
     * `{ id, time, points }` — the two things the editor needs about the OTHER
     * routines: `time` for its "Until 12:30 · 3h 30m" caption, and `points`
     * because the day's 100-point budget is shared across the whole list.
     */
    siblings() {
      return this.items.map((item) => ({ id: item.id, time: item.time, points: item.points }));
    },
    /** Everything already in use, so the autocomplete knows the real vocabulary. */
    tagUniverse() {
      const seen = new Set(this.storedTags.filter(Boolean).map(String));
      this.items.forEach((item) => (item.tags || []).forEach((tag) => {
        if (tag) seen.add(String(tag));
      }));
      return [...seen];
    },
    /** tag -> how many routines carry it or something inside it. */
    tagUsage() {
      const counts = {};
      this.items.forEach((item) => {
        const own = new Set();
        (item.tags || []).forEach((tag) => {
          const t = String(tag || '');
          if (!t) return;
          own.add(t);
          // A parent counts every routine filed anywhere beneath it.
          const parts = t.split(':');
          for (let i = 1; i < parts.length; i += 1) own.add(parts.slice(0, i).join(':'));
        });
        own.forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
      });
      return counts;
    },
  },

  mounted() {
    this.trackPageView('routine_settings');
  },

  beforeDestroy() {
    clearTimeout(this.flashTimer);
  },

  methods: {
    onItems(items) {
      this.items = items;
      this.loaded = true;
      // A selection that no longer exists would dim every arc and say nothing.
      if (this.selectedId && !items.some((item) => String(item.id) === this.selectedId)) {
        this.selectedId = '';
      }
      if (this.pendingNew) {
        const { minutes } = this.pendingNew;
        this.pendingNew = null;
        this.openNew(minutes);
      }
    },

    onYearGoalLinks(links) {
      this.yearGoalLinks = links || {};
    },

    /** An arc toggles the selection; it does not open the editor. */
    onSelect(id) {
      this.selectedId = this.selectedId === id ? '' : String(id || '');
    },

    openNew(minutes = null) {
      if (!this.loaded) {
        this.pendingNew = { minutes };
        return;
      }
      this.snapshotSchedule();
      this.$refs.editor.openNew(minutes);
    },

    /** A timeline row both selects and opens — the design's `open(r)`. */
    openEdit(id) {
      const routine = this.items.find((item) => String(item.id) === String(id));
      if (!routine) return;
      this.snapshotSchedule();
      this.selectedId = String(id);
      this.$refs.editor.openEdit(routine);
    },

    snapshotSchedule() {
      this.scheduleBefore = this.items.map(({ id, name, time }) => ({ id, name, time }));
    },

    /** The same schedule with this save applied — the "after" side of D-03. */
    scheduleAfter(saved, created) {
      const before = this.scheduleBefore;
      if (!saved) return before;
      const next = { id: saved.id, name: saved.name, time: saved.time };
      if (created) return [...before, next];
      return before.map((item) => (String(item.id) === String(saved.id) ? next : item));
    },

    onSaved(saved, created) {
      if (!saved) return;
      this.selectedId = String(saved.id);
      this.flash(saved.id);
      this.trackBusinessEvent(created ? 'routine_item_created' : 'routine_item_updated', {
        item_id: saved.id,
        item_name: saved.name,
        time: saved.time,
        points: saved.points,
        steps_count: (saved.steps || []).length,
        tags_count: (saved.tags || []).length,
      });
      this.notifySave(saved, created);
    },

    /**
     * One toast, and the sub carries the consequence (chassis.md § Toast).
     *
     * When the new time re-slices a NEIGHBOUR's daily task target, that is the
     * consequence worth printing — D-03 was filed because moving Wind-down took
     * "Start Work 0/1" to "0/6" with nothing on screen saying it had. Otherwise
     * the sub is the design's "{name} · {time} · +{pts} pts".
     */
    notifySave(saved, created) {
      const changes = describeSlotChanges(this.scheduleBefore, this.scheduleAfter(saved, created));
      const title = created ? 'Routine added' : 'Routine saved';
      if (changes.length) {
        this.notify(title, `Daily task targets moved — ${changes.join(', ')}`, 'schedule', '#ffb74d');
        return;
      }
      const tags = (saved.tags || []).length;
      const tagLabel = tags ? ` · ${tags} ${tags === 1 ? 'tag' : 'tags'}` : '';
      const sub = `${saved.name} · ${saved.time} · ${pointsLabel(saved.points)}${tagLabel}`;
      this.notify(title, sub, created ? 'add_task' : 'check_circle', '#81c784');
    },

    onRemoved(removed) {
      const name = (removed && removed.name) || 'The routine';
      if (removed && String(removed.id) === this.selectedId) this.selectedId = '';
      this.trackBusinessEvent('routine_item_deleted', { item_id: removed && removed.id, item_name: name });
      this.notify('Routine deleted', `${name} no longer earns points`, 'delete', '#ef9a9a');
    },

    onFailed(message) {
      this.notify("Couldn't save", message || 'An unexpected error occurred', 'error_outline', '#ef9a9a');
    },

    /**
     * "Manage" on the editor's agent row. The mock leaves it unwired; the real
     * editor is the chassis agent form, opened on the bound agent or prefilled
     * with this routine when there is none.
     */
    manageAgent(routineId) {
      if (!routineId) return;
      const agent = this.$agent && this.$agent.getByTaskRef(String(routineId));
      if (agent) this.$refs.agentForm.openEdit(agent);
      else this.$refs.agentForm.openNew(String(routineId));
    },

    onAgentSaved(agent, created) {
      const name = (agent && agent.name) || 'The agent';
      this.notify(
        created ? 'Agent created' : 'Agent saved',
        `${name} runs with this routine`,
        'smart_toy',
        '#64b5f6',
      );
    },

    onAgentRemoved(agent) {
      this.notify('Agent deleted', `${(agent && agent.name) || 'The agent'} no longer fires events`, 'delete', '#ef9a9a');
    },

    /** The LINKED year-goal row. `/year-goals/:id` when one is linked. */
    openYearGoal(goalId) {
      this.goTo(goalId ? `${YEAR_GOALS_ROUTE}/${goalId}` : YEAR_GOALS_ROUTE);
    },

    /** `rn-flash` is one-shot, so the id has to be dropped again. */
    flash(id) {
      clearTimeout(this.flashTimer);
      this.flashId = String(id);
      this.flashTimer = setTimeout(() => { this.flashId = ''; }, 900);
    },

    notify(title, sub, icon, color) {
      this.toast = {
        title, sub, icon, color, seq: this.toast.seq + 1,
      };
    },

    goTo(route) {
      if (!route || (this.$route && this.$route.path === route)) return;
      this.$router.push(route).catch(() => {});
    },

    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      this.goTo(item && item.route);
    },

    onSignOut() {
      signOut(this);
    },
  },
};
</script>

<!-- Unscoped on purpose — the header button is slotted into AppShell, which a
     scoped block cannot reach. Every selector carries the page's root class, so
     nothing leaks into the legacy toolbar layouts (see the web-app CSS
     convention in MEMORY). -->
<style>
.rn-routines {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.rn-routines--tablet,
.rn-routines--desktop {
  flex: 1;
  height: 100%;
}

.rn-routines--tablet > *,
.rn-routines--desktop > * {
  flex: 1;
  min-height: 0;
}
