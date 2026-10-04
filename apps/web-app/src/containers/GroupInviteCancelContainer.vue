<script>
/**
 * `cancelInvite` — a single-op write unit, renderless by design (see
 * `GroupInviteDeclineContainer` for the pattern, ARCHITECTURE.md §2).
 *
 * The pending row is drawn by `GroupMemberList`, whose read is not this
 * mutation's, so the cancel lives in its own unit. The server clears the
 * invitee's `inviterEmail` only when you sent the invite; anything else 403s.
 *
 * Called imperatively: `this.$refs.cancelInvite.run(email)`. Resolves `true`
 * on success and `false` on failure (after emitting `done` / `failed`), so the
 * caller removes the row only once the server has agreed.
 */
import { CANCEL_INVITE_MUTATION } from '../composables/graphql/groupQueries';

export default {
  name: 'GroupInviteCancelContainer',
  render() {
    // No markup: this unit is a mutation, not a thing on screen.
    return null;
  },
  methods: {
    run(invitedEmail) {
      // Returns a partial UserItem with no id — nothing to patch. The page
      // refetches `pendingInvites`, which is what drops the row everywhere.
      return this.$apollo.mutate({
        mutation: CANCEL_INVITE_MUTATION,
        variables: { invitedEmail },
      })
        .then(() => {
          this.$emit('done', invitedEmail);
          return true;
        })
        .catch((error) => {
          console.error('[GroupInviteCancelContainer] cancelInvite failed:', error);
          this.$emit('failed', invitedEmail);
          return false;
        });
    },
  },
};
</script>
