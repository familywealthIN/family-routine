<script>
/**
 * Profile's root read, as a container: `getUserTags`.
 *
 * It answers four questions at once — who you are, whether an MCP client has
 * completed OAuth, which legacy key exists, and the saved timezone — and four
 * different cards on the page derive from the answer. A page may not own a query
 * (ARCHITECTURE.md § 1) and one query per consumer would read the same document
 * four times, so the read lives here and leaves as an event. This is exactly the
 * shape `GroupIdentityContainer` already has for the Groups page.
 *
 * Renderless on purpose: there is no organism for "my account". `refresh()` is
 * how a sibling write container re-reads it — regenerating the API key and
 * saving a timezone both change the answer, and neither mutation can update the
 * cache by id because `UserItem` has no id at all (see profileQueries.js).
 *
 * Usage:
 *   <user-profile-container ref="profile" @profile="onProfile" @failed="onFailed" />
 */
import { USER_PROFILE_QUERY } from '../composables/graphql/profileQueries';

export default {
  name: 'UserProfileContainer',

  data() {
    return { userTags: null, failed: false };
  },

  apollo: {
    userTags: {
      query: USER_PROFILE_QUERY,
      // A stale `oauthConnected` would claim a connection that has lapsed.
      fetchPolicy: 'cache-and-network',
      update(data) {
        this.failed = false;
        return (data && data.getUserTags) || null;
      },
      error(error) {
        console.error('[UserProfileContainer] getUserTags failed:', error);
        this.failed = true;
        this.$emit('failed');
      },
    },
  },

  computed: {
    /**
     * `loaded` is what the page uses to tell "no key yet" from "not read yet".
     * It is derived from "a payload arrived", never from "a query is loading"
     * (ARCHITECTURE.md § 3.7).
     */
    profile() {
      const user = this.userTags || {};
      return {
        name: user.name || '',
        email: user.email || '',
        picture: user.picture || '',
        apiKey: user.apiKey || '',
        oauthConnected: !!user.oauthConnected,
        timezone: user.timezone || '',
        loaded: !!this.userTags,
      };
    },
  },

  watch: {
    profile: {
      immediate: true,
      handler(next, previous) {
        if (previous && JSON.stringify(next) === JSON.stringify(previous)) return;
        this.$emit('profile', next);
      },
    },
  },

  methods: {
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.userTags;
      if (query) query.refetch().catch(() => {});
    },
  },

  render() {
    // Nothing to draw: this container is a read, not a thing on screen.
    return null;
  },
};
</script>
