<template>
  <AtomCard class="week-goal-streak">
    <AtomCardTitle>
      <b>Week Goal Streak</b>
    </AtomCardTitle>
    <div
      v-for="weekGoal in weekGoals"
      :key="weekGoal.id"
      class="pb-3 pl-3 pr-3"
    >
      <!-- Show each goal item in the week goal -->
      <div
        v-for="(goalItem, index) in weekGoal.goalItems"
        :key="goalItem.id"
        class="mb-2"
      >
        <div class="caption text--secondary" v-if="weekGoal.goalItems.length > 1">
          Goal {{ index + 1 }} of {{ weekGoal.goalItems.length }}
        </div>
        <div class="body-1">{{ goalItem.body }}</div>
        <streak-checks :progress="goalItem.progress || 0" />
      </div>

      <!-- Fallback for when no goal items exist -->
      <div v-if="!weekGoal.goalItems || weekGoal.goalItems.length === 0" class="mb-2">
        <div class="body-1 text--secondary">No week goal items</div>
        <streak-checks :progress="0" />
      </div>
    </div>
  </AtomCard>
</template>

<script>
import { AtomCard, AtomCardTitle } from '../../atoms';
import StreakChecks from '../../molecules/StreakChecks/StreakChecks.vue';

export default {
  name: 'OrganismWeekGoalStreak',
  components: {
    AtomCard,
    AtomCardTitle,
    StreakChecks,
  },
  props: {
    weekGoals: {
      type: Array,
      default: () => [],
    },
  },
};
</script>
