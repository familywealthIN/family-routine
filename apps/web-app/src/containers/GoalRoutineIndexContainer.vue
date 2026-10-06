<script>
/**
 * Routine identity for the Goals screen: name + scheduled time per `taskRef`.
 *
 * Every period on this page groups its goals BY ROUTINE in time order, and the
 * Today tab badges the routine whose window contains now — none of which a Goal
 * document knows. `routineItems` is the one field that does.
 *
 * Renderless with a scoped slot (the `XpBalanceContainer` form, ARCHITECTURE § 2)
 * because this read has no organism of its own: it feeds the cascade list, the
 * calendar's sibling and the new-goal sheet's routine chips at once, and the page
 * is what composes those.
 *
 * The query takes no variables, so this container and the three agent containers
 * that mount the same document observe ONE normalized cache entry and cannot
 * disagree about what a routine is called.
 *
 * Usage:
 *   <goal-routine-index-container v-slot="{ routines }">
 *     …
 *   </goal-routine-index-container>
 */
import { ROUTINE_INDEX_QUERY } from '../composables/graphql/goalsQueries';
import { orderedRoutines } from '../utils/goalCascade';

export default {
  name: 'GoalRoutineIndexContainer',

  data() {
    return { routineItems: [] };
  },

  apollo: {
    routineItems: {
      query: ROUTINE_INDEX_QUERY,
      fetchPolicy: 'cache-and-network',
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return (data && data.routineItems) || [];
      },
      error(error) {
        console.error('[GoalRoutineIndexContainer] routineItems query error:', error);
      },
    },
  },

  computed: {
    /** Time order once, here, so no consumer sorts a second time. */
    routines() {
      return orderedRoutines(this.routineItems);
    },
  },

  render() {
    const slot = this.$scopedSlots.default;
    return slot ? slot({ routines: this.routines }) : null;
  },
};
</script>
