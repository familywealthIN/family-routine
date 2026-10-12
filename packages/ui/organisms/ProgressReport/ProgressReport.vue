<template>
  <!--
    The Progress screen body (packages/design/Progress.dc.html).

    Pure: props in, events out. Everything on this page comes from ONE report
    (`getProgress` / `getProgressReport`), so it is one organism with one
    container - see apps/web-app/src/containers/ARCHITECTURE.md § 2.

    Layout is the only thing that forks per shell, and the two branches share
    every card through `v-bind` prop objects rather than a second copy of the
    markup. The phone stacks switch, hero, balance, completed, great going,
    needs attention, history - the design's order. Tablet and desktop use the
    2-column `minmax(0,3fr) minmax(0,2fr)` grid, where the two columns scroll as
    independent flex stacks (a single CSS grid would force the rows of the left
    and right stacks to line up, which the design does not do). The `timing`
    slot (On the clock) is a full-width row under both stacks, and its slot
    props say `wide` there.

    The Day/Week/Month/Year switch lives in the AppShell HEADER on tablet and
    desktop (a fixed 340px next to the title), so the page renders it into the
    shell's `header-actions` slot there and this organism draws it only on the
    phone, where it is the first thing in the body.

    "Goals on Track" is deliberately absent: the report still returns the
    `on-track` card as a literal "?", and the design says it stays out until it
    is real.
  -->
  <div class="rn-prog" :class="`rn-prog--${shell}`" data-testid="progress-report">
    <template v-if="shell === 'phone'">
      <SlidingSwitch
        class="rn-prog__switch"
        :segments="periods"
        :value="period"
        @change="$emit('change-period', $event)"
      />

      <section
        v-if="pending"
        class="rn-pcard rn-prog__status"
        :data-testid="loadError ? 'progress-error' : 'progress-loading'"
        :role="loadError ? null : 'status'"
      >
        <load-error-state
          v-if="loadError"
          message="We couldn't load your progress."
          :retrying="retrying"
          @retry="$emit('retry')"
        />
        <template v-else>
          <span class="rn-prog__spinner" aria-hidden="true"></span>
          <span class="rn-prog__status-text">Loading your {{ period }}…</span>
        </template>
      </section>

      <template v-else>
        <ProgressHeroCard
          :key="`hero-${period}`"
          class="rn-pcard rn-prog__enter"
          v-bind="heroProps"
          @select-point="$emit('select-point', $event)"
        />

        <section v-if="balance" class="rn-pcard rn-prog__balance" data-testid="progress-balance">
          <DkgRingTrio :values="balance" :heading="balanceHeading" />
        </section>

        <ProgressBarGroup class="rn-pcard" v-bind="barProps" />

        <!-- On time vs late: the page's own read (`routineTiming`), not the report's. -->
        <div v-if="$scopedSlots.timing || $slots.timing" class="rn-pcard">
          <slot name="timing"></slot>
        </div>

        <RoutineRankCard class="rn-pcard" v-bind="goodProps" />

        <RoutineRankCard
          class="rn-pcard"
          v-bind="badProps"
          @open-routine="onOpenRoutine"
        />
      </template>

      <a
        class="rn-pcard rn-prog__history"
        :href="historyRoute"
        data-testid="progress-history-link"
        @click="onHistory"
      >
        <i class="rn-mi rn-prog__history-glyph">history</i>
        <span class="rn-prog__history-label">View your routine history</span>
        <i class="rn-mi rn-prog__history-chevron">chevron_right</i>
      </a>
    </template>

    <template v-else-if="pending">
      <section
        class="rn-pcard rn-prog__status"
        :data-testid="loadError ? 'progress-error' : 'progress-loading'"
        :role="loadError ? null : 'status'"
      >
        <load-error-state
          v-if="loadError"
          message="We couldn't load your progress."
          :retrying="retrying"
          @retry="$emit('retry')"
        />
        <template v-else>
          <span class="rn-prog__spinner" aria-hidden="true"></span>
          <span class="rn-prog__status-text">Loading your {{ period }}…</span>
        </template>
      </section>
      <a
        class="rn-pcard rn-prog__history"
        :href="historyRoute"
        data-testid="progress-history-link"
        @click="onHistory"
      >
        <i class="rn-mi rn-prog__history-glyph">history</i>
        <span class="rn-prog__history-label">View your routine history</span>
        <i class="rn-mi rn-prog__history-chevron">chevron_right</i>
      </a>
    </template>

    <div v-else class="rn-prog__grid">
      <div class="rn-prog__col">
        <ProgressHeroCard
          :key="`hero-${period}`"
          class="rn-pcard rn-prog__enter"
          v-bind="heroProps"
          @select-point="$emit('select-point', $event)"
        />
        <div class="rn-prog__pair">
          <RoutineRankCard class="rn-pcard" v-bind="goodProps" />
          <RoutineRankCard
            class="rn-pcard"
            v-bind="badProps"
            @open-routine="onOpenRoutine"
          />
        </div>
      </div>

      <div class="rn-prog__col">
        <section v-if="balance" class="rn-pcard rn-prog__balance" data-testid="progress-balance">
          <DkgRingTrio :values="balance" :heading="balanceHeading" />
        </section>
        <ProgressBarGroup class="rn-pcard" v-bind="barProps" />
        <a
          class="rn-pcard rn-prog__history"
          :href="historyRoute"
          data-testid="progress-history-link"
          @click="onHistory"
        >
          <i class="rn-mi rn-prog__history-glyph">history</i>
          <span class="rn-prog__history-label">View your routine history</span>
          <i class="rn-mi rn-prog__history-chevron">chevron_right</i>
        </a>
      </div>

      <!--
        On the clock spans both columns: in the 2fr column its bars, weekday
        tiles and routine rows were squeezed, and it made that column twice the
        height of the other. Full width, it lays its routine list on the same
        3fr / 2fr gutter as the cards above (`wide`).
      -->
      <div v-if="$scopedSlots.timing || $slots.timing" class="rn-pcard rn-prog__wide">
        <slot name="timing" :wide="true"></slot>
      </div>
    </div>
  </div>
