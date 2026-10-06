<template>
  <!--
    One organism (`GroupLeaveSheet`) + one mutation (`leaveGroup`).

    The old page asked with a browser `confirm()`; the sheet replaces it. The
    mutation only ever runs from the sheet's own "Leave group" button, so there is
    no path left that leaves the group without the consequence being stated.
  -->
  <group-leave-sheet
    :open="open"
    :shell="shell"
    :others-names="othersNames"
    @confirm="onConfirm"
    @close="$emit('close')"
  />
</template>

<script>
import GroupLeaveSheet from '@routine-notes/ui/organisms/GroupLeaveSheet/GroupLeaveSheet.vue';
import { LEAVE_GROUP_MUTATION } from '../composables/graphql/groupQueries';

export default {
  name: 'GroupLeaveContainer',
  components: { GroupLeaveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    othersNames: { type: String, default: 'the others' },
  },
  methods: {
    onConfirm() {
      // `leaveGroup` returns a partial UserItem (`email`, `groupId`) with no id,
      // so it normalizes to nothing and cannot overwrite a sibling field. The
      // page refetches its own `showInvite` read on `left`, which is what
      // actually re-derives "you are in no group".
      this.$apollo.mutate({ mutation: LEAVE_GROUP_MUTATION })
        .then(() => {
          this.$emit('left');
        })
        .catch((error) => {
          console.error('[GroupLeaveContainer] leaveGroup failed:', error);
          this.$emit('failed');
        });
    },
  },
};
</script>
