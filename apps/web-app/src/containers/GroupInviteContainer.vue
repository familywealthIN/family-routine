<template>
  <!--
    One organism (`GroupInviteSheet`) + one mutation (`sendInvite`).

    The form's own state — what has been typed, whether Send has been pressed —
    lives here rather than on the page: it is the invite flow's state, and no
    other container or organism reads it.
  -->
  <group-invite-sheet
    :open="open"
    :shell="shell"
    :email="email"
    :tried="tried"
    :taken="taken"
    :slots-left="slotsLeft"
    :sending="sending"
    @update:email="onInput"
    @send="onSend"
    @close="$emit('close')"
  />
</template>

<script>
import GroupInviteSheet from '@routine-notes/ui/organisms/GroupInviteSheet/GroupInviteSheet.vue';
import { inviteState } from '@routine-notes/ui/constants/groups';
import { SEND_INVITE_MUTATION } from '../composables/graphql/groupQueries';

export default {
  name: 'GroupInviteContainer',
  components: { GroupInviteSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** Emails already in the group or already invited. */
    taken: { type: Array, default: () => [] },
    slotsLeft: { type: Number, default: 0 },
    full: { type: Boolean, default: false },
  },
  data() {
    /** `sending`: a `sendInvite` is in flight — further presses are ignored. */
    return { email: '', tried: false, sending: false };
  },
  watch: {
    open(isOpen) {
      // Every opening is a fresh invite — a stale half-typed address in the field
      // is how you invite the wrong person.
      if (isOpen) {
        this.email = '';
        this.tried = false;
      }
    },
  },
  methods: {
    onInput(value) {
      this.email = value;
      // Typing again withdraws the "Enter a valid email address." verdict and
      // puts the field back to "Keep typing…".
      this.tried = false;
    },
    onSend() {
      // One request per press-and-wait: repeated clicks or Enters while the
      // mutation is in flight must not fire duplicate invites.
      if (this.sending) return;
      const state = inviteState({ email: this.email, tried: true, taken: this.taken });
      this.tried = true;
      if (!state.canSend || this.full) return;
      this.send(state.value);
    },
    send(invitedEmail) {
      // `sendInvite` returns a PARTIAL UserItem and the invitee is not in the
      // group until they accept, so there is nothing to patch into the cache —
      // the pending row is the page's optimistic record of the request.
      this.sending = true;
      this.$apollo.mutate({
        mutation: SEND_INVITE_MUTATION,
        variables: { invitedEmail },
      }).then(() => {
        this.sending = false;
        this.email = '';
        this.tried = false;
        this.$emit('sent', invitedEmail);
      }).catch((error) => {
        this.sending = false;
        const message = String((error && error.message) || '');
        this.$emit('failed', {
          email: invitedEmail,
          // The server 403s `User Not Found` for an email nobody has signed up
          // with — the one failure a user can actually act on.
          reason: /not found/i.test(message)
            ? 'No Routine Notes account uses that email yet'
            : 'We could not send that invite — try again',
        });
      });
    },
  },
};
</script>
