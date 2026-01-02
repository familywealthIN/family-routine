<template>
  <v-list subheader>
    <v-subheader
      class="subheading"
    >
      {{ periodFilter | capitalize }} Goals
    </v-subheader>
    <div v-if="goals && goals.length">
      <template v-for="goal in goals">
        <v-list-group
          :key="goal.id"
          v-if="goal.period === periodFilter && inRangeType(goal.date)"
          no-action
        >
          <template v-slot:activator>
            <v-list-tile>
              <v-list-tile-content>
                <v-list-tile-title>{{ getPeriodDate(goal.period, goal.date) }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </template>
          <goal-item-list
            @update-new-goal-item="updateNewGoalItem"
            :goal="goal"
            :editMode="shouldAllowEdit(goal.period, goal.date)"
          />
        </v-list-group>
      </template>
    </div>
    <div class="text-xs-center" v-else>
      You Don't have any Goals.
    </div>
  </v-list>
</template>

<script>
import moment from 'moment';

import { getPeriodDate, isItBeforeToday } from '../../../utils/getDates';
import GoalItemList from '../GoalItemList/GoalItemList.vue';

export default {
  components: {
    GoalItemList,
  },
  props: ['goals', 'periodFilter', 'updateNewGoalItem', 'rangeType'],
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
        } else if (period === 'month') {
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
      }
    },
    inRangeType(date)  {
      const startDate = moment(date, "DD-MM-YYYY");
      const todayDate = moment(new Date(), "DD-MM-YYYY");

      if(this.rangeType === 'upcoming') {
        return moment(startDate).isSameOrAfter(todayDate, "day") || date === '01-01-1970';
      } else if (this.rangeType === 'past') {
        return moment(startDate).isBefore(todayDate, "day") && date !== '01-01-1970';
      }

      return true;
    }
  },
  filters: {
  capitalize: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
};
</script>
