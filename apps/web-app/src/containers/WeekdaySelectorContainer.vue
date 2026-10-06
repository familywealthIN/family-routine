<template>
  <WeekdaySelector
    :selectedDate="selectedDate"
    :weekStimuliMap="weekStimuliMap"
    :loadingDay="loadingDay"
    :isLoading="isLoading"
    :ringSize="ringSize"
    :skippedDates="allSkippedDates"
    :todayDate="todayDate"
    @date-selected="$emit('date-selected', $event)"
    @long-press="$emit('long-press', $event)"
  />
</template>

<script>
import moment from 'moment';
import WeekdaySelector from '@routine-notes/ui/organisms/WeekdaySelector/WeekdaySelector.vue';
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
    // Forwarded to the strip; null keeps its responsive default.
    ringSize: {
      type: Number,
      default: null,
    },
    /**
     * Days the host already knows are skipped — the optimistic value for the day
     * it is looking at. Merged with what `weekStimuli` reports, so the pause
     * overlay appears the moment the skip is confirmed locally instead of a round
     * trip later.
     */
    skippedDates: {
      type: Array,
      default: () => [],
    },
    /** Which cell may be long-pressed to open the skip sheet. */
    todayDate: {
      type: String,
      default: null,
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
    /**
     * `weekStimuli.skipped` is why the strip can tell a rest day from a day that
     * got away — both score zero (see DayStimuliType in resolvers/routine.js).
     */
    allSkippedDates() {
      const fromServer = (this.weekStimuli || [])
        .filter((day) => day && day.skipped)
        .map((day) => day.date);
      const merged = fromServer.concat(this.skippedDates || []);
      return merged.filter((date, i) => !!date && merged.indexOf(date) === i);
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
    eventBus.$on(EVENTS.DASHBOARD_REFRESH, this.handleRoutineTicked);
  },

  beforeDestroy() {
    eventBus.$off(EVENTS.ROUTINE_TICKED, this.handleRoutineTicked);
    eventBus.$off(EVENTS.DASHBOARD_REFRESH, this.handleRoutineTicked);
    if (this._refetchTimer) clearTimeout(this._refetchTimer);
  },

  methods: {
    handleRoutineTicked() {
      // Debounce — a rapid burst of ticks should produce one refetch,
      // not N. Also defer until after any in-flight optimistic mutation
      // has resolved so the refetch result is server-correct.
      if (this._refetchTimer) clearTimeout(this._refetchTimer);
      this._refetchTimer = setTimeout(() => {
        this._refetchTimer = null;
        this.$apollo.queries.weekStimuli.refetch();
      }, 250);
    },
  },
};
</script>
