<template>
  <!--
    The goal-item page's data layer (containers/ARCHITECTURE.md).

    One organism (GoalItemSheet) + the goal-item write CRUD it needs: the title,
    the contribution, the tags, the date move, and the five subtask gestures.
    The organism stays pure; nothing here renders markup of its own.

    Two things deliberately do NOT live here:

    * **Completion.** Ticking an item moves the routine's K-stimulus, may fire the
      task's agent end event and posts a chat event — three domains. That is a
      page-level orchestration (§6), so `toggle-status` is forwarded as
      `toggle-item` and `RoutineFocus.toggleItem` handles it, exactly as a tap on
      the checklist row does.
    * **The read.** The item is a slice of the page's `optimizedDailyGoals` query.
      Giving this container its own query would duplicate that root and let the
      two copies drift (§6b), so the item arrives as a prop.
  -->
  <div>
    <goal-item-sheet
      :open="open"
      :shell="shell"
      :item="item"
      :period-label="periodLabel"
      :routine-label="routineLabel"
      :goal-ref-label="goalRefLabel"
      :date-label="dateLabel"
      :date-locked="dateLocked"
      :date-options="dateOptions"
      :tag-universe="tagUniverse"
      :tag-usage="tagUsage"
      :reward-meta="rewardMeta"
      :reward-new="rewardNew"
      :period="period"
      :routines="routines"
      :goal-ref-options="goalRefOptions"
      @close="$emit('close')"
      @toggle-status="$emit('toggle-item', $event)"
      @open-transcript="$emit('open-transcript', $event)"
      @reward-seen="$emit('reward-seen', $event)"
      @delete="confirmDelete"
      @update-title="onUpdateTitle"
      @commit-contribution="onCommitContribution"
      @update-tags="onUpdateTags"
      @update-link="onUpdateLink"
      @pick-date="onPickDate"
      @add-subtask="onAddSubtask"
      @toggle-subtask="onToggleSubtask"
      @rename-subtask="onRenameSubtask"
      @move-subtask-up="onMoveSubtaskUp"
      @remove-subtask="onRemoveSubtask"
    />
    <goal-delete-confirm-container ref="deleteConfirm" :shell="shell" @confirm="onDeleteConfirmed" />
  </div>
</template>

<script>
import GoalItemSheet from '@routine-notes/ui/organisms/GoalItemSheet/GoalItemSheet.vue';
import GoalDeleteConfirmContainer from './GoalDeleteConfirmContainer.vue';
import {
  UPDATE_GOAL_ITEM_FIELDS_MUTATION,
  RENAME_SUB_TASK_ITEM_MUTATION,
  REORDER_SUB_TASK_ITEMS_MUTATION,
} from '../composables/graphql/goalItemQueries';
import { patchSubTaskItem } from '../composables/useEntityCache';
import { isTempSubTaskId } from '../utils/tempIds';
import { guardFields, releaseEntity } from '../utils/cacheGuard';
import { fetchParentGoalOptions } from '../utils/parentGoalOptions';

