<script>
/**
 * The Groups page's root read, as a container: `showInvite`.
 *
 * It answers three questions at once — who you are, which group you are in, and
 * whether somebody has invited you — and every container below derives from the
 * answer. A page may not own a query (ARCHITECTURE.md §1), and the alternative
 * (one query per consumer) would read the same document three times, so the read
 * lives here and leaves as an event.
 *
 * Renderless on purpose: there is no organism for "who am I". Changing group is
 * what `refresh()` is for — accepting an invite, declining one, leaving, and the
 * first invite you ever send (which mints a group) all change the answer.
 *
 * Usage:
 *   <group-identity-container ref="identity" @identity="onIdentity" />
 */
import { SHOW_INVITE_QUERY } from '../composables/graphql/groupQueries';

export default {
  name: 'GroupIdentityContainer',
  data() {
    return { showInvite: null, failed: false };
  },
  apollo: {
    showInvite: {
      query: SHOW_INVITE_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) {
        this.failed = false;
        return (data && data.showInvite) || null;
      },
      error(error) {
        console.error('[GroupIdentityContainer] showInvite failed:', error);
        this.failed = true;
        this.$emit('failed');
      },
    },
  },
  computed: {
    identity() {
      const user = this.showInvite || {};
      return {
        me: {
          name: user.name || '',
          email: user.email || '',
          picture: user.picture || '',
        },
        groupId: user.groupId || '',
        inviterEmail: user.inviterEmail || '',
        loaded: !!this.showInvite,
      };
    },
  },
  watch: {
    identity: {
      immediate: true,
      handler(next, previous) {
        if (previous && JSON.stringify(next) === JSON.stringify(previous)) return;
        this.$emit('identity', next);
      },
    },
  },
  methods: {
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.showInvite;
      if (query) query.refetch().catch(() => {});
    },
  },
  render() {
    // Nothing to draw: this container is a read, not a thing on screen.
    return null;
  },
};
</script>
