<template>
  <!--
    The goal-item page — `sheetGoal` in `packages/design/Routine Notes Final.dc.html`.

    One checklist row, opened. Everything the item is: its title, what it
    contributes, what an agent said about it, what it rolls up into, when it is
    due, how it is tagged, and its subtasks. The chassis `ResponsiveSheet`
    supplies the three presentations (phone bottom sheet · tablet 860 · desktop
    720), `MarkdownField` the CONTRIBUTION editor, `HierarchicalTagInput` the
    tags and `SubtaskEditor` the subtask rows — none of those is redrawn here.

    Pure presentational: no Apollo, no router, no store. Every write leaves as an
    event; `GoalItemSheetContainer` owns the mutations and the entity-level cache
    writes.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :closable="false"
    @close="close"
  >
    <template #header>
      <div v-if="creating" class="rn-gis__head">
        <div class="rn-gis__period" data-testid="goal-sheet-period">{{ periodLabel }}</div>
        <div class="rn-gis__head-actions">
          <button
            type="button"
            class="rn-gis__add"
            :disabled="!canCreate || saving"
            data-testid="goal-sheet-create"
            @click="submitCreate"
          >{{ saving ? 'Adding…' : 'Add' }}</button>
          <i
            class="rn-mi rn-gis__icon-btn"
            title="Close"
            data-testid="goal-sheet-close"
            @click="close"
          >close</i>
        </div>
      </div>
      <div v-else class="rn-gis__head">
        <div class="rn-gis__period" data-testid="goal-sheet-period">{{ periodLabel }}</div>
        <div class="rn-gis__head-actions">
          <!--
            A pill, not a checkbox: the three states are not a binary, and the
            agent-target one is information the user cannot set. Clicking it
            flips complete ⇄ open through the same mutation a checklist tap uses.
          -->
          <div
            class="rn-gis__status"
            :style="{ background: statusTint, color: statusColor }"
            :title="item && item.isComplete ? 'Mark as open' : 'Mark complete'"
            data-testid="goal-sheet-status"
            @click="$emit('toggle-status', item)"
          >
            <span class="rn-gis__status-dot" :style="{ background: statusColor }"></span>
            {{ statusLabel }}
          </div>
          <i
            class="rn-mi rn-gis__icon-btn rn-gis__icon-btn--danger"
            title="Delete goal item"
            data-testid="goal-sheet-delete"
            @click="$emit('delete', item)"
          >delete</i>
          <i
            class="rn-mi rn-gis__icon-btn"
            title="Close"
            data-testid="goal-sheet-close"
            @click="close"
          >close</i>
        </div>
      </div>
    </template>

    <div v-if="current" class="rn-gis">
      <textarea
        ref="title"
        class="rn-gis__title"
        rows="1"
        :placeholder="creating ? titlePlaceholder : 'Untitled'"
        :value="current.body"
        data-testid="goal-sheet-title"
        @input="onTitleInput"
        @change="onTitleChange"
        @keydown.enter.exact="onTitleEnter"
      ></textarea>

      <markdown-field
        ref="contribution"
        :value="current.contribution || ''"
        :editor-key="creating ? `new-${createKey}` : current.id"
        @input="onContributionInput"
        @commit="onCommitContribution"
      />

      <!-- AGENT RESULT — only when the end event actually saved a transcript. -->
      <div v-if="hasReward" class="rn-gis__reward" data-testid="goal-sheet-reward">
        <div class="rn-gis__reward-head">
          <div class="rn-gis__reward-avatar"><i class="rn-mi">smart_toy</i></div>
          <div class="rn-gis__reward-text">
            <div class="rn-gis__reward-label">AGENT RESULT</div>
            <div class="rn-gis__reward-meta">{{ rewardMeta }}</div>
          </div>
          <div v-if="rewardNew" class="rn-gis__reward-new" data-testid="goal-sheet-reward-new">
            NEW
          </div>
        </div>
        <div
          class="rn-gis__reward-body"
          :class="{ 'rn-gis__reward-body--clamped': !rewardOpen }"
          data-testid="goal-sheet-reward-body"
        >{{ rewardText }}</div>
        <div class="rn-gis__reward-actions">
          <div
            class="rn-gis__link"
            data-testid="goal-sheet-reward-more"
            @click="toggleReward"
          >
            <i class="rn-mi rn-gis__link-icon">
              {{ rewardOpen ? 'expand_less' : 'expand_more' }}
            </i>
            {{ rewardOpen ? 'Show less' : 'Show more' }}
          </div>
          <div
            class="rn-gis__link"
            data-testid="goal-sheet-transcript"
            @click="$emit('open-transcript', item)"
          >
            <i class="rn-mi rn-gis__link-icon">open_in_full</i>Full transcript
          </div>
        </div>
      </div>

      <div class="rn-gis__rule"></div>

      <!-- Linked to -->
      <div class="rn-gis__field">
        <div class="rn-gis__field-label">
          <i class="rn-mi rn-gis__field-icon">account_tree</i>Linked to
        </div>
        <!--
          The pickers are an ADD-time control, not an edit-time one.

          Adding: the routine and the parent goal it rolls up into, with the same
          two pickers the AI search toolbar uses — that is where the link is
          decided, and the sheet is the only place to decide it.

          Editing (Home, which is the only host that opens this sheet on a saved
          item): read-only chips. Re-pointing a saved item at a different routine
          or a different parent re-parents a node in the middle of the cascade,
          and the roll-up counts on both sides move silently with it — the
          `day -> week -> month` thresholds in chassis.md § "The goal cascade"
          are computed from what hangs off each parent. There was no confirm and
          no undo, just two dropdowns on an otherwise read-only summary.

          `linkLocked` stays, and still locks the ADD case too: Year Goals fixes
          what a new goal rolls up into, so its sheet has nothing to pick either.
        -->
        <div
          v-if="creating && !linkLocked"
          class="rn-gis__field-value rn-gis__field-value--grow rn-gis__link-pickers"
        >
          <goal-task-selector
            class="rn-gis__picker"
            :items="routines"
            :value="current.taskRef || null"
            item-value="id"
            label="Routine"
            prepend-icon=""
            prepend-inner-icon="history"
            hide-details
            solo
            flat
            :mobile="isPhone"
            data-testid="goal-sheet-routine-picker"
            @input="setLink({ taskRef: $event || '' })"
          />
          <goal-ref-selector
            class="rn-gis__picker"
            :items="goalRefOptions"
            :tasklist="routines"
            :task-ref="current.taskRef || null"
            :value="current.goalRef || null"
            :label="goalRefPlaceholder"
            prepend-icon=""
            prepend-inner-icon="timeline"
            hide-details
            solo
            flat
            :mobile="isPhone"
            data-testid="goal-sheet-goal-ref-picker"
            @input="setLink({ goalRef: $event || '' })"
          />
        </div>
        <div v-else class="rn-gis__field-value">
          <div v-if="routineLabel" class="rn-gis__chip" data-testid="goal-sheet-routine">
            <i class="rn-mi rn-gis__chip-icon">history</i>{{ routineLabel }}
          </div>
          <template v-if="goalRefLabel">
            <i v-if="routineLabel" class="rn-mi rn-gis__arrow">arrow_forward</i>
            <div class="rn-gis__chip rn-gis__chip--goal" data-testid="goal-sheet-goal-ref">
              <i class="rn-mi">timeline</i>
              <span class="rn-gis__chip-text">{{ goalRefLabel }}</span>
            </div>
          </template>
          <span v-else class="rn-gis__muted" data-testid="goal-sheet-no-goal-ref">
            Not linked to a week goal
          </span>
        </div>
      </div>

      <!-- Date -->
      <div class="rn-gis__field">
        <div class="rn-gis__field-label">
          <i class="rn-mi rn-gis__field-icon">event</i>Date
        </div>
        <!--
          Adding: the AI search modal's date selector — period toggle and all,
          unless `dateTaskMode` pins it to a day. Locked by the caller (Year
          Goals) it is just the label.
        -->
        <div v-if="creating" class="rn-gis__field-value rn-gis__field-value--grow">
          <div v-if="dateLocked" class="rn-gis__date" data-testid="goal-sheet-date">{{ dateLabel }}</div>
          <molecule-date-selector
            v-else
            class="rn-gis__picker"
            :value="form.date"
            :period="form.period"
            :task-mode="dateTaskMode"
            :min-date="minDate"
            :mobile="isPhone"
            label=""
            :placeholder="dateTaskMode ? 'Select date' : 'Select period'"
            prepend-icon=""
            prepend-inner-icon="event"
            hide-details
            solo
            flat
            data-testid="goal-sheet-date-picker"
            @input="setDate"
            @update:period="setPeriod"
          />
        </div>
        <div v-else class="rn-gis__field-value">
          <div class="rn-gis__date" data-testid="goal-sheet-date">{{ dateLabel }}</div>
          <!--
            A past day is read-only on purpose: `updateGoalItem`'s move path
            rewrites the item's owning day document, and moving yesterday's work
            onto yesterday is not a thing the user can want. The lock says so
            rather than offering pills that then refuse.
          -->
          <div v-if="dateLocked" class="rn-gis__locked" data-testid="goal-sheet-date-locked">
            <i class="rn-mi rn-gis__locked-icon">lock</i>past dates can’t change
          </div>
          <div v-else class="rn-gis__date-opts">
            <div
              v-for="option in dateOptions"
              :key="option.key"
              class="rn-gis__date-opt"
              :class="{ 'rn-gis__date-opt--on': option.active }"
              :data-testid="`goal-sheet-date-${option.key}`"
              @click="pickDate(option)"
            >{{ option.label }}</div>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div class="rn-gis__field rn-gis__field--tags">
        <div class="rn-gis__field-label">
          <i class="rn-mi rn-gis__field-icon">tag</i>Tags
        </div>
        <div class="rn-gis__field-value rn-gis__field-value--grow">
          <hierarchical-tag-input
            :value="current.tags || []"
            :universe="tagUniverse"
            :usage="tagUsage"
            usage-noun="goal"
            @input="onTagsInput"
          />
        </div>
      </div>

      <!-- Subtasks belong to a saved item; a new one gets them once it exists. -->
      <subtask-editor
        v-if="!creating"
        :subtasks="item.subTasks || []"
        @add="$emit('add-subtask', { item, body: $event })"
        @toggle="$emit('toggle-subtask', { item, subtask: $event })"
        @rename="$emit('rename-subtask', { item, ...$event })"
        @move-up="$emit('move-subtask-up', { item, subtask: $event })"
        @remove="$emit('remove-subtask', { item, subtask: $event })"
      />
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import MarkdownField from '../../molecules/MarkdownField/MarkdownField.vue';
import SubtaskEditor from '../../molecules/SubtaskEditor/SubtaskEditor.vue';
import HierarchicalTagInput from '../../molecules/HierarchicalTagInput/HierarchicalTagInput.vue';
import MoleculeDateSelector from '../../molecules/DateSelector/DateSelector.vue';
import GoalTaskSelector from '../../molecules/GoalTaskSelector/GoalTaskSelector.vue';
import GoalRefSelector from '../../molecules/GoalRefSelector/GoalRefSelector.vue';
import { htmlToText } from '../../utils/htmlPreview';

