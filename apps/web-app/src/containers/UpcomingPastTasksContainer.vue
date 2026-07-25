<template>
  <!--
    Container home for the UpcomingPastTasks organism (see ARCHITECTURE.md).
    Owns its READ end-to-end: injects the dashboard data provider and computes
    the enriched upcoming/past task lists itself (filter-by-time + enrich with
    display fields), using the shared display helpers off the provider. The page
    no longer owns filterUpcomingPastTask / enrichTasksForUpcomingPast. Writes
    stay page-orchestrated and are forwarded via $listeners (incl. tabs +
    goal-period write-backs).
  -->
  <UpcomingPastTasks
    :upcoming-tasks="upcomingTasks"
    :past-tasks="pastTasks"
    :tabs="rd.tabs"
    :selected-task-ref="rd.selectedTaskRef"
    :goal-period="rd.currentGoalPeriod"
    :goals="rd.goals"
    :all-goals="rd.goals"
    :show-goals-skeleton="rd.showGoalsSkeleton"
    :last-complete-item-goal-ref="rd.lastCompleteItemGoalRef"
    v-on="$listeners"
  />
</template>

<script>
import moment from 'moment';
import UpcomingPastTasks from '@routine-notes/ui/organisms/UpcomingPastTasks/UpcomingPastTasks.vue';

export default {
  name: 'UpcomingPastTasksContainer',
  components: { UpcomingPastTasks },
  inject: ['routineData'],
  computed: {
    rd() {
      return this.routineData;
    },
    upcomingTasks() {
      return this.enrich(this.filterByTime(false, this.rd.tasklist));
    },
    pastTasks() {
      return this.enrich(this.filterByTime(true, this.rd.tasklist));
    },
  },
  methods: {
    // Past = already started (diff >= 0); upcoming = starts in > 1 min
    // (diff <= -1). The current task is excluded from both.
    filterByTime(isPast, tasklist) {
      if (!Array.isArray(tasklist)) return [];
      const currentTaskId = this.rd.currentTask ? this.rd.currentTask.id : '0';
      const now = moment();
      return tasklist.filter((task) => {
        const diff = now.diff(moment(task.time, 'HH:mm'), 'minutes');
        const inBucket = isPast ? diff >= 0 : diff <= -1;
        return inBucket && task.id !== currentTaskId;
      });
    },
    // Add the presentational fields the organism expects, via the shared
    // helpers on the provider (single source of truth with the current-task card).
    enrich(tasks) {
      if (!Array.isArray(tasks)) return [];
      const { rd } = this;
      return tasks.map((task) => ({
        ...task,
        percentage: rd.countTaskPercentage(task),
        completedCount: rd.countTaskCompleted(task),
        totalCount: rd.countTaskTotal(task),
        timeLabel: rd.displayTime(task.time),
        buttonIcon: rd.getButtonIcon(task),
        buttonColor: rd.getCurrentButtonColor(task),
        buttonDisabled: rd.getButtonDisabled(task),
        agentStatus: rd.agentStatusFor(task.id),
      }));
    },
  },
};
</script>