</template>

<script>
import SlidingSwitch from '../../molecules/SlidingSwitch/SlidingSwitch.vue';
import DkgRingTrio from '../../molecules/DkgRingTrio/DkgRingTrio.vue';
import ProgressHeroCard from '../../molecules/ProgressHeroCard/ProgressHeroCard.vue';
import ProgressBarGroup from '../../molecules/ProgressBarGroup/ProgressBarGroup.vue';
import RoutineRankCard from '../../molecules/RoutineRankCard/RoutineRankCard.vue';
import LoadErrorState from '../../molecules/LoadErrorState/LoadErrorState.vue';
import { PROGRESS_PERIODS } from '../../constants/progress';

export default {
  name: 'OrganismProgressReport',
  components: {
    SlidingSwitch,
    DkgRingTrio,
    ProgressHeroCard,
    ProgressBarGroup,
    RoutineRankCard,
    LoadErrorState,
  },
  props: {
    shell: { type: String, default: 'phone' },
    period: { type: String, default: 'week' },
    periods: { type: Array, default: () => PROGRESS_PERIODS },

    // --- read state -------------------------------------------------------
    /**
     * No report for THIS period yet. The cards are withheld rather than drawn
     * with dashes and "No routines scored", which read as a genuinely empty
     * period - and never filled with another period's figures.
     */
    loading: { type: Boolean, default: false },
    /** D-10: the read failed and there is no report to show. Offers a retry. */
    loadError: { type: Boolean, default: false },
    retrying: { type: Boolean, default: false },

    // --- hero -------------------------------------------------------------
    statement: { type: String, default: '' },
    efficiency: { type: Number, default: null },
    /** The server's formula wording, verbatim (efficiency card description). */
    formula: { type: String, default: '' },
    previousEfficiency: { type: Number, default: null },
    previousLabel: { type: String, default: '' },
    series: { type: Array, default: () => [] },
    seriesLabels: { type: Array, default: () => [] },
    pointNames: { type: Array, default: () => [] },
    selectedIndex: { type: Number, default: null },
    trendNote: { type: String, default: '' },

    // --- balance ----------------------------------------------------------
    /**
     * `{ D, K, G }`, or null when the report carries no stimulus card. The trio
     * has no unknown state, so the card is withheld rather than drawn as three
     * empty rings - which would read as "you earned nothing".
     */
    balance: { type: Object, default: null },
    balanceHeading: { type: String, default: '' },

    // --- completed --------------------------------------------------------
    completedHeading: { type: String, default: '' },
    completed: { type: Array, default: () => [] },

    // --- rankings ---------------------------------------------------------
    good: { type: Array, default: () => [] },
    bad: { type: Array, default: () => [] },
    rankEmptyText: { type: String, default: '' },
    /** `(row) => href`, so the attention anchor is a real link. */
    routeFor: { type: Function, default: null },
    historyRoute: { type: String, default: '/history' },
  },
  computed: {
    /** Either read state replaces the data cards; an error outranks loading. */
    pending() {
      return this.loading || this.loadError;
    },
    heroProps() {
      return {
        statement: this.statement,
        efficiency: this.efficiency,
        formula: this.formula,
        previous: this.previousEfficiency,
        previousLabel: this.previousLabel,
        series: this.series,
        seriesLabels: this.seriesLabels,
        pointNames: this.pointNames,
        selectedIndex: this.selectedIndex,
        trendNote: this.trendNote,
      };
    },
    barProps() {
      return { heading: this.completedHeading, rows: this.completed };
    },
    goodProps() {
      return {
        title: 'Great going',
        variant: 'good',
        rows: this.good,
        emptyText: this.rankEmptyText,
      };
    },
    badProps() {
      return {
        title: 'Needs attention',
        variant: 'attention',
        rows: this.bad,
        emptyText: this.rankEmptyText,
        routeFor: this.routeFor,
      };
    },
  },
  methods: {
    onOpenRoutine(id, row) {
      this.$emit('open-routine', id, row);
    },
    onHistory(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      this.$emit('open-history');
    },
  },
};
</script>

