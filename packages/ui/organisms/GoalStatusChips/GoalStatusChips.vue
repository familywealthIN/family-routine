<template>
  <div class="goal-status-chips">
    <AtomLayout class="mb-3" row wrap v-if="allGoalsSet">
      <AtomFlex xs12>
        <AtomAlert type="success" icon="check_circle" outline>
          <slot name="all-set-message">
            You are all set.
            Do daily milestones to complete weekly and monthly goals.
          </slot>
        </AtomAlert>
      </AtomFlex>
    </AtomLayout>
    <AtomLayout class="mb-3" row wrap v-else>
      <AtomFlex xs6 v-if="showMonthChip">
        <AtomChip
          small
          :class="{ 'clickable': !hasMonthGoal }"
          @click="!hasMonthGoal && $emit('set-goal', 'month')"
        >
          <AtomAvatar :class="hasMonthGoal ? 'success text-white' : 'red text-white'">
            <AtomIcon :name="hasMonthGoal ? 'check' : 'close'" />
          </AtomAvatar>
          Set Month's Goal
        </AtomChip>
      </AtomFlex>
      <AtomFlex xs6 v-if="showWeekChip">
        <AtomChip
          small
          :class="{ 'clickable': !hasWeekGoal }"
          @click="!hasWeekGoal && $emit('set-goal', 'week')"
        >
          <AtomAvatar :class="hasWeekGoal ? 'success text-white' : 'red text-white'">
            <AtomIcon :name="hasWeekGoal ? 'check' : 'close'" />
          </AtomAvatar>
          Set Week's Goal
        </AtomChip>
      </AtomFlex>
    </AtomLayout>
  </div>
</template>

<script>
import {
  AtomAlert,
  AtomAvatar,
  AtomChip,
  AtomFlex,
  AtomIcon,
  AtomLayout,
} from '../../atoms';

export default {
  name: 'OrganismGoalStatusChips',
  components: {
    AtomAlert,
    AtomAvatar,
    AtomChip,
    AtomFlex,
    AtomIcon,
    AtomLayout,
  },
  props: {
    hasMonthGoal: {
      type: Boolean,
      default: false,
    },
    hasWeekGoal: {
      type: Boolean,
      default: false,
    },
    showMonthChip: {
      type: Boolean,
      default: true,
    },
    showWeekChip: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    allGoalsSet() {
      return this.hasMonthGoal && this.hasWeekGoal;
    },
  },
};
</script>

<style scoped>
.goal-status-chips .clickable {
  cursor: pointer;
}
</style>
