<template>
  <span>
    <span>
      <v-icon>{{getButtonIcon(goalItem.isComplete)}}</v-icon>
    </span>
    <span>
    <h4 style="display:inline" :class="{ completed: goalItem.isComplete}">
      {{getPeriodDate(goalItem.period, goalItem.date)}}{{goalItem.body}}
    </h4>
    </span>
  </span>
</template>
<script>
import moment from 'moment';

export default {
  props: ['goalItem'],
  data() {
    return {
      show: true,
    };
  },
  methods: {
    getButtonIcon(isMilestone) {
      if (isMilestone) {
        return 'check';
      }
      return 'close';
    },
    getPeriodDate(period, date) {
      const SEPERATOR = ' - ';
      switch (period) {
        case 'day':
          return moment(date, 'DD-MM-YYYY').format('DD') + SEPERATOR;
        case 'week':
          return `Week ${moment(date, 'DD-MM-YYYY').week()}${SEPERATOR}`;
        case 'month':
          return moment(date, 'DD-MM-YYYY').format('MMMM') + SEPERATOR;
        case 'year':
          return moment(date, 'DD-MM-YYYY').format('YYYY') + SEPERATOR;
        case 'lifetime':
          return '';

        default:
          return date;
      }
    },
  },
};
</script>

<style>
  .completed {
    text-decoration: line-through;
  }
  .v-list__group__items--no-action .v-list__tile {
    padding-left: 16px;
  }
</style>
