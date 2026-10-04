<template>
  <!--
    The join-request card: one organism + one mutation (`acceptInvite`). Decline
    is the injected single-op unit beside it (ARCHITECTURE.md §2).

    THE GAP THIS CLOSES: the mock's Accept handler only dismisses the card and
    toasts — it never switches groups (chassis.md, last line). `acceptInvite` is a
    real mutation that returns the caller's NEW `groupId`, so Accept emits that id
    and the page refetches its `showInvite` root: the member list, every member's
    week and the pulse all re-read against the group you just joined.
  -->
  <div>
    <group-join-request
      :inviter-email="inviterEmail"
      :in-group="inGroup"
      @accept="onAccept"
      @decline="onDecline"
    />
    <group-invite-decline-container
      ref="decline"
      @done="$emit('declined', inviterEmail)"
      @failed="$emit('failed', 'decline')"
    />
  </div>
</template>

<script>
import GroupJoinRequest from '@routine-notes/ui/organisms/GroupJoinRequest/GroupJoinRequest.vue';
import { ACCEPT_INVITE_MUTATION } from '../composables/graphql/groupQueries';
import GroupInviteDeclineContainer from './GroupInviteDeclineContainer.vue';

export default {
  name: 'GroupJoinRequestContainer',
  components: { GroupJoinRequest, GroupInviteDeclineContainer },
  props: {
    /** Who invited you — the server's `showInvite.inviterEmail`. */
    inviterEmail: { type: String, required: true },
    /** You are currently in a group, so accepting costs you that one. */
    inGroup: { type: Boolean, default: false },
  },
  methods: {
    onAccept() {
      this.$apollo.mutate({
        mutation: ACCEPT_INVITE_MUTATION,
        variables: { inviterEmail: this.inviterEmail },
      }).then(({ data }) => {
        const result = (data && data.acceptInvite) || {};
        // The new group id is the whole point: without it the page would keep
        // reading the group we just left.
        this.$emit('accepted', { inviterEmail: this.inviterEmail, groupId: result.groupId || '' });
      }).catch((error) => {
        console.error('[GroupJoinRequestContainer] acceptInvite failed:', error);
        this.$emit('failed', 'accept');
      });
    },
    onDecline() {
      this.$refs.decline.run();
    },
  },
};
</script>
