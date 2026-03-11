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
import eventBus, { EVENTS } from '../utils/eventBus';

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
      fetchPolicy: 'cache-and-network',
      variables() {
        // Use week start so same-week date changes don't trigger refetches
        return { date: this.currentWeekStart };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.weekStimuli || [];
      },
    },
  },

  mounted() {
    eventBus.$on(EVENTS.ROUTINE_TICKED, this.handleRoutineTicked);
  },

  beforeDestroy() {
    eventBus.$off(EVENTS.ROUTINE_TICKED, this.handleRoutineTicked);
  },

  methods: {
    handleRoutineTicked() {
      this.$apollo.queries.weekStimuli.refetch();
    },
  },
};
</script>
