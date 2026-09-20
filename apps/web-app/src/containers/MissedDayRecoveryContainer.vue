<template>
  <MissedDayRecovery
    :missed-day="missedDay"
    @open-day="$emit('open-day', $event)"
    @dismiss="dismiss"
  />
</template>

<script>
/**
 * Container home for the MissedDayRecovery organism (see ARCHITECTURE.md).
 *
 * Owns one read — the same weekStimuli query the week strip runs, with the same
 * variables, so both containers observe a single cache entry and can never
 * disagree about what a day scored — and derives the missed day from it with
 * utils/missedDay.
 */
import moment from 'moment';
import MissedDayRecovery from '@routine-notes/ui/organisms/MissedDayRecovery/MissedDayRecovery.vue';
import { WEEK_STIMULI_QUERY } from '../composables/graphql/queries';
import { findMissedDay } from '../utils/missedDay';

// Dismissal is per session and per missed date: saying "not now" should quiet
// the card for the rest of the day, not bury the day for good.
const MISSED_DAY_DISMISS_KEY = 'missedDayDismissedFor';

export default {
  name: 'MissedDayRecoveryContainer',

  components: {
    MissedDayRecovery,
  },

  props: {
    date: {
      type: String,
      default: () => moment().format('DD-MM-YYYY'),
    },
  },

  data() {
    return {
      weekStimuli: [],
      dismissedFor: sessionStorage.getItem(MISSED_DAY_DISMISS_KEY) || '',
    };
  },

  computed: {
    currentWeekStart() {
      return moment(this.date, 'DD-MM-YYYY').startOf('week').format('DD-MM-YYYY');
    },
    missedDay() {
      const missed = findMissedDay(this.weekStimuli, this.date);
      if (!missed || missed.date === this.dismissedFor) {
        return null;
      }
      return missed;
    },
  },

  apollo: {
    weekStimuli: {
      query: WEEK_STIMULI_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        // Week start, matching WeekdaySelectorContainer — same cache entry.
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

  methods: {
    dismiss(date) {
      sessionStorage.setItem(MISSED_DAY_DISMISS_KEY, date);
      this.dismissedFor = date;
    },
  },
};
</script>
