<template>
  <!--
    Container home for the WeekGoalStreak organism (see ARCHITECTURE.md).
    Owns its read: injects the dashboard data provider and derives the current
    task's WEEK goals itself (and its own show/hide condition), so the page no
    longer computes `weekGoalsForCurrentTask` or guards the layout slot.
  -->
  <AtomFlex v-if="shouldShow" xs12 class="pr-3 pl-3 mb-3" d-flex>
    <WeekGoalStreak :week-goals="weekGoals" />
  </AtomFlex>
</template>

<script>
import { AtomFlex } from '@routine-notes/ui/atoms';
import WeekGoalStreak from '@routine-notes/ui/organisms/WeekGoalStreak/WeekGoalStreak.vue';

export default {
  name: 'WeekGoalStreakContainer',
  components: { AtomFlex, WeekGoalStreak },
  inject: ['routineData'],
  computed: {
    weekGoals() {
      const rd = this.routineData;
      const task = rd.currentTask;
      return task && task.id ? rd.filterTaskGoalsPeriod(task.id, rd.goals, 'week') : [];
    },
    shouldShow() {
      const rd = this.routineData;
      return !!rd.countTaskTotal(rd.currentTask)
        && rd.currentGoalPeriod === 'day'
        && this.weekGoals.length > 0;
    },
  },
};
</script>
