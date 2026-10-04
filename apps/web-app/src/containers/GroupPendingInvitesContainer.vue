<script>
/**
 * The invites you have sent that are still open: `pendingInvites`.
 *
 * Renderless, like `GroupIdentityContainer`: the pending rows are drawn by
 * `GroupMemberList` (through `GroupMembersContainer`), but the page also needs
 * them for the 10-member cap and the invite form's duplicate check, so the read
 * leaves as an event.
 *
 * The server is the source of truth — a declined or cancelled invite clears the
 * invitee's `inviterEmail`, so it drops out here and stops holding a slot on
 * every device. (It used to be a per-device localStorage list.)
 *
 * Usage:
 *   <group-pending-invites-container ref="pendingInvites" @pending="onPending" />
 */
import { PENDING_INVITES_QUERY } from '../composables/graphql/groupQueries';

export default {
  name: 'GroupPendingInvitesContainer',
  data() {
    return { pendingInvites: null };
  },
  apollo: {
    pendingInvites: {
      query: PENDING_INVITES_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) {
        return (data && data.pendingInvites) || [];
      },
      error(error) {
        console.error('[GroupPendingInvitesContainer] pendingInvites failed:', error);
      },
    },
  },
  computed: {
    /** `{ id, email, name, picture }` per open invite; the email is the key. */
    pending() {
      return (this.pendingInvites || [])
        .filter((invite) => invite && invite.email)
        .map((invite) => ({
          id: String(invite.email).toLowerCase(),
          email: invite.email,
          name: invite.name || '',
          picture: invite.picture || '',
        }));
    },
  },
  watch: {
    pending(next, previous) {
      if (previous && JSON.stringify(next) === JSON.stringify(previous)) return;
      // Not emitted before the first answer lands: an empty list there would be
      // a guess, not "you have no open invites".
      if (this.pendingInvites) this.$emit('pending', next);
    },
  },
  methods: {
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.pendingInvites;
      if (query) query.refetch().catch(() => {});
    },
  },
  render() {
    // Nothing to draw: this container is a read, not a thing on screen.
    return null;
  },
};
</script>
