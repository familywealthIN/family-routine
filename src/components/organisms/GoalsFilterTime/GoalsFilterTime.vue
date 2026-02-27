<template>
  <AtomList subheader>
    <v-subheader
      class="subheading"
    >
      {{ periodFilter | capitalize }} Goals
    </v-subheader>
    <div v-if="goals && goals.length">
      <template v-for="goal in goals">
        <AtomListGroup
          :key="goal.id"
          v-if="goal.period === periodFilter && inRangeType(goal.date)"
          no-action
        >
          <template v-slot:activator>
            <AtomListTile>
              <AtomListTileContent>
                <AtomListTileTitle>{{ getPeriodDate(goal.period, goal.date) }}</AtomListTileTitle>
              </AtomListTileContent>
            </AtomListTile>
          </template>
          <goal-item-list
            @update-new-goal-item="updateNewGoalItem"
            @delete-task-goal="handleDeleteTaskGoal"
            @complete-goal-item="handleCompleteGoalItem"
            @complete-sub-task="handleCompleteSubTask"
            :goal="goal"
            :editMode="shouldAllowEdit(goal.period, goal.date)"
          />
        </AtomListGroup>
      </template>
    </div>
    <div class="text-xs-center" v-else>
      You Don't have any Goals.
    </div>
  </AtomList>
</template>

<script>
import moment from 'moment';

import { getPeriodDate, isItBeforeToday } from '../../../utils/getDates';
import GoalItemList from '../GoalItemList/GoalItemList.vue';
import {
  AtomList,
  AtomListGroup,
  AtomListTile,
  AtomListTileContent,
  AtomListTileTitle,
} from '../../atoms';

export default {
  name: 'OrganismGoalsFilterTime',

  components: {
    AtomList,
    AtomListGroup,
    AtomListTile,
    AtomListTileContent,
    AtomListTileTitle,
    GoalItemList,
  },
  props: ['goals', 'periodFilter', 'updateNewGoalItem', 'rangeType', 'selectedMonth'],
  data() {
    return {
      date: moment().format('DD-MM-YYYY'),
    };
  },
  methods: {
    isItBeforeToday,
    shouldAllowEdit(period, date) {
      // For week and month goals, allow editing if they are current or future periods
      if (period === 'week' || period === 'month') {
        const goalDate = moment(date, 'DD-MM-YYYY');
        const today = moment();

        if (period === 'week') {
          // Allow editing current week and future weeks
          return goalDate.isSameOrAfter(today.startOf('week'), 'day');
        } if (period === 'month') {
          // Allow editing current month and future months
          return goalDate.isSameOrAfter(today.startOf('month'), 'day');
        }
      }

      // For other periods, use the original logic
      return isItBeforeToday(period, date);
    },
    getPeriodDate: (period, date) => {
      const periodDate = getPeriodDate(period, date, '');
      switch (period) {
        case 'day':
          return `${periodDate} ${moment(date, 'DD-MM-YYYY').format('MMMM YYYY')}`;
        case 'week':
          return `${periodDate} ${moment(date, 'DD-MM-YYYY').format('YYYY')}`;
        case 'month':
          return `${periodDate} ${moment(date, 'DD-MM-YYYY').format('YYYY')}`;
        case 'year':
          return periodDate;
        case 'lifetime':
          return 'Know your life mission';
        default:
          return periodDate;
      }
    },
    handleDeleteTaskGoal(payload) {
      this.$emit('delete-task-goal', payload);
    },
    handleCompleteGoalItem(payload) {
      console.log('[GoalsFilterTime] handleCompleteGoalItem received:', payload);
      this.$emit('complete-goal-item', payload);
    },
    handleCompleteSubTask(payload) {
      this.$emit('complete-sub-task', payload);
    },
    inRangeType(date) {
      const startDate = moment(date, 'DD-MM-YYYY');
      const todayDate = moment(new Date(), 'DD-MM-YYYY');

      // If a specific month is selected, check if the goal belongs to that month
      if (this.selectedMonth) {
        const selectedMonthMoment = moment(this.selectedMonth, 'DD-MM-YYYY');
        const goalMonth = startDate.format('YYYY-MM');
        const selectedMonthStr = selectedMonthMoment.format('YYYY-MM');

        // For week goals, check if the week falls within the selected month
        if (this.periodFilter === 'week') {
          // Week goals are stored with Friday date, check if the week overlaps with selected month
          const weekStart = startDate.clone().startOf('week');
          const weekEnd = startDate.clone().endOf('week');
          const monthStart = selectedMonthMoment.clone().startOf('month');
          const monthEnd = selectedMonthMoment.clone().endOf('month');

          // Week overlaps with month if week start is before month end AND week end is after month start
          return weekStart.isSameOrBefore(monthEnd) && weekEnd.isSameOrAfter(monthStart);
        }

        // For month goals, check exact month match
        if (this.periodFilter === 'month') {
          return goalMonth === selectedMonthStr;
        }

        // For year and lifetime, always show
        if (this.periodFilter === 'year' || this.periodFilter === 'lifetime') {
          return true;
        }

        // For day goals, check if in selected month
        return goalMonth === selectedMonthStr;
      }

      // Fallback to original behavior if no selectedMonth
      if (this.rangeType === 'upcoming') {
        return moment(startDate).isSameOrAfter(todayDate, 'day') || date === '01-01-1970';
      } if (this.rangeType === 'past') {
        return moment(startDate).isBefore(todayDate, 'day') && date !== '01-01-1970';
      }

      return true;
    },
  },
  filters: {
    capitalize(value) {
      if (!value) return '';
      const str = value.toString();
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
  },
};
</script>
