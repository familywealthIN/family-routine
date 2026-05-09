<template>
  <div class="timeline-item-list">
    <template v-for="(goalItem, i) in goal.goalItems">
      <AtomTimelineItem
        :class="`${periodPadding(period)} mb-0 pb-0`"
        :color="goalItem.isComplete ? 'green' : 'grey'"
        v-bind:key="goalItem.id"
        align-middle
        small
      >
        <AtomLayout align-center justify-space-between>
          <AtomFlex> {{ goalItem.body }} {{ progressText(goal.period, goalItem.progress) }} </AtomFlex>
          <AtomFlex xs5 text-xs-right>
            <span v-if="editMode">
              <AtomButton flat icon @click="editGoalItem(goalItem, goal.period, goal.date)">
                <AtomIcon>edit</AtomIcon>
              </AtomButton>
            </span>
            <span>
              <AtomButton flat icon @click="deleteGoalItem(i, goal.period, goal.date)">
                <AtomIcon>delete</AtomIcon>
              </AtomButton>
            </span>
          </AtomFlex>
        </AtomLayout>
        <AtomProgressLinear
          color="success"
          v-if="goal.period !== 'day' && goalItem.progress !== null"
          :value="progressPercent(goal.period, goalItem.progress)"
        />
      </AtomTimelineItem>
    </template>
  </div>
</template>
<script>
import { threshold } from '../../utils/getDates';
import {
  AtomButton,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomProgressLinear,
  AtomTimelineItem,
} from '../../atoms';

export default {
  name: 'MoleculeTimelineItemList',
  components: {
    AtomButton,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomProgressLinear,
    AtomTimelineItem,
  },
  props: ['goal', 'editMode', 'newGoalItem', 'period'],
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      goalItem: [],
    };
  },
  methods: {
    periodPadding(period) {
      if (period === 'month') {
        return 'month-padding';
      }
      if (period === 'week') {
        return 'week-padding';
      }
      if (period === 'day') {
        return 'day-padding';
      }
      return '';
    },
    progressText(period, progress) {
      if (period === 'year') {
        return `(${progress || 0}/${threshold.yearMonths})`;
      }
      if (period === 'month') {
        return `(${progress || 0}/${threshold.monthWeeks})`;
      }
      if (period === 'week') {
        return `(${progress || 0}/${threshold.weekDays})`;
      }
      return '';
    },
    progressPercent(period, progress) {
      if (period === 'year') {
        return progress ? (progress / 10) * 100 : 0;
      }
      if (period === 'month') {
        return progress ? (progress / 3) * 100 : 0;
      }
      if (period === 'week') {
        return progress ? (progress / 5) * 100 : 0;
      }
      return 0;
    },
    deleteGoalItem(index, period, date) {
      const { id } = this.goal.goalItems[index];
      this.goal.goalItems.splice(index, 1);
      // Emit event with all data needed for mutation - parent container handles GraphQL
      this.$emit('delete-task-goal', { id, period, date });
    },
    editGoalItem(goalItem, period, date) {
      this.$emit('update-new-goal-item', goalItem, period, date);
    },
  },
};
</script>

<style scoped>
.month-padding {
  padding-left: 32px !important;
}
.week-padding {
  padding-left: 48px !important;
}
.day-padding {
  padding-left: 72px !important;
}
</style>