/** A lifetime goal has no calendar date; the server files it under this one. */
const LIFETIME_DATE = '01-01-1970';

/** The parent a new goal of each period rolls up into — the picker's label. */
const PARENT_NOUN = {
  day: 'week goal', week: 'month goal', month: 'year goal', year: 'lifetime goal',
};

const emptyForm = (seed = {}) => ({
  body: '',
  contribution: '',
  tags: [],
  period: seed.period || 'day',
  date: seed.date || '',
  taskRef: seed.taskRef || '',
  goalRef: seed.goalRef || '',
});

/** The three states the design names, with their palette tokens. */
const STATUS = {
  complete: { label: 'Complete', color: '#4CAF50', tint: 'rgba(76,175,80,.12)' },
  ready: { label: 'Ready · agent target', color: '#1976d2', tint: 'rgba(25,118,210,.1)' },
  open: { label: 'Open', color: 'rgba(0,0,0,.54)', tint: 'rgba(0,0,0,.06)' },
};

export default {
  name: 'OrganismGoalItemSheet',
  components: {
    ResponsiveSheet,
    MarkdownField,
    SubtaskEditor,
    HierarchicalTagInput,
    MoleculeDateSelector,
    GoalTaskSelector,
    GoalRefSelector,
  },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /**
     * 'edit' — `item` is a saved GoalItem and every change leaves as its own
     * event. 'create' — the sheet holds a draft seeded from `seed` and emits
     * one `create` with all of it. Same sheet for adding and editing, on every
     * page that adds a goal.
     */
    mode: { type: String, default: 'edit' },
    /** Edit only: the item's period (GoalItem does not carry its own). */
    period: { type: String, default: 'day' },
    /** Create only: `{ period, date, taskRef, goalRef }` to start the draft from. */
    seed: { type: Object, default: () => ({}) },
    /** Create only: a save is in flight — the Add button waits for it. */
    saving: { type: Boolean, default: false },
    /** Create only: the date selector offers days only, no period toggle. */
    dateTaskMode: { type: Boolean, default: false },
    minDate: { type: String, default: '' },
    titlePlaceholder: { type: String, default: 'What do you want to get done?' },
    /** The GoalItem, decorated with `ready` (an assigned agent's target). */
    item: { type: Object, default: null },
    /** `[{ id, name, time }]` — the routine picker's choices. */
    routines: { type: Array, default: () => [] },
    /** Goal items one period up — the parent-goal picker's choices. */
    goalRefOptions: { type: Array, default: () => [] },
    /**
     * Show Linked to as read-only chips even while ADDING. Year Goals sets it:
     * there the plan decides what a new goal rolls up into. Editing is already
     * read-only without this — see the template.
     */
    linkLocked: { type: Boolean, default: false },
    /** "Day goal · 12 Sep 2026". */
    periodLabel: { type: String, default: '' },
    /** "Start Work · 09:00", or "Inbox" for an item with no routine. */
    routineLabel: { type: String, default: 'Inbox' },
    /** The parent week goal's body. Empty renders "Not linked to a week goal". */
    goalRefLabel: { type: String, default: '' },
    dateLabel: { type: String, default: '' },
    dateLocked: { type: Boolean, default: false },
    /** `[{ key, label, active }]` — today / tomorrow / the next weekday. */
    dateOptions: { type: Array, default: () => [] },
    tagUniverse: { type: Array, default: () => [] },
    tagUsage: { type: Object, default: () => ({}) },
    /** "Updated by PR Summarizer · end event · Today 11:42". */
    rewardMeta: { type: String, default: '' },
    /** The transcript has not been looked at yet. */
    rewardNew: { type: Boolean, default: false },
  },
  data() {
    return {
      rewardOpen: false,
      /** Create mode's draft. Unused when editing. */
      form: emptyForm(this.seed),
      /** Bumped per open so the contribution editor starts blank each time. */
      createKey: 0,
    };
  },
  computed: {
    creating() {
      return this.mode === 'create';
    },
    /** What the fields read: the draft when adding, the item when editing. */
    current() {
      return this.creating ? this.form : this.item;
    },
    canCreate() {
      return !!(this.form.body.trim() && this.form.date);
    },
    isPhone() {
      return this.shell === 'phone';
    },
    goalRefPlaceholder() {
      const period = this.creating ? this.form.period : this.period;
      return `Rolls up into a ${PARENT_NOUN[period] || 'goal'}`;
    },
    statusKey() {
      if (!this.item) return 'open';
      if (this.item.isComplete) return 'complete';
      return this.item.ready ? 'ready' : 'open';
    },
    statusLabel() {
      return STATUS[this.statusKey].label;
    },
    statusColor() {
      return STATUS[this.statusKey].color;
    },
    statusTint() {
      return STATUS[this.statusKey].tint;
    },
    hasReward() {
      return !!(this.item && this.item.reward);
    },
    /** Text, never markup — see utils/htmlPreview.js for why. */
    rewardText() {
      return this.hasReward ? htmlToText(this.item.reward) : '';
    },
  },
  watch: {
    /** A fresh item gets a fresh sheet: collapsed transcript, sized title. */
    'item.id': {
      handler() {
        this.rewardOpen = false;
        this.$nextTick(this.sizeTitle);
      },
      immediate: true,
    },
    open(isOpen) {
      if (isOpen && this.creating) this.resetForm();
      if (isOpen) this.$nextTick(this.sizeTitle);
    },
  },
  created() {
    // The parent goals depend on the draft's period/date; ask for them.
    if (this.creating) this.emitLinkContext();
  },
  methods: {
    close() {
      // An open markdown editor has unsaved text; committing it is the last
      // thing that happens before the sheet goes away.
      if (this.$refs.contribution) this.$refs.contribution.flush();
      this.$emit('close');
    },
    resetForm() {
      this.form = emptyForm(this.seed);
      this.createKey += 1;
      this.emitLinkContext();
    },
    /** Tells the container which period's goals the parent picker needs. */
    emitLinkContext() {
      this.$emit('link-context', { period: this.form.period, date: this.form.date });
    },
    submitCreate() {
      if (!this.canCreate || this.saving) return;
      this.$emit('create', {
        ...this.form,
        body: this.form.body.trim(),
        tags: (this.form.tags || []).slice(),
      });
    },
    onTitleInput(event) {
      if (this.creating) this.form.body = event.target.value || '';
      this.grow(event.target);
    },
    /** Enter adds when creating; when editing it stays a newline-free title. */
    onTitleEnter(event) {
      if (!this.creating) return;
      event.preventDefault();
      this.submitCreate();
    },
    onContributionInput(contribution) {
      if (this.creating) {
        this.form.contribution = contribution;
        return;
      }
      this.$emit('input-contribution', { item: this.item, contribution });
    },
    onTagsInput(tags) {
      if (this.creating) {
        this.form.tags = tags || [];
        return;
      }
      this.$emit('update-tags', { item: this.item, tags });
    },
    /** Routine and/or parent goal. Editing writes through; adding drafts it. */
    /*
     * Draft-only. The pickers render while adding and nowhere else, so there is
     * no saved item to write through — the `update-link` emit that used to live
     * here went with the edit-time pickers (see the Linked to block).
     */
    setLink(changes) {
      Object.assign(this.form, changes);
    },
    setDate(date) {
      this.form.date = date || '';
      // The parent goals live one period up from THIS date.
      this.form.goalRef = '';
      this.emitLinkContext();
    },
    /**
     * A date is only meaningful for the period it was picked under — a week is
     * filed under its Friday, a month under its last day — so a new period
     * starts without one (lifetime has exactly one).
     */
    setPeriod(period) {
      if (!period || period === this.form.period) return;
      this.form.period = period;
      this.form.date = period === 'lifetime' ? LIFETIME_DATE : '';
      this.form.goalRef = '';
      this.emitLinkContext();
    },
    /**
     * The field autosaves, and its last save can fire as it is torn down —
     * after the page has already cleared `item`. With no item there is nothing
     * to save it onto. A draft has nothing to save yet either.
     */
    onCommitContribution(contribution) {
      if (this.creating || !this.item) return;
      this.$emit('commit-contribution', { item: this.item, contribution });
    },
    onTitleChange(event) {
      if (this.creating) return;
      const body = (event.target.value || '').trim();
      if (!body || !this.item || body === String(this.item.body || '').trim()) return;
      this.$emit('update-title', { item: this.item, body });
    },
    sizeTitle() {
      this.grow(this.$refs.title);
    },
    grow(el) {
      if (!el || !el.style) return;
      el.style.height = 'auto';
      if (el.scrollHeight) el.style.height = `${el.scrollHeight}px`;
    },
    pickDate(option) {
      if (!option || option.active) return;
      this.$emit('pick-date', { item: this.item, option });
    },
    toggleReward() {
      this.rewardOpen = !this.rewardOpen;
      if (this.rewardNew) this.$emit('reward-seen', this.item);
    },
  },
};
</script>

