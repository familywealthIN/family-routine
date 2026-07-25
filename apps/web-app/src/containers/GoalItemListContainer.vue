<template>
  <!--
    Reference container (see containers/ARCHITECTURE.md).
    One organism (GoalItemList) + the goal-item write CRUD, isolated here.
    Presentation-only events (create / dialog / refresh) bubble to the parent;
    the mutations + their entity-level cache updates are owned by this container
    so no page has to re-implement them, and no query-level cache surgery leaks
    into feature code.
  -->
  <GoalItemList
    :goal="goal"
    :edit-mode="editMode"
    :new-goal-item="newGoalItem"
    :passive="passive"
    @complete-goal-item="onCompleteGoalItem"
    @delete-task-goal="onDeleteTaskGoal"
    @complete-sub-task="onCompleteSubTask"
    @update-new-goal-item="onUpdateNewGoalItem"
    @toggle-goal-display-dialog="onToggleGoalDisplayDialog"
    @refresh-task-goal="onRefreshTaskGoal"
    @subtask-updated="onSubtaskUpdated"
  />
</template>

<script>
import GoalItemList from '@routine-notes/ui/organisms/GoalItemList/GoalItemList.vue';

export default {
  name: 'GoalItemListContainer',
  components: { GoalItemList },
  props: {
    // The single period-goal ({ id, period, date, goalItems }) to render.
    goal: {
      type: Object,
      default: () => ({}),
    },
    // Day date (DD-MM-YYYY) used as the cache `dayDate` for non-day periods.
    date: {
      type: String,
      default: '',
    },
    editMode: {
      type: Boolean,
      default: false,
    },
    newGoalItem: {
      type: Object,
      default: null,
    },
    passive: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    notifyError(text) {
      this.$notify({
        title: 'Error',
        text,
        group: 'notify',
        type: 'error',
        duration: 3000,
      });
    },

    // ---- Owned write CRUD (mutation + entity-level cache) -------------------
    onCompleteGoalItem(payload) {
      const {
        id, period, date, taskRef, isComplete, isMilestone, onSuccess,
      } = payload;
      this.$goals.completeGoalItem({
        id, period, date, taskRef, isComplete, isMilestone, dayDate: this.date,
      })
        .then(() => {
          if (onSuccess) onSuccess();
          this.$emit('changed', { op: 'complete', id });
        })
        .catch(() => this.notifyError('An unexpected error occured'));
    },

    onDeleteTaskGoal({ id, period, date }) {
      this.$goals.deleteGoalItem({
        id, period, date, dayDate: this.date,
      })
        .then(() => this.$emit('changed', { op: 'delete', id }))
        .catch(() => this.notifyError('An unexpected error occured'));
    },

    onCompleteSubTask(payload) {
      const {
        id, taskId, period, date, isComplete, onSuccess, onError,
      } = payload;
      this.$goals.completeSubTaskItem({
        id, taskId, period, date, isComplete, dayDate: this.date,
      })
        .then((result) => {
          if (onSuccess) onSuccess(result);
          this.$emit('changed', { op: 'complete-subtask', id });
        })
        .catch((error) => {
          if (onError) onError(error);
          this.notifyError('An unexpected error occurred while updating subtask');
        });
    },

    // ---- Presentation events bubble to the parent unchanged ----------------
    onUpdateNewGoalItem(item, period, date) {
      this.$emit('update-new-goal-item', item, period, date);
    },
    onToggleGoalDisplayDialog(item, edit) {
      this.$emit('toggle-goal-display-dialog', item, edit);
    },
    onRefreshTaskGoal(goalRef) {
      this.$emit('refresh-task-goal', goalRef);
    },
    onSubtaskUpdated(payload) {
      this.$emit('subtask-updated', payload);
    },
  },
};
</script>
