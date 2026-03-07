<template>
  <WeekdaySelector
    :selectedDate="selectedDate"
    :weekStimuliMap="weekStimuliMap"
    :loadingDay="loadingDay"
    :isLoading="isLoading"
    @date-selected="$emit('date-selected', $event)"
  />
</template>

<script>
import moment from 'moment';
import WeekdaySelector from '../components/organisms/WeekdaySelector/WeekdaySelector.vue';
import { WEEK_STIMULI_QUERY } from '../composables/graphql/queries';

export default {
  name: 'WeekdaySelectorContainer',

  components: {
    WeekdaySelector,
  },

  props: {
    selectedDate: {
      type: String,
      default: () => moment().format('DD-MM-YYYY'),
    },
    loadingDay: {
      type: Number,
      default: null,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      weekStimuli: [],
      lastQueriedWeekStart: null,
    };
  },

  computed: {
    currentWeekStart() {
      return moment(this.selectedDate, 'DD-MM-YYYY').startOf('week').format('DD-MM-YYYY');
    },
    weekStimuliMap() {
      if (!this.weekStimuli || !this.weekStimuli.length) {
        return {};
      }
      const map = {};
      this.weekStimuli.forEach((day) => {
        map[day.date] = { D: day.D, K: day.K, G: day.G };
      });
      return map;
    },
  },

  apollo: {
    weekStimuli: {
      query: WEEK_STIMULI_QUERY,
      variables() {
        return { date: this.selectedDate };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        this.lastQueriedWeekStart = this.currentWeekStart;
        return data.weekStimuli || [];
      },
    },
  },

  watch: {
    selectedDate(newDate) {
      const newWeekStart = moment(newDate, 'DD-MM-YYYY').startOf('week').format('DD-MM-YYYY');
      // Only refetch when the week boundary changes
      if (newWeekStart !== this.lastQueriedWeekStart) {
        this.$apollo.queries.weekStimuli.refetch({ date: newDate });
      }
    },
  },
};
</script>
