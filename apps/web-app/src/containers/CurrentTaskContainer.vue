<template>
  <!--
    Container home for the CurrentTaskCard organism (see ARCHITECTURE.md).
    Owns its READ: injects the dashboard data provider and derives every display
    prop (task, goals, counts, button state, agent status, skeletons) itself, so
    the page no longer computes or threads those down. Write events stay
    page-orchestrated and are forwarded verbatim via $listeners (incl. the
    goal-period write-back through @update:goalPeriod).
  -->
  <CurrentTaskCard
    :task="task"
    :goals="rd.goals"
    :all-goals="rd.goals"
    :goal-period="rd.currentGoalPeriod"
    :percentage="rd.countTaskPercentage(task)"
    :completed-count="rd.countTaskCompleted(task)"
    :total-count="rd.countTaskTotal(task)"
    :time-label="rd.displayTime(task && task.time)"
    :button-icon="rd.getButtonIcon(task)"
    :button-color="rd.getCurrentButtonColor(task)"
    :button-disabled="rd.getButtonDisabled(task)"
    :agent-status="rd.agentStatusFor(task && task.id)"
    :show-goals-skeleton="rd.showGoalsSkeleton"
    :show-routine-skeleton="rd.showRoutineSkeleton"
    :loading="rd.goalsLoading"
    :last-complete-item-goal-ref="rd.lastCompleteItemGoalRef"
    v-on="$listeners"
  />
</template>

<script>
import CurrentTaskCard from '@routine-notes/ui/organisms/CurrentTaskCard/CurrentTaskCard.vue';

export default {
  name: 'CurrentTaskContainer',
  components: { CurrentTaskCard },
  inject: ['routineData'],
  computed: {
    rd() {
      return this.routineData;
    },
    task() {
      return this.routineData.currentTask;
    },
  },
};
</script>