<style>
.rn-prog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-content: start;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* The card chrome every block on this page shares. Declared by the organism so
   the molecules inside it do not each ship a copy of the shadow. */
.rn-pcard {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}

.rn-prog--tablet .rn-pcard,
.rn-prog--desktop .rn-pcard {
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-prog__switch {
  flex-shrink: 0;
}

/* The mock restarts a CSS animation by alternating rn-in0 / rn-in1; in Vue the
   hero carries `:key="period"`, so a period change remounts it and the
   animation runs again (docs/redesign/chassis.md § Motion). */
@keyframes rn-prog-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.rn-prog__enter {
  animation: rn-prog-in .3s ease;
}

.rn-prog__balance {
  padding: 14px 16px;
  display: flex;
  align-items: center;
}

.rn-prog__history {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 12px 0 16px;
  color: inherit;
  text-decoration: none;
}

.rn-prog__history-glyph {
  font-size: 20px;
  color: #288bd5;
}

.rn-prog__history-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
}

.rn-prog__history-chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
}

.rn-prog__status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  padding: 16px;
  color: rgba(0, 0, 0, .6);
  font-size: 14px;
}

@keyframes rn-prog-spin {
  to { transform: rotate(360deg); }
}

.rn-prog__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(40, 139, 213, .25);
  border-top-color: #288bd5;
  border-radius: 50%;
  animation: rn-prog-spin .8s linear infinite;
}

/* ---------------- tablet / desktop ---------------- */

.rn-prog__grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 12px;
  align-content: start;
}

.rn-prog__col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rn-prog__wide {
  grid-column: 1 / -1;
  min-width: 0;
}

.rn-prog__pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}
</style>
