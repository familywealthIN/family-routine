<script>
/**
 * Write unit: the AUTOMATE chip's "Make it a routine".
 *
 * One container, one mutation — `addRoutineItem`, the same server op the Routines
 * editor uses. A routine item recurs every day at a time, which is the ONLY
 * cadence the RoutineItem schema can express; see `ROUTINE_RULE`.
 *
 * It lands at the time of the routine the item was filed under, so it reads as
 * part of that block, at the minimum the server accepts (1 point) so the chip
 * invents as little economy value as it can. The server enforces the 100-point
 * day budget, so on a full day this write is refused and the page says why.
 * (A routine item's D stimulus is derived from the
 * gap to the next one, so adding one does re-split the day's D — exactly as
 * adding one in Routines settings does.)
 *
 * No cache surgery: `routineItems` has no normalized list in this page's cache,
 * and `routineDate` re-syncs the day's tasklist from `routineItems` server-side
 * on every read, so the caller just refetches the board query.
 */
import { ADD_PRIORITY_ROUTINE_ITEM_MUTATION } from '../composables/graphql/priorityQueries';

/** Fallback when the item is in the "No routine" bucket — mid-morning. */
export const DEFAULT_ROUTINE_TIME = '09:00';

export default {
  name: 'PriorityRoutineCreateContainer',
  render() {
    return null;
  },
  methods: {
    /**
     * @param {Object} item   a board row (utils/priorityBoard `toRow`)
     * @param {Object} [host] the routine it is filed under — `{ name, time }`
     * @returns {Promise<Object|null>} the created RoutineItem
     */
    automate(item, host) {
      if (!item || !item.body) return Promise.resolve(null);
      const time = (host && host.time) || DEFAULT_ROUTINE_TIME;

      return this.$apollo.mutate({
        mutation: ADD_PRIORITY_ROUTINE_ITEM_MUTATION,
        variables: {
          name: item.body,
          description: '',
          time,
          points: 1,
          tags: ['priority:automate'],
        },
      })
        .then(({ data }) => {
          const created = (data && data.addRoutineItem) || null;
          this.$emit('automated', { item, host, created });
          return created;
        })
        .catch((error) => {
          console.error('[PriorityRoutineCreateContainer] automate failed:', error);
          this.$emit('error', { item, error });
          throw error;
        });
    },
  },
};
</script>
