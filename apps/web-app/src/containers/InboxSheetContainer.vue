<template>
  <!--
    The Inbox's data layer (containers/ARCHITECTURE.md).

    One organism (InboxSheet) + the writes that get a task out of the Inbox: one
    `addGoalItem` with no `taskRef`, one `updateGoalItem` that sets one, one
    `deleteGoalItem`.

    No query of its own. The Inbox is the complement of the focus card's
    checklist — the day's goal items the card structurally cannot show because it
    groups by routine — so it is derived from the page's existing
    `optimizedDailyGoals` read and arrives as a prop (§6b). A second query would
    be a second copy of the same entities.
  -->
  <inbox-sheet
    :open="open"
    :shell="shell"
    :items="items"
    :current-routine="currentRoutine"
    :routines="routines"
    @close="$emit('close')"
    @add="onAdd"
    @do-now="onDoNow"
    @move="onMove"
    @remove="onRemove"
  />
</template>

<script>
import InboxSheet from '@routine-notes/ui/organisms/InboxSheet/InboxSheet.vue';
import { UPDATE_GOAL_ITEM_FIELDS_MUTATION } from '../composables/graphql/goalItemQueries';
import { guardFields, releaseEntity } from '../utils/cacheGuard';

export default {
  name: 'InboxSheetContainer',
  components: { InboxSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** Day goal items with no `taskRef`. */
    items: { type: Array, default: () => [] },
    /** `{ id, name, time, goalRef }` — the routine "Do now" targets. */
    currentRoutine: { type: Object, default: null },
    /** `[{ id, name, time, goalRef }]` — every routine on the day. */
    routines: { type: Array, default: () => [] },
    date: { type: String, default: '' },
    period: { type: String, default: 'day' },
  },
  methods: {
    notifyError(error, fallback) {
      const [gqlError] = (error && error.graphQLErrors) || [];
      this.$notify({
        title: 'Error',
        text: (gqlError && gqlError.message) || fallback,
        group: 'notify',
        type: 'error',
        duration: 3000,
      });
    },

    onAdd(body) {
      // No taskRef and no goalRef: that absence IS what makes it an Inbox item.
      this.$goals
        .addGoalItem({
          body,
          period: this.period,
          date: this.date,
          dayDate: this.date,
          isComplete: false,
          isMilestone: false,
          taskRef: '',
          tags: [],
        })
        .then(() => this.$emit('changed', { op: 'add' }))
        .catch((error) => this.notifyError(error, "Couldn't add that to the Inbox."));
    },

    onDoNow(item) {
      if (!this.currentRoutine) return;
      this.assign(item, this.currentRoutine);
    },
    onMove({ item, routine }) {
      this.assign(item, routine);
    },

    /**
     * Attach the item to a routine.
     *
     * It inherits the routine's `goalRef` so it rolls up into the same week goal
     * as anything else on that routine — the same rule the chat uses when it
     * creates an item (docs/routine-focus-home.md § Intents). Without it the item
     * would appear on the checklist but contribute to nothing.
     *
     * `updateGoalItem` replaces every field it is handed, so the item's current
     * values go with the change (see GoalItemSheetContainer.writeItem).
     */
    assign(item, routine) {
      if (!item || !item.id || !routine || !routine.id) return;
      const goalRef = item.goalRef || routine.goalRef || '';
      guardFields('GoalItem', item.id, ['taskRef', 'goalRef']);

      this.$apollo
        .mutate({
          mutation: UPDATE_GOAL_ITEM_FIELDS_MUTATION,
          variables: {
            id: item.id,
            date: this.date,
            period: this.period,
            body: item.body || '',
            contribution: item.contribution || '',
            reward: item.reward || '',
            deadline: item.deadline || '',
            isMilestone: !!item.isMilestone,
            taskRef: String(routine.id),
            goalRef,
            tags: (item.tags || []).slice(),
          },
        })
        .then(() => {
          this.$emit('changed', { op: 'assign', id: item.id, taskRef: String(routine.id) });
          this.$notify({
            title: `Moved to ${routine.name}`,
            text: item.body,
            group: 'notify',
            type: 'success',
            duration: 3000,
          });
        })
        .catch((error) => {
          releaseEntity('GoalItem', item.id);
          this.notifyError(error, "Couldn't move that task.");
        });
    },

    onRemove(item) {
      if (!item || !item.id) return;
      this.$goals
        .deleteGoalItem({ id: item.id, date: this.date, period: this.period })
        .then(() => {
          this.$emit('changed', { op: 'delete', id: item.id });
          this.$notify({
            title: 'Removed from Inbox',
            text: item.body,
            group: 'notify',
            type: 'success',
            duration: 3000,
          });
        })
        .catch((error) => this.notifyError(error, "Couldn't delete that task."));
    },
  },
};
</script>
