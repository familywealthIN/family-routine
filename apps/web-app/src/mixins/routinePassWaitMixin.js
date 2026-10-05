/**
 * passed / wait maintenance for today's routine items.
 *
 * Every open of the dashboard sweeps the day's items and tells the server which
 * ones have gone by (`passed`, which is what makes a task redeemable with
 * points) and which are no longer "waiting" to start. Extracted from
 * DashBoard.vue so the Routine Focus home screen runs the SAME sweep — these
 * two methods carry several hard-won guards and must not exist twice.
 *
 * Requires on the host component:
 *   - `did`      the routine DOCUMENT id for the viewed date
 *   - `tasklist` the day's routine items
 *   - `$apollo`, `$notify`
 */
import moment from 'moment';
import gql from 'graphql-tag';
import { TIMES_UP_TIME, PROACTIVE_START_TIME } from '../constants/settings';
import { pendingMutations } from '../utils/pendingMutations';

export const PASS_ROUTINE_ITEM_MUTATION = gql`
  mutation passRoutineItem(
    $id: ID!
    $taskId: String!
    $ticked: Boolean!
    $passed: Boolean!
  ) {
    passRoutineItem(id: $id, taskId: $taskId, ticked: $ticked, passed: $passed) {
      id
      tasklist {
        id
        name
        ticked
        passed
        redeemed
        passedPoints
      }
    }
  }
`;

export const WAIT_ROUTINE_ITEM_MUTATION = gql`
  mutation waitRoutineItem($id: ID!, $taskId: String!, $wait: Boolean!) {
    waitRoutineItem(id: $id, taskId: $taskId, wait: $wait) {
      id
      tasklist {
        id
        name
        wait
      }
    }
  }
`;

export const routinePassWaitMixin = {
  methods: {
    passedTime(item) {
      // Guards, in order:
      //  - `did`: without the routine document id the mutation 500s.
      //  - pendingMutations: a tick for this task may be in flight. Reading
      //    `item.ticked` while it is would mark a task the user completed ON
      //    TIME as passed — permanently, server-side — which is the reported
      //    "routine shows missed even though I ticked in time".
      //  - `passedInFlight`: this runs from a tasklist watcher, and
      //    passRoutineItem's response writes the cache, which re-fires that
      //    watcher. Unguarded, one app-open fired ~20 pass/wait mutations.
      if (!this.did) return;
      if (!item || !item.id) return;
      if (pendingMutations.has(`routine:${item.id}`)) return;
      if (!this.passedInFlight) this.passedInFlight = {};
      if (this.passedInFlight[item.id]) return;
      if (item.ticked) return;

      const exp = moment(item.time, 'HH:mm').diff(moment());
      if (moment.duration(exp).asMinutes() >= -TIMES_UP_TIME || item.passed) return;

      // NOTE: no `item.passed = true` here. `item` is Apollo's normalized
      // RoutineItem result object — assigning to it edits the cache's own
      // memoized copy behind Apollo's back, so the store and what components
      // read drift apart. The response below is the only thing allowed to
      // change it.
      this.passedInFlight[item.id] = true;
      this.$apollo
        .mutate({
          mutation: PASS_ROUTINE_ITEM_MUTATION,
          variables: {
            id: this.did,
            taskId: item.id,
            ticked: item.ticked,
            passed: true,
          },
          // No `update` callback. The mutation returns RoutineItem entities by
          // id, so Apollo normalizes `passed`/`ticked` into every query that
          // holds them.
        })
        .catch(() => {
          this.notifyPassWaitFailure();
        })
        .finally(() => {
          delete this.passedInFlight[item.id];
        });
    },

    waitTime(item) {
      // Same guards as passedTime — see the note there.
      if (!this.did) return;
      if (!item || !item.id) return;
      if (pendingMutations.has(`routine:${item.id}`)) return;
      if (!this.waitInFlight) this.waitInFlight = {};
      if (this.waitInFlight[item.id]) return;
      if (item.ticked) return;

      const exp = moment(item.time, 'HH:mm').diff(moment());
      if (moment.duration(exp).asMinutes() >= PROACTIVE_START_TIME || !item.wait) return;

      this.waitInFlight[item.id] = true;
      this.$apollo
        .mutate({
          mutation: WAIT_ROUTINE_ITEM_MUTATION,
          variables: {
            id: this.did,
            taskId: item.id,
            wait: false,
          },
          // The selection set includes `id` on each task, so Apollo normalizes
          // the response into RoutineItem:<id> instead of storing an
          // unidentifiable list. That is what makes a manual cache write
          // unnecessary — and its absence is why `wait` used to oscillate
          // true/false/true across a burst of these mutations.
        })
        .catch(() => {
          this.notifyPassWaitFailure();
        })
        .finally(() => {
          delete this.waitInFlight[item.id];
        });
    },

    setPassedWait() {
      (this.tasklist || []).forEach((task) => {
        this.passedTime(task);
        this.waitTime(task);
      });
    },

    notifyPassWaitFailure() {
      this.$notify({
        title: 'Error',
        text: 'An unexpected error occured',
        group: 'notify',
        type: 'error',
        duration: 3000,
      });
    },
  },
};

export default routinePassWaitMixin;
