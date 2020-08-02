<script>
/* eslint-disable max-len */
</script>
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
          v-if="goal.period === periodFilter"
          no-action
        >
          <template v-slot:activator>
            <v-list-tile>
              <v-list-tile-content>
                <v-list-tile-title>{{ getPeriodDate(goal.period, goal.date) }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </template>
          <goal-item-list @update-new-goal-item="updateNewGoalItem" :goal="goal" :editMode="true" />
        </v-list-group>
      </template>
    </div>
    <div class="text-xs-center" v-else>
      You Don't have any Goals in life.
    </div>
  </v-list>
</template>

<script>
import moment from 'moment';

import { getPeriodDate } from '../utils/getDates';
import GoalItemList from './GoalItemList.vue';

export default {
  components: {
    GoalItemList,
  },
  props: ['goals', 'periodFilter', 'updateNewGoalItem'],
  methods: {
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
