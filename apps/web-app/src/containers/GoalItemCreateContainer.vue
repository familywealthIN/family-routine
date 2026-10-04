<template>
  <NewGoalSheet
    :open="open"
    :shell="shell"
    :period="period"
    :task-ref="taskRef"
    :routines="routines"
    :hint="hint"
    @close="$emit('close')"
    @submit="onSubmit"
    @period-change="draftPeriod = $event"
  />
</template>

<script>
/**
 * Write container for the new-goal sheet (ARCHITECTURE.md § 2): one organism, one
 * mutation — `addGoalItem` — and nothing else.
 *
 * It delegates to `$goals.addGoalItem`, which already owns this write's optimistic
 * response and its cache update (`composables/useGoalMutations`). Re-implementing
 * either here would be a second source of truth for one mutation.
 *
 * That cache update only knows the two dashboard queries, so it cannot place the
 * new item in THIS page's reads. Rather than hand-splice a list into them — the
 * `readQuery → clone → writeQuery` pattern § 3.1 forbids — the container reports
 * `created` and the page refetches the two display reads it owns.
 *
 * The date is not asked for: a goal's `date` is a function of its period and the
 * day in view (`goalCascade.goalDateFor`), which is the server's own
 * `periodGoalDates` rule plus `01-01-1970` for a lifetime goal.
 */
import NewGoalSheet from '@routine-notes/ui/organisms/NewGoalSheet/NewGoalSheet.vue';
import { formHintFor, goalDateFor } from '../utils/goalCascade';

export default {
  name: 'GoalItemCreateContainer',

  components: { NewGoalSheet },

  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The ladder step the sheet opened from. */
    period: { type: String, default: 'day' },
    /** Pre-selected routine — the one whose window contains now. */
    taskRef: { type: String, default: '' },
    routines: { type: Array, default: () => [] },
    selectedDate: { type: String, required: true },
    today: { type: String, required: true },
  },

  data() {
    return {
      /** The period chip picked in the sheet; null until the user changes it. */
      draftPeriod: null,
      /** A create is in flight — a second Enter must not file a duplicate. */
      saving: false,
    };
  },

  computed: {
    hint() {
      return formHintFor(this.draftPeriod || this.period, {
        selectedDate: this.selectedDate,
        today: this.today,
      });
    },
  },

  watch: {
    // The sheet re-seeds its draft from `period` on every open; follow it.
    open(isOpen) {
      if (isOpen) this.draftPeriod = null;
    },
  },

  methods: {
    /**
     * The sheet closes only once the save lands: on failure it stays open with
     * the typed text so "try again" is one tap, not a retype.
     */
    onSubmit({ period, body, taskRef }) {
      if (this.saving) return Promise.resolve();
      this.saving = true;
      const date = goalDateFor(period, this.selectedDate);
      return this.$goals.addGoalItem({
        body,
        period,
        date,
        taskRef,
        isComplete: false,
        isMilestone: false,
        tags: [],
        // Which day's cached goals the shared updater should look in.
        dayDate: this.today,
      })
        .then(() => {
          this.$emit('close');
          this.$emit('created', { period, body, taskRef });
        })
        .catch(() => this.$emit('failed', { period, body }))
        .finally(() => { this.saving = false; });
    },
  },
};
</script>