<style>
.rn-gis {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding-bottom: 12px;
}

.rn-gis__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.rn-gis__period {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-gis__head-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.rn-gis__status {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  margin-right: 2px;
  border-radius: 13px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.rn-gis__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.rn-gis__icon-btn {
  font-size: 22px;
  color: rgba(0, 0, 0, .6);
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
}

.rn-gis__icon-btn--danger:hover {
  background: rgba(211, 47, 47, .08);
  color: #d32f2f;
}

.rn-gis__title {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  font: inherit;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
  color: #1a1a1a;
  padding: 0;
  overflow: hidden;
}

.rn-gis__reward {
  margin-top: 14px;
  border-radius: 12px;
  background: #f6f9fc;
  border: 1px solid rgba(40, 139, 213, .18);
  overflow: hidden;
}

.rn-gis__reward-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 6px;
}

.rn-gis__reward-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #288bd5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rn-gis__reward-avatar .rn-mi {
  font-size: 16px;
}

.rn-gis__reward-text {
  flex: 1;
  min-width: 0;
}

.rn-gis__reward-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: #1f6fab;
}

.rn-gis__reward-meta {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-gis__reward-new {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .4px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #FF9800;
  color: #fff;
  flex-shrink: 0;
}

.rn-gis__reward-body {
  padding: 0 14px 2px 48px;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(0, 0, 0, .82);
  white-space: pre-wrap;
  overflow-wrap: break-word;
  max-height: 600px;
  overflow: hidden;
  transition: max-height .25s;
}

.rn-gis__reward-body--clamped {
  max-height: 96px;
  mask-image: linear-gradient(#000 60%, transparent);
  -webkit-mask-image: linear-gradient(#000 60%, transparent);
}

.rn-gis__reward-actions {
  display: flex;
  gap: 2px;
  padding: 2px 8px 8px 40px;
}

.rn-gis__link {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-gis__link:hover {
  background: rgba(40, 139, 213, .08);
}

.rn-gis__link-icon {
  font-size: 16px;
}

.rn-gis__rule {
  height: 1px;
  background: rgba(0, 0, 0, .08);
  margin: 14px 0 10px;
}

.rn-gis__field {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 36px;
}

.rn-gis__field--tags {
  align-items: flex-start;
}

.rn-gis__field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 118px;
  flex-shrink: 0;
  height: 34px;
  color: rgba(0, 0, 0, .5);
  font-size: 13px;
}

.rn-gis__field-icon {
  font-size: 17px;
}

.rn-gis__field-value {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 34px;
  font-size: 13px;
}

.rn-gis__field-value--grow {
  display: block;
}

.rn-gis__chip {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 6px;
  background: #f4f4f4;
  color: rgba(0, 0, 0, .8);
  white-space: nowrap;
  max-width: 100%;
  min-width: 0;
}

.rn-gis__chip-icon {
  font-size: 15px;
  color: rgba(0, 0, 0, .5);
}

.rn-gis__chip--goal {
  background: rgba(255, 152, 0, .1);
  color: #9a5b00;
}

.rn-gis__chip--goal .rn-mi {
  font-size: 15px;
}

.rn-gis__chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-gis__arrow {
  font-size: 16px;
  color: rgba(0, 0, 0, .35);
}

.rn-gis__muted {
  color: rgba(0, 0, 0, .5);
}

.rn-gis__date {
  font-size: 14px;
  color: rgba(0, 0, 0, .85);
}

.rn-gis__locked {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-gis__locked-icon {
  font-size: 13px;
}

.rn-gis__date-opts {
  display: flex;
  gap: 4px;
}

.rn-gis__date-opt {
  height: 24px;
  padding: 0 9px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  background: #fff;
  color: rgba(0, 0, 0, .6);
  border: 1px solid rgba(0, 0, 0, .12);
  cursor: pointer;
}

.rn-gis__date-opt--on {
  background: rgba(40, 139, 213, .12);
  color: #1f6fab;
  border-color: rgba(40, 139, 213, .45);
}

/* ---- create mode / pickers ---- */
.rn-gis__add {
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: #288bd5;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.rn-gis__add:disabled {
  background: rgba(0, 0, 0, .12);
  color: rgba(0, 0, 0, .38);
  cursor: default;
}

/* Routine and parent goal side by side; stacked once the sheet is narrow. */
.rn-gis__link-pickers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rn-gis__link-pickers > .rn-gis__picker {
  flex: 1 1 200px;
  min-width: 0;
}

/* The toolbar's Vuetify pickers, tuned to sit on the sheet's field rows. */
.rn-gis__picker .v-input__slot {
  min-height: 34px !important;
  background: rgba(0, 0, 0, .04) !important;
  border-radius: 10px !important;
  font-size: 13px;
}
</style>
