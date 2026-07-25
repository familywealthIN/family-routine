<template>
  <!--
    Container home for the AgendaTaskList organism (see ARCHITECTURE.md).
    Owns its READ: derives grouped goal items from the injected provider
    (`mode` picks the source — today's daily goals vs the non-today agendaGoals
    query). Owns its single-domain WRITES in "agenda" mode: complete/delete a
    past-day goal item is a plain $goals mutation (no K-stimulus / agent /
    streak fan-out — that's a today-only concern), so it lives here and emits
    `changed` for the page to refetch its agendaGoals query. In "today" mode the
    writes are cross-domain, so they bubble to the page's orchestrators.
  -->
  <AgendaTaskList
    :groups="groups"
    :loading="loading"
    :hide-checkbox="hideCheckbox"
    @complete-goal-item="onComplete"
    @delete-goal-item="onDelete"
    @edit-goal-item="(item) => $emit('edit-goal-item', item)"
  />
</template>

<script>
import AgendaTaskList from '@routine-notes/ui/organisms/AgendaTaskList/AgendaTaskList.vue';

export default {
  name: 'AgendaTaskListContainer',
  components: { AgendaTaskList },
  inject: ['routineData'],
  props: {
    // 'today' → daily goals (writes bubble to the page); 'agenda' → non-today
    // agendaGoals query (writes owned here).
    mode: {
      type: String,
      default: 'today',
    },
  },
  computed: {
    rd() {
      return this.routineData;
    },
    sourceGoals() {
      return this.mode === 'agenda' ? this.rd.agendaGoals : this.rd.goals;
    },
    groups() {
      const { tasklist } = this.rd;
      const goals = this.sourceGoals;
      if (!Array.isArray(tasklist) || !goals) return [];
      const out = [];
      tasklist.forEach((task) => {
        const taskGoals = this.rd.filterTaskGoalsPeriod(task.id, goals, 'day');
        if (taskGoals.length) out.push({ taskId: task.id, taskName: task.name, goals: taskGoals });
      });
      return out;
    },
    loading() {
      return this.mode === 'agenda'
        ? this.rd.agendaLoading
        : (this.rd.goalsLoading && this.rd.goalsFirstLoad);
    },
    hideCheckbox() {
      return this.mode === 'agenda' ? this.rd.isFutureDateSelected : false;
    },
  },
  methods: {
    notifyError(text) {
      this.$notify({
        title: 'Error', text, group: 'notify', type: 'error', duration: 3000,
      });
    },
    onComplete(payload) {
      // today: cross-domain — let the page orchestrate.
      if (this.mode !== 'agenda') {
        this.$emit('complete-goal-item', payload);
        return;
      }
      const {
        id, period, date, taskRef, isComplete, isMilestone, onSuccess,
      } = payload;
      this.$goals.completeGoalItem({
        id, period, date, taskRef, isComplete, isMilestone, dayDate: this.rd.date,
      })
        .then(() => {
          if (onSuccess) onSuccess();
          this.$emit('changed');
        })
        .catch(() => this.notifyError('An unexpected error occured'));
    },
    onDelete(payload) {
      if (this.mode !== 'agenda') {
        this.$emit('delete-goal-item', payload);
        return;
      }
      const { id, period, date } = payload;
      this.$goals.deleteGoalItem({
        id, period, date, dayDate: this.rd.date,
      })
        .then(() => this.$emit('changed'))
        .catch(() => this.notifyError('An unexpected error occured'));
    },
  },
};
</script>
