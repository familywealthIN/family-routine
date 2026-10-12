<script>
/**
 * One read: `routineTiming` for a date range, on time / late / missed per day
 * and per routine. Renderless with a scoped slot (the `GoalRoutineIndexContainer`
 * form, ARCHITECTURE § 2) because two different organisms draw it: the user
 * drawer's day ribbon and the Progress page's Timing card.
 *
 * `paused` holds the read back until it is wanted (the drawer is closed), and
 * `cache-and-network` re-reads on every resume, so ticks made since the last
 * open show up.
 *
 * Usage:
 *   <routine-timing-container v-slot="{ timing, loading, error }" ...>
 */
import { ROUTINE_TIMING_QUERY } from '../composables/graphql/progressQueries';

export default {
  name: 'RoutineTimingContainer',

  props: {
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    /** The user's own today, so an unticked past day reads missed. */
    today: { type: String, default: '' },
    paused: { type: Boolean, default: false },
  },

  data() {
    return { routineTiming: null, error: false };
  },

  apollo: {
    routineTiming: {
      query: ROUTINE_TIMING_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { startDate: this.startDate, endDate: this.endDate, today: this.today || null };
      },
      skip() {
        return this.paused || !this.$root.$data.email;
      },
      update(data) {
        return (data && data.routineTiming) || null;
      },
      result({ data }) {
        if (data) this.error = false;
      },
      error(error) {
        // eslint-disable-next-line no-console
        console.error('[RoutineTimingContainer] routineTiming query error:', error);
        this.error = true;
      },
    },
  },

  computed: {
    /** Only the range being asked for: vue-apollo keeps the last result across a variable change. */
    timing() {
      const t = this.routineTiming;
      return t && t.startDate === this.startDate && t.endDate === this.endDate ? t : null;
    },
  },

  render() {
    const slot = this.$scopedSlots.default;
    return slot ? slot({
      timing: this.timing,
      loading: !this.timing && !this.error,
      error: this.error && !this.timing,
    }) : null;
  },
};
</script>
