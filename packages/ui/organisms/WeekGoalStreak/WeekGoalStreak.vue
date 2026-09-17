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
        <streak-checks
          v-if="goalItem.milestoneDays && goalItem.milestoneDays.length"
          :days="goalItem.milestoneDays"
        />
        <div v-else class="caption text--secondary">Streak not available for this week</div>
      </div>

      <!-- Fallback for when no goal items exist -->
      <div v-if="!weekGoal.goalItems || weekGoal.goalItems.length === 0" class="mb-2">
        <div class="body-1 text--secondary">No week goal items</div>
      </div>
    </div>

    <!-- A week we failed to load is not a week without a streak. Goals we
         already hold still win over this, matching AgendaTaskList. -->
    <load-error-state
      v-if="error && !weekGoals.length"
      message="We couldn't load this week's streak."
      :retrying="retrying"
      @retry="$emit('retry')"
    />
  </AtomCard>
</template>

<script>
import { AtomCard, AtomCardTitle } from '../../atoms';
import LoadErrorState from '../../molecules/LoadErrorState/LoadErrorState.vue';
import StreakChecks from '../../molecules/StreakChecks/StreakChecks.vue';

export default {
  name: 'OrganismWeekGoalStreak',
  components: {
    AtomCard,
    AtomCardTitle,
    LoadErrorState,
    StreakChecks,
  },
  props: {
    weekGoals: {
      type: Array,
      default: () => [],
    },
    // The week's goals failed to load. Without it the card simply vanishes and
    // a connection failure reads as "you have no week goal".
    error: {
      type: Boolean,
      default: false,
    },
    retrying: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
