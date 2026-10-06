<script>
/**
 * `declineInvite` — a single-op write unit, renderless by design.
 *
 * ARCHITECTURE.md §2: an organism that needs a read *and* several writes is
 * composed from several containers — "a read container that renders the organism,
 * whose write events are handled by injected single-op mutation units". The join
 * request card has two outcomes; `GroupJoinRequestContainer` owns the organism
 * and `acceptInvite`, and this unit owns the other mutation, so a bug in either
 * can only reach one operation.
 *
 * Called imperatively: `this.$refs.decline.run()`.
 */
import { DECLINE_INVITE_MUTATION } from '../composables/graphql/groupQueries';

export default {
  name: 'GroupInviteDeclineContainer',
  render() {
    // No markup: this unit is a mutation, not a thing on screen.
    return null;
  },
  methods: {
    run() {
      // Returns a partial UserItem with no id — nothing to patch, nothing it can
      // corrupt. The caller refetches `showInvite`, which is what clears the card.
      return this.$apollo.mutate({ mutation: DECLINE_INVITE_MUTATION })
        .then(() => {
          this.$emit('done');
        })
        .catch((error) => {
          console.error('[GroupInviteDeclineContainer] declineInvite failed:', error);
          this.$emit('failed');
        });
    },
  },
};
</script>
