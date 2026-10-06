<template>
  <!--
    Skip day's data layer (containers/ARCHITECTURE.md).

    One organism (SkipDaySheet) + one mutation (`skipRoutine`). The classic
    dashboard declares the same mutation inline next to its Skip Day switch; this
    container shares the document from `graphql/goalItemQueries.js` so the two
    screens cannot drift, and it writes the Routine entity by id rather than
    rewriting `ROUTINE_DATE_QUERY` the way `DashBoard.skipClick` does.

    The server refuses a third skip in a week and says so; that message is shown
    in the sheet instead of a generic failure, because behind generic text the
    sheet just closes and nothing happens, which reads as a broken control.
  -->
  <skip-day-sheet
    :open="open"
    :shell="shell"
    :day-label="dayLabel"
    :skipped="skipped"
    :error-message="errorMessage"
    @close="close"
    @confirm="onConfirm"
  />
</template>

<script>
import SkipDaySheet from '@routine-notes/ui/organisms/SkipDaySheet/SkipDaySheet.vue';
import { SKIP_ROUTINE_MUTATION } from '../composables/graphql/goalItemQueries';
import { patchEntity } from '../composables/useEntityCache';
import { guardFields, releaseEntity } from '../utils/cacheGuard';

export default {
  name: 'SkipDayContainer',
  components: { SkipDaySheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** "Saturday, 12 September". */
    dayLabel: { type: String, default: 'today' },
    /** Already skipped — the sheet offers to undo. */
    skipped: { type: Boolean, default: false },
    /** The day's Routine document id. Empty until `routineDate` resolves. */
    routineId: { type: String, default: '' },
  },
  data() {
    return { errorMessage: '' };
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.errorMessage = '';
    },
  },
  methods: {
    close() {
      this.errorMessage = '';
      this.$emit('close');
    },
    onConfirm({ skip, reason }) {
      if (!this.routineId) {
        // Not a disable-while-loading: the control stayed live and says what is
        // missing (ARCHITECTURE §3.7 — `DashBoard.ensureRoutineId` is the same
        // shape, queueing rather than rejecting the tap).
        this.errorMessage = "Today's routine hasn't loaded yet. Try again in a moment.";
        return;
      }

      guardFields('Routine', this.routineId, ['skip']);
      // Optimistic in the store so the week strip and the card react at once;
      // the mutation's own result confirms it.
      this.$routine.setSkipDay(skip);

      this.$apollo
        .mutate({
          mutation: SKIP_ROUTINE_MUTATION,
          variables: { id: this.routineId, skip },
          optimisticResponse: {
            __typename: 'Mutation',
            skipRoutine: { __typename: 'Routine', id: this.routineId, skip },
          },
          update: (cache, { data }) => {
            const saved = data && data.skipRoutine;
            if (saved) {
              patchEntity(cache, {
                typename: 'Routine', id: saved.id, fields: { skip: saved.skip },
              });
            }
          },
        })
        .then(() => {
          this.close();
          this.$emit('changed', { skip, reason });
        })
        .catch((error) => {
          releaseEntity('Routine', this.routineId);
          this.$routine.setSkipDay(!skip);
          const [gqlError] = (error && error.graphQLErrors) || [];
          this.errorMessage = (gqlError && gqlError.message)
            || "Couldn't change today's skip. Check your connection and try again.";
        });
    },
  },
};
</script>
