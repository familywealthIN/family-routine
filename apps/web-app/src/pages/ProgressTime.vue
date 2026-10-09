<template>
  <AppShellContainer
    active="progress"
    title="Progress"
    :subtitle="rangeLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <!--
      Tablet and desktop put the Day · Week · Month · Year switch in the header
      beside the title, at a fixed 340px (Progress.dc.html § GT/GD). That row is
      the shell's, so it is filled through the shell's slot; on the phone the
      switch is the first card in the body and ProgressReport draws it there.
    -->
    <template v-if="shell !== 'phone'" v-slot:header-actions>
      <SlidingSwitch
        class="progress-page__switch"
        :segments="periods"
        :value="safePeriod"
        @change="goPeriod"
      />
    </template>

    <ProgressReportContainer
      :period="period"
      :shell="shell"
      :route-for="routineHref"
      @change-period="goPeriod"
      @open-routine="openRoutine"
      @open-history="goTo(HISTORY_ROUTE)"
    >
      <!--
        On the clock: on time / late / missed for the period on screen. The
        report says `wide` when it gives the card a full-width row (tablet and
        desktop); the phone stacks it in its single column.
      -->
      <template v-slot:timing="{ wide }">
        <RoutineTimingContainer
          v-slot="{ timing, loading, error }"
          :start-date="periodRange.startDate"
          :end-date="periodRange.endDate"
          :today="today"
        >
          <TimingReportCard
            v-bind="timingCard(timing)"
            :period="safePeriod"
            :loading="loading"
            :error="error"
            :wide="!!wide"
            @open-routine="openRoutine"
          />
        </RoutineTimingContainer>
      </template>
    </ProgressReportContainer>
  </AppShellContainer>
</template>

<script>
/**
 * /progress and /progress/:period, rebuilt to packages/design/Progress.dc.html.
 *
 * The page composes two containers and owns nothing else: the route (which
 * period is showing), the shell breakpoint, and where a row navigates to.
 *
 * Why the attention rows deep-link here and not in the organism: the mock sends
 * every "Needs attention" row to the generic Routines page, but the routine's id
 * is already in the card's data (docs/redesign/chassis.md § "Things the mocks
 * get wrong on purpose"). `/agenda/tree/:selectedTaskRef` is the route that
 * exists today for opening ONE routine item - it lands on that routine with its
 * goals and timeline. The redesigned Routines editor has no per-routine route
 * yet; when it gets one, `routineHref` is the single line to change.
 */
import moment from 'moment';
import SlidingSwitch from '@routine-notes/ui/molecules/SlidingSwitch/SlidingSwitch.vue';
import TimingReportCard from '@routine-notes/ui/molecules/TimingReportCard/TimingReportCard.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import { PROGRESS_PERIODS } from '@routine-notes/ui/constants/progress';
import AppShellContainer from '../containers/AppShellContainer.vue';
import ProgressReportContainer from '../containers/ProgressReportContainer.vue';
import RoutineTimingContainer from '../containers/RoutineTimingContainer.vue';
import {
  onTimeRate, timingBuckets, weekdayPattern, routineRows,
} from '../utils/routineTiming';
import { signOut } from '../utils/signOut';
import {
  DATE_FORMAT, normalisePeriod, periodWindow, rangeLabel,
} from '../utils/progressReport';

/** Where a routine row opens. One place, so one line changes when /settings grows one. */
export const ROUTINE_ROUTE = '/agenda/tree';
export const HISTORY_ROUTE = '/history';
export const LOGOUT_KEY = 'logout';

export default {
  name: 'ProgressTime',

  components: {
    AppShellContainer, ProgressReportContainer, RoutineTimingContainer, SlidingSwitch, TimingReportCard,
  },

  props: {
    /** From the route: `/progress/:period`, defaulted to week by views/Progress.vue. */
    period: { type: String, default: 'week' },
  },

  data() {
    return {
      periods: PROGRESS_PERIODS,
      HISTORY_ROUTE,
      today: moment().format(DATE_FORMAT),
    };
  },

  computed: {
    /** The one breakpoint rule — `constants/navigation.resolveShell`. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    safePeriod() {
      return normalisePeriod(this.period);
    },
    /** The period on screen, so the Timing card reads the same window as the report. */
    periodRange() {
      return periodWindow(this.safePeriod, this.today);
    },
    /** The shell's subtitle: "Week of 6 – 12 September". */
    rangeLabel() {
      const { startDate, endDate } = periodWindow(this.safePeriod, this.today);
      return rangeLabel(this.safePeriod, startDate, endDate);
    },
  },

  methods: {
    /** The Timing card's props from one `routineTiming` read. */
    timingCard(timing) {
      if (!timing) return {};
      return {
        totals: timing,
        rate: onTimeRate(timing),
        buckets: timingBuckets(this.safePeriod, timing.days),
        weekdays: weekdayPattern(timing.days),
        routines: routineRows(timing.routines),
      };
    },
    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    goPeriod(key) {
      this.goTo(`/progress/${normalisePeriod(key)}`);
    },
    /** The href the attention anchor carries, so a middle-click still works. */
    routineHref(row) {
      if (!row || !row.id) return '';
      return `${ROUTINE_ROUTE}/${row.id}`;
    },
    openRoutine(id) {
      const route = this.routineHref({ id });
      if (route) this.goTo(route);
    },
    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      this.goTo(item && item.route);
    },
    onSignOut() {
      // The same path the legacy drawer takes — see utils/signOut.js.
      signOut(this);
    },
  },
};
</script>

<style>
/* Root-class prefixed: this page renders its own shell, so nothing here may
   leak into the legacy toolbar layouts (see MEMORY: web-app CSS lives inline in
   organisms). */
.progress-page__switch {
  width: 340px;
  flex-shrink: 0;
}
</style>