export default {
  name: 'GoalItemSheetContainer',
  components: { GoalItemSheet, GoalDeleteConfirmContainer },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The decorated GoalItem the sheet is showing, or null. */
    item: { type: Object, default: null },
    /** The date of the Goal document the item lives in (DD-MM-YYYY). */
    date: { type: String, default: '' },
    period: { type: String, default: 'day' },
    periodLabel: { type: String, default: '' },
    routineLabel: { type: String, default: 'Inbox' },
    goalRefLabel: { type: String, default: '' },
    dateLabel: { type: String, default: '' },
    dateLocked: { type: Boolean, default: false },
    /** `[{ key, label, active, date }]`. `date` is the move target. */
    dateOptions: { type: Array, default: () => [] },
    tagUniverse: { type: Array, default: () => [] },
    tagUsage: { type: Object, default: () => ({}) },
    rewardMeta: { type: String, default: '' },
    rewardNew: { type: Boolean, default: false },
    /** `[{ id, name, time }]` — the Linked to routine picker's choices. */
    routines: { type: Array, default: () => [] },
  },
  data() {
    return {
      /** Goals one period up from this item — Linked to's parent choices. */
      goalRefOptions: [],
      parentSeq: 0,
    };
  },
  watch: {
    /** Each item the sheet opens on gets the parent goals of its own period. */
    parentKey: {
      handler() {
        this.loadParentGoals();
      },
      immediate: true,
    },
  },
  computed: {
    parentKey() {
      return this.open && this.item ? `${this.period}|${this.date}` : '';
    },
  },
  methods: {
    loadParentGoals() {
      if (!this.parentKey) return Promise.resolve();
      this.parentSeq += 1;
      const seq = this.parentSeq;
      return fetchParentGoalOptions(this.$goals, this.period, this.date).then((items) => {
        if (seq === this.parentSeq) this.goalRefOptions = items;
      });
    },
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

    // ---- goal item ---------------------------------------------------------
    /**
     * One `updateGoalItem` call, carrying the item's CURRENT value for every
     * field the caller is not changing.
     *
     * The resolver `$set`s every argument it is handed and defaults `tags` to
     * `[]`, so a partial call is a partial wipe — sending the whole set is the
     * only safe shape. `date` defaults to the item's own date; passing a
     * different one is what moves the item to another day.
     */
    writeItem(item, changes = {}, { date } = {}) {
      if (!item || !item.id) return Promise.resolve(null);
      const targetDate = date || this.date;
      const next = {
        body: item.body || '',
        contribution: item.contribution || '',
        reward: item.reward || '',
        deadline: item.deadline || '',
        isMilestone: !!item.isMilestone,
        taskRef: item.taskRef || '',
        goalRef: item.goalRef || '',
        tags: (item.tags || []).slice(),
        ...changes,
      };

      // Pin the fields we are changing so a `cache-and-network` read that left
      // before this write cannot land on top of it (utils/cacheGuard.js).
      guardFields('GoalItem', item.id, Object.keys(changes));

      return this.$apollo
        .mutate({
          mutation: UPDATE_GOAL_ITEM_FIELDS_MUTATION,
          variables: {
            id: item.id, period: this.period, date: targetDate, ...next,
          },
          optimisticResponse: {
            __typename: 'Mutation',
            updateGoalItem: {
              __typename: 'GoalItem',
              id: item.id,
              progress: item.progress == null ? 0 : item.progress,
              isComplete: !!item.isComplete,
              status: item.status || 'todo',
              completedAt: item.completedAt || null,
              originalDate: item.originalDate || null,
              subTasks: (item.subTasks || []).map((subTask) => ({
                __typename: 'SubTaskItem',
                id: subTask.id,
                body: subTask.body,
                isComplete: !!subTask.isComplete,
              })),
              ...next,
            },
          },
        })
        .catch((error) => {
          releaseEntity('GoalItem', item.id);
          this.notifyError(error, "Couldn't save that change.");
          this.$emit('changed', { op: 'update-failed', id: item.id });
          throw error;
        });
    },

    onUpdateTitle({ item, body }) {
      this.writeItem(item, { body }).catch(() => {});
    },
    onCommitContribution({ item, contribution }) {
      if ((item.contribution || '') === (contribution || '')) return;
      this.writeItem(item, { contribution: contribution || '' }).catch(() => {});
    },
    /**
     * Linked to: the routine and/or the parent goal. A goal that rolls up into
     * a parent is that parent's milestone, so `isMilestone` follows `goalRef`.
     */
    onUpdateLink({ item, ...link }) {
      const changes = {};
      if ('taskRef' in link) changes.taskRef = link.taskRef || '';
      if ('goalRef' in link) {
        changes.goalRef = link.goalRef || '';
        changes.isMilestone = !!link.goalRef;
      }
      if (!Object.keys(changes).length) return;
      this.writeItem(item, changes).catch(() => {});
    },
    onUpdateTags({ item, tags }) {
      this.writeItem(item, { tags: (tags || []).slice() }).catch(() => {});
    },
    /**
     * Move the item to another day. The resolver relocates the subdocument and
     * keeps its `_id`, so the normalized entity survives — but it leaves the
     * source day's list, and a list membership change is the one thing an
     * entity-level write cannot express. The page refetches.
     */
    onPickDate({ item, option }) {
      if (!option || !option.date || option.date === this.date) return;
      this.writeItem(item, {}, { date: option.date })
        .then(() => {
          this.$emit('close');
          this.$emit('changed', { op: 'move-date', id: item.id, date: option.date });
          this.$notify({
            title: `Moved to ${option.label}`,
            text: item.body,
            group: 'notify',
            type: 'success',
            duration: 3000,
          });
        })
        .catch(() => {});
    },

    confirmDelete(item) {
      if (!item) return;
      // Destructive, and the server cascades to the item's milestones — the
      // existing confirm container is the only place that spells that out.
      this.$refs.deleteConfirm.open({
        id: item.id, body: item.body, period: this.period, date: this.date,
      });
    },
    onDeleteConfirmed(target) {
      this.$emit('close');
      this.$goals
        .deleteGoalItem({ id: target.id, date: target.date, period: target.period })
        .then(() => {
          this.$emit('changed', { op: 'delete', id: target.id });
          this.$notify({
            title: 'Goal item deleted',
            text: target.body,
            group: 'notify',
            type: 'success',
            duration: 3000,
          });
        })
        .catch((error) => this.notifyError(error, "Couldn't delete that item."));
    },

    // ---- subtasks ----------------------------------------------------------
    onAddSubtask({ item, body }) {
      this.$goals
        .addSubTaskItem({
          taskId: item.id, body, period: this.period, date: this.date, isComplete: false,
        })
        .then(() => this.$emit('changed', { op: 'add-subtask', id: item.id }))
        .catch((error) => this.notifyError(error, "Couldn't add that subtask."));
    },
    onToggleSubtask({ item, subtask }) {
      if (isTempSubTaskId(subtask.id)) return;
      this.$goals
        .completeSubTaskItem({
          id: subtask.id,
          taskId: item.id,
          period: this.period,
          date: this.date,
          isComplete: !subtask.isComplete,
          subTasks: item.subTasks || [],
          dayDate: this.date,
        })
        .then(() => this.$emit('changed', { op: 'complete-subtask', id: item.id }))
        .catch((error) => this.notifyError(error, "Couldn't update that subtask."));
    },
    /**
     * Rename. The result is a `SubTaskItem`, which Apollo normalizes by id, so
     * the parent's list is untouched and no query-level write is needed.
     */
    onRenameSubtask({ item, subtask, body }) {
      if (isTempSubTaskId(subtask.id)) return;
      guardFields('SubTaskItem', subtask.id, ['body']);
      this.$apollo
        .mutate({
          mutation: RENAME_SUB_TASK_ITEM_MUTATION,
          variables: {
            id: subtask.id, taskId: item.id, period: this.period, date: this.date, body,
          },
          optimisticResponse: {
            __typename: 'Mutation',
            updateSubTaskItem: {
              __typename: 'SubTaskItem',
              id: subtask.id,
              body,
              isComplete: !!subtask.isComplete,
            },
          },
          update: (cache, { data }) => {
            const saved = data && data.updateSubTaskItem;
            if (saved) patchSubTaskItem(cache, saved.id, { body: saved.body });
          },
        })
        .then(() => this.$emit('changed', { op: 'rename-subtask', id: item.id }))
        .catch((error) => {
          releaseEntity('SubTaskItem', subtask.id);
          this.notifyError(error, "Couldn't rename that subtask.");
        });
    },
    /**
     * Move up. Order IS the array order on the server, so this is the one
     * subtask write that returns the parent goal item.
     */
    onMoveSubtaskUp({ item, subtask }) {
      const ids = (item.subTasks || []).map((row) => row.id);
      // A reorder names every row; one still optimistic would be unknown to the server.
      if (ids.some(isTempSubTaskId)) return;
      const index = ids.indexOf(subtask.id);
      if (index <= 0) return;
      const reordered = ids.slice();
      reordered[index - 1] = ids[index];
      reordered[index] = ids[index - 1];

      guardFields('GoalItem', item.id, ['subTasks']);
      this.$apollo
        .mutate({
          mutation: REORDER_SUB_TASK_ITEMS_MUTATION,
          variables: {
            taskId: item.id, period: this.period, date: this.date, ids: reordered,
          },
        })
        .then(() => this.$emit('changed', { op: 'reorder-subtasks', id: item.id }))
        .catch((error) => {
          releaseEntity('GoalItem', item.id);
          this.notifyError(error, "Couldn't move that subtask.");
        });
    },
    onRemoveSubtask({ item, subtask }) {
      if (isTempSubTaskId(subtask.id)) return;
      this.$goals
        .deleteSubTaskItem({
          id: subtask.id, taskId: item.id, period: this.period, date: this.date,
        })
        .then(() => this.$emit('changed', { op: 'delete-subtask', id: item.id }))
        .catch((error) => this.notifyError(error, "Couldn't delete that subtask."));
    },
  },
};
</script>
