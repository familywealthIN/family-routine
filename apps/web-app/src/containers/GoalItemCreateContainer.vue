<template>
  <GoalItemSheet
    mode="create"
    :open="open"
    :shell="shell"
    :seed="seed"
    :saving="saving"
    :period-label="title"
    :title-placeholder="placeholder"
    :date-task-mode="dateTaskMode"
    :date-locked="locked"
    :date-label="lockedDateLabel"
    :link-locked="locked"
    :routine-label="lockedRoutineLabel"
    :goal-ref-label="lockedGoalRefLabel"
    :routines="routines"
    :goal-ref-options="goalRefOptions"
    :tag-universe="tagUniverse"
    :tag-usage="tagUsage"
    @close="$emit('close')"
    @link-context="loadParentGoals"
    @create="onCreate"
  />
</template>

<script>
/**
 * Write container for adding a goal item (ARCHITECTURE.md § 2): one organism,
 * one mutation — `addGoalItem` — and nothing else.
 *
 * The organism is `GoalItemSheet` in create mode: the same sheet Home opens on
 * a checklist row, so adding and editing a goal look and behave the same. Goals
 * and Year Goals mount this; Home's "Add task" deliberately keeps the AI search
 * modal for its AI-enhanced task creation. The date comes from
 * the AI search modal's `DateSelector`, and Linked to (routine + the parent goal
 * one period up) is editable unless the caller locks it.
 *
 * Locked (`locked`) is Year Goals: there the plan, not the user, decides the
 * period, date and parent — the sheet shows them as read-only and the caller's
 * labels describe them.
 *
 * It delegates to `$goals.addGoalItem`, which already owns this write's
 * optimistic response and its cache update (`composables/useGoalMutations`).
 * That update only knows the dashboard's queries, so the container reports
 * `created` and the page refetches the display reads it owns.
 */
import GoalItemSheet from '@routine-notes/ui/organisms/GoalItemSheet/GoalItemSheet.vue';
import { goalDateFor } from '../utils/goalCascade';
import { fetchParentGoalOptions } from '../utils/parentGoalOptions';

const PERIOD_NOUN = {
  day: 'day goal',
  week: 'week goal',
  month: 'month goal',
  year: 'year goal',
  lifetime: 'lifetime goal',
};

export default {
  name: 'GoalItemCreateContainer',

  components: { GoalItemSheet },

  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The period the sheet starts on (the ladder step / tab it opened from). */
    period: { type: String, default: 'day' },
    /** Start date. Empty derives it from `period` and `selectedDate`. */
    date: { type: String, default: '' },
    /** Pre-selected routine — e.g. the one whose window contains now. */
    taskRef: { type: String, default: '' },
    /** Pre-selected parent goal. */
    goalRef: { type: String, default: '' },
    routines: { type: Array, default: () => [] },
    selectedDate: { type: String, required: true },
    today: { type: String, required: true },
    /** Days only — no period toggle, for a caller that only adds day tasks. */
    dateTaskMode: { type: Boolean, default: false },
    /**
     * Period, date and Linked to are fixed by the caller and shown read-only.
     * The three labels below are what the sheet shows for them.
     */
    locked: { type: Boolean, default: false },
    lockedDateLabel: { type: String, default: '' },
    lockedRoutineLabel: { type: String, default: 'Inbox' },
    lockedGoalRefLabel: { type: String, default: '' },
    /** Header text. Empty: "New day goal", "New week goal", … */
    heading: { type: String, default: '' },
    placeholder: { type: String, default: 'What do you want to get done?' },
    tagUniverse: { type: Array, default: () => [] },
    tagUsage: { type: Object, default: () => ({}) },
  },

  data() {
    return {
      /** A create is in flight — a second Enter must not file a duplicate. */
      saving: false,
      goalRefOptions: [],
      /** Only the newest parent-goal read may land; see `loadParentGoals`. */
      parentSeq: 0,
    };
  },

  computed: {
    seed() {
      return {
        period: this.period,
        date: this.date || goalDateFor(this.period, this.selectedDate),
        taskRef: this.taskRef,
        goalRef: this.goalRef,
      };
    },
    title() {
      return this.heading || `New ${PERIOD_NOUN[this.period] || 'goal'}`;
    },
  },

  methods: {
    /**
     * The sheet asks for the goals one period above its draft whenever the
     * period or date changes. A slower read for an older date must not land on
     * top of the current one, hence the sequence number.
     */
    loadParentGoals({ period, date } = {}) {
      if (this.locked) return Promise.resolve();
      this.parentSeq += 1;
      const seq = this.parentSeq;
      return fetchParentGoalOptions(this.$goals, period, date).then((items) => {
        if (seq === this.parentSeq) this.goalRefOptions = items;
      });
    },

    /**
     * The sheet closes only once the save lands: on failure it stays open with
     * the typed text so "try again" is one tap, not a retype.
     */
    onCreate(draft) {
      if (this.saving || !draft) return Promise.resolve();
      this.saving = true;
      const goalRef = draft.goalRef || '';
      return this.$goals.addGoalItem({
        body: draft.body,
        period: draft.period,
        date: draft.date,
        taskRef: draft.taskRef || undefined,
        goalRef: goalRef || undefined,
        contribution: draft.contribution || '',
        isComplete: false,
        // A goal that rolls up into a parent is that parent's milestone.
        isMilestone: !!goalRef,
        tags: (draft.tags || []).slice(),
        // Which day's cached goals the shared updater should look in.
        dayDate: this.today,
      })
        // `created` before `close`: a page that clears its own draft on close
        // (Year Goals) still has it while it reacts to the create.
        .then((created) => {
          this.$emit('created', { ...draft, created });
          this.$emit('close');
        })
        .catch((error) => this.$emit('failed', { ...draft, error }))
        .finally(() => { this.saving = false; });
    },
  },
};
</script>
