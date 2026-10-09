<template>
  <!-- The drawer's on-time ribbon: read the first time the drawer opens. -->
  <RoutineTimingContainer
    v-slot="{ timing }"
    :start-date="timingWindow.startDate"
    :end-date="timingWindow.endDate"
    :today="today"
    :paused="!drawerOpened"
  >
  <AppShell
    :active="active"
    :title="title"
    :subtitle="subtitle"
    :points="points"
    :points-entitled="pointsEntitled"
    :points-loading="pointsLoading"
    :points-error="pointsError"
    :user="user"
    :scores="scores"
    :year-average="yearAverage"
    :streak-days="streakDays"
    :streak-hint="streakHint"
    :status-bar="statusBar"
    :more-initially-open="moreInitiallyOpen"
    :timing="drawerTiming(timing, today)"
    v-on="$listeners"
    @open-drawer="drawerOpened = true"
  >
    <!--
      Forwarded unconditionally and NOT behind a `v-if`: `$scopedSlots` is not
      reactive, so a computed reading it would keep its cached answer when a
      resize changes whether the page supplies this slot. An empty <slot>
      renders nothing anyway, so there is nothing to guard.
    -->
    <template v-slot:header-actions>
      <slot name="header-actions"></slot>
    </template>
    <!-- Desktop sidebar content (Year Goals' year-goal list). Same reasoning as
         `header-actions`: forwarded unconditionally, never behind a `v-if`. -->
    <template v-slot:sidebar>
      <slot name="sidebar"></slot>
    </template>
    <!-- Tablet/desktop main column (Home's own header and panes). Forwarded
         unconditionally too: an empty slot normalizes to undefined, so the
         shell's own head/body fallback still renders for every other page. -->
    <template v-slot:main>
      <slot name="main"></slot>
    </template>
    <slot></slot>
  </AppShell>
  </RoutineTimingContainer>
</template>

<script>
/**
 * Container home for the AppShell organism (see ARCHITECTURE.md).
 *
 * The chassis' shell needs exactly one piece of server state - the points
 * balance behind the header chip - so that is the one operation this owns. Every
 * redesigned page mounts this instead of querying `xpBalance` for itself: with
 * the organism's `points` defaulting to 0, a page that skipped the read would
 * print a confident "0 diamonds" at a user who has hundreds, which is the
 * unknown-vs-zero mistake D-10 fixed on the chip itself.
 *
 * The signed-in user is NOT a query: `main.js` puts name / email / picture on
 * the root instance from the session, which is where the legacy drawer and
 * RoutineFocus both read it.
 *
 * Navigation and sign-out are forwarded untouched (`v-on="$listeners"`) - the
 * page owns the router, a container never does.
 *
 * NOTE: `XpBalanceContainer` is the renderless scoped-slot form of this same
 * read, for a page that renders `AppShell` itself. Both run the one
 * `XP_BALANCE_QUERY` with no variables, so they observe a single normalized cache
 * entry and cannot disagree - but there should be one owner. This is the
 * container home for the AppShell organism (ARCHITECTURE.md § 6), so the
 * consolidation to make is for the renderless one to go.
 */
import moment from 'moment';
import AppShell from '@routine-notes/ui/organisms/AppShell/AppShell.vue';
import RoutineTimingContainer from './RoutineTimingContainer.vue';
import { XP_BALANCE_QUERY } from '../composables/graphql/queries';
import { DATE_FORMAT, drawerWindow, drawerTiming } from '../utils/routineTiming';

export default {
  name: 'AppShellContainer',

  components: { AppShell, RoutineTimingContainer },

  props: {
    /** `navKey()` of the current page's nav item, e.g. 'progress'. */
    active: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    /**
     * The drawer's D/K/G trio, streak and the Goals ring. Owned by whichever
     * page can supply them; left null they are UNKNOWN and the shell hides them
     * rather than printing "0%" / "0-day streak" (same rule as the points chip).
     */
    scores: { type: Object, default: null },
    yearAverage: { type: Number, default: null },
    streakDays: { type: Number, default: null },
    streakHint: { type: String, default: '' },
    /**
     * The 24px strip in the design's tablet bezel is frame chrome - the OS
     * already paints one above a real WebView - so it is off by default here.
     */
    statusBar: { type: Boolean, default: false },
    /** Whether the shell's More list starts expanded (the design default). */
    moreInitiallyOpen: { type: Boolean, default: true },
  },

  data() {
    return {
      xpBalance: null,
      xpBalanceError: false,
      drawerOpened: false,
      today: moment().format(DATE_FORMAT),
    };
  },

  computed: {
    timingWindow() {
      return drawerWindow(this.today);
    },
    user() {
      const root = (this.$root && this.$root.$data) || {};
      return { name: root.name || '', email: root.email || '', picture: root.picture || '' };
    },
    points() {
      return (this.xpBalance && this.xpBalance.available) || 0;
    },
    pointsEntitled() {
      return !!(this.xpBalance && this.xpBalance.entitled);
    },
    /**
     * Derived from "there is no balance", not from "the query is loading"
     * (ARCHITECTURE § 3.7). With `cache-and-network` the query stays loading
     * while a cached balance is already on screen, and the inverse matters more
     * here: until a payload lands the balance is UNKNOWN, and the chip has to
     * say so with "…" rather than print a confident 0.
     */
    pointsLoading() {
      return !this.xpBalance && !this.xpBalanceError;
    },
    pointsError() {
      return this.xpBalanceError && !this.xpBalance;
    },
  },

  methods: { drawerTiming },

  apollo: {
    xpBalance: {
      query: XP_BALANCE_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) {
        return data.xpBalance;
      },
      result({ data }) {
        if (data) this.xpBalanceError = false;
      },
      skip() {
        return !this.$root.$data.email;
      },
      error(error) {
        // eslint-disable-next-line no-console
        console.error('[AppShellContainer] xpBalance query error:', error);
        this.xpBalanceError = true;
      },
    },
  },
};
</script>
