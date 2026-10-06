<script>
/**
 * The points balance the chassis header needs, as a container.
 *
 * Every redesigned page renders `AppShell`, and `AppShell` draws the points chip
 * and the drawer's `{points} points` row on all three shells. A page may not own
 * a query (ARCHITECTURE.md §1), and a page that defaults the chip to `0` tells
 * the user their balance is zero when it simply has not been read — the exact
 * unknown-vs-zero defect D-10 was filed for. So the read lives here.
 *
 * Renderless with a scoped slot rather than wrapping one organism: the "organism"
 * is whatever shell the page puts inside it. `xpBalance` is a display read, so
 * `cache-and-network` (§3.4); it is shared with MobileLayout / DesktopLayout /
 * DashBoard through one normalized cache entry.
 *
 * NOTE: `AppShellContainer` owns the same read for pages that mount the shell
 * through a container instead. The two want consolidating into one owner — see
 * the Agents handoff notes.
 *
 * Usage:
 *   <xp-balance-container v-slot="points">
 *     <app-shell :points="points.available" :points-entitled="points.entitled" … />
 *   </xp-balance-container>
 */
import { XP_BALANCE_QUERY } from '../composables/graphql/queries';

export default {
  name: 'XpBalanceContainer',
  data() {
    return { xpBalance: null, xpBalanceError: false };
  },
  apollo: {
    xpBalance: {
      query: XP_BALANCE_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) { return (data && data.xpBalance) || null; },
      result(result) {
        if (result && result.data) this.xpBalanceError = false;
      },
      error() {
        this.xpBalanceError = true;
      },
    },
  },
  computed: {
    slotProps() {
      const balance = this.xpBalance;
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.xpBalance;
      return {
        available: (balance && balance.available) || 0,
        pendingToday: (balance && balance.pendingToday) || 0,
        entitled: !!(balance && balance.entitled),
        // "No data yet", never "a request is in flight" — with cache-and-network
        // `loading` stays true while a cached balance is already on screen (§3.7).
        loading: !!(query && query.loading) && !balance,
        error: this.xpBalanceError && !balance,
      };
    },
  },
  render() {
    const slot = this.$scopedSlots.default;
    return slot ? slot(this.slotProps) : null;
  },
};
</script>
