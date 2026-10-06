<template>
  <!--
    The Inbox's data layer (containers/ARCHITECTURE.md).

    One organism (InboxSheet) + the writes that get a task out of the Inbox: one
    `addGoalItem` with no `taskRef`, one `updateGoalItem` that sets one, one
    `deleteGoalItem`.

    Pending items. The pre-redesign Inbox was the "Pending Items" dialog
    (PendingListContainer, the user's `motto` list). The redesign dropped it, so
    those items vanished from the app. They are back as the sheet's "Pending"
    section: this container owns that one scoped read (`motto`, its own entity —
    `MottoItem` — so it never overlaps the goal cache), and its rows leave the
    same way a goal item does: "Do now" / "Move to routine" create the goal item
    on that routine and then drop the pending entry; delete drops it.

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
    :pending="pendingRows"
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
import {
  MOTTO_QUERY,
  DELETE_MOTTO_ITEM_MUTATION,
  toPendingRows,
} from '../composables/graphql/mottoQueries';

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
  data() {
    return {
      motto: [],
      /** Pending ids deleted this session — hidden immediately and for good. */
      removedPending: [],
    };
  },
  apollo: {
    motto: {
      query: MOTTO_QUERY,
      fetchPolicy: 'cache-and-network',
      skip() {
        return !(this.$root && this.$root.$data && this.$root.$data.email);
      },
      update(data) {
        return (data && data.motto) || [];
      },
    },
  },
  computed: {
    pendingRows() {
      const removed = this.removedPending;
      return toPendingRows(this.motto).filter((row) => removed.indexOf(row.mottoId) === -1);
    },
  },
  watch: {
    /** The header badge counts goal items; the page can add these to it. */
    pendingRows: {
      immediate: true,
      handler(rows) {
        this.$emit('pending-count', rows.length);
      },
    },
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
      this.route(item, this.currentRoutine);
    },
    onMove({ item, routine }) {
      this.route(item, routine);
    },
    route(item, routine) {
      if (item && item.kind === 'pending') this.plan(item, routine);
      else this.assign(item, routine);
    },

    /**
     * Turn a pending entry into a goal item on the routine, then drop it.
     *
     * The old dialog's "exit_to_app" did the same in two steps (open goal
     * creation, delete on save); here the routine is already chosen, so the
     * item is created with that routine's `taskRef` + `goalRef` directly. The
     * pending entry is deleted only once the goal item exists, so a failed
     * create never loses the task.
     */
    plan(item, routine) {
      if (!item || !item.mottoId || !routine || !routine.id) return;
      this.$goals
        .addGoalItem({
          body: item.body,
          period: this.period,
          date: this.date,
          dayDate: this.date,
          isComplete: false,
          isMilestone: false,
          taskRef: String(routine.id),
          // No goalRef: the server links the item to the routine's week goal
          // itself, and passing one without `isMilestone: true` is refused — so
          // planning an inbox item onto a linked routine failed with
          // "Couldn't move that task." for no reason the user could see.
          // Same correction as the chat's createItems.
          tags: [],
        })
        .then(() => {
          this.dropPending(item, { silent: true });
          this.$emit('changed', { op: 'plan', id: item.mottoId, taskRef: String(routine.id) });
          this.$notify({
            title: `Moved to ${routine.name}`,
            text: item.body,
            group: 'notify',
            type: 'success',
            duration: 3000,
          });
        })
        .catch((error) => this.notifyError(error, "Couldn't move that task."));
    },

    refetchPending() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.motto;
      if (query && typeof query.refetch === 'function') {
        query.refetch().catch(() => {});
      }
    },

    /** Delete a pending entry. Hidden at once; restored if the server refuses. */
    dropPending(item, { silent = false } = {}) {
      const id = item && item.mottoId;
      if (!id) return Promise.resolve();
      this.removedPending = this.removedPending.concat(id);
      return this.$apollo
        .mutate({ mutation: DELETE_MOTTO_ITEM_MUTATION, variables: { id } })
        .then(() => {
          // The id stays in removedPending: the server has dropped it, but the
          // cached `motto` list still holds it until the refetch lands.
          this.refetchPending();
          if (!silent) {
            this.$notify({
              title: 'Removed from Inbox',
              text: item.body,
              group: 'notify',
              type: 'success',
              duration: 3000,
            });
          }
        })
        .catch((error) => {
          this.removedPending = this.removedPending.filter((x) => x !== id);
          this.notifyError(error, "Couldn't delete that task.");
        });
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
      if (item && item.kind === 'pending') {
        this.dropPending(item);
        return;
      }
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
