<template>
  <!--
    The Routines screen's body: a 24-hour day dial and the timeline it shares its
    data with (packages/design/Routines.dc.html).

    They are ONE organism because they are one derivation rendered twice — both
    read `sortByTime(items)`, which is why saving re-sorts the list and redraws
    the dial in the same gesture. Splitting them would mean two components
    deriving the same schedule and a selection having to be kept in step across
    the gap between them.

    Purely presentational: props in, events out. No Apollo, no router, no store.
    The per-row edit and delete icons the old settings table carried are gone on
    purpose — a row opens the editor, and delete lives inside it.
  -->
  <div class="rn-day" :class="`rn-day--${shellName}`" data-testid="routine-day-plan">
    <!-- ===================== THE DIAL ===================== -->
    <div class="rn-day__dial-col">
      <div class="rn-day__card rn-day__dial-card">
        <div class="rn-day__dial" :style="{ width: `${dial.size}px`, height: `${dial.size}px` }">
          <svg
            :viewBox="`0 0 ${DIAL.viewBox} ${DIAL.viewBox}`"
            :style="{ width: `${dial.size}px`, height: `${dial.size}px` }"
            data-testid="day-dial-svg"
          >
            <circle
              :cx="DIAL.centre"
              :cy="DIAL.centre"
              :r="DIAL.radius"
              fill="none"
              :stroke="DIAL.trackColor"
              :stroke-width="DIAL.trackWidth"
            ></circle>

            <path
              v-for="arc in arcs"
              :key="arc.id"
              class="rn-day__arc"
              data-testid="day-dial-arc"
              :data-arc="arc.id"
              :d="arc.d"
              fill="none"
              :stroke="arc.color"
              :stroke-width="arc.width"
              stroke-linecap="butt"
              :opacity="arc.opacity"
              @click="$emit('select', arc.id)"
            ></path>

            <!-- Hardcoded hour labels. The mock's `ticks` getter at r=112 is dead
                 scaffolding and is not ported (chassis.md). -->
            <text
              v-for="tick in DIAL_TICKS"
              :key="`t${tick.label}`"
              class="rn-day__tick"
              :x="tick.x"
              :y="tick.y"
              text-anchor="middle"
              dominant-baseline="middle"
            >{{ tick.label }}</text>

            <line
              :x1="nowMarker.x1"
              :y1="nowMarker.y1"
              :x2="nowMarker.x2"
              :y2="nowMarker.y2"
              :stroke="DIAL.colorNow"
              :stroke-width="DIAL.nowWidth"
              stroke-linecap="round"
              data-testid="day-dial-now"
            ></line>
            <circle
              :cx="nowMarker.x2"
              :cy="nowMarker.y2"
              :r="DIAL.nowDotRadius"
              :fill="DIAL.colorNow"
            ></circle>
          </svg>

          <!-- The centre swaps between the day total and the selection. The mock
               alternates two identical keyframes to replay the fade; Vue bumps a
               :key instead (chassis.md § Motion). -->
          <div
            :key="centreKey"
            class="rn-day__centre"
            :style="centreInset"
            data-testid="day-dial-centre"
          >
            <div class="rn-day__centre-over" :style="{ color: centre.overColor }">{{ centre.over }}</div>
            <div class="rn-day__centre-title">{{ centre.title }}</div>
            <div class="rn-day__centre-sub">{{ centre.sub }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== THE TIMELINE ===================== -->
    <div class="rn-day__list-col">
      <div class="rn-day__card rn-day__list rn-hidescroll">
        <!-- Before the first result the list is unknown, not empty — "No
             routines yet" there was a lie that flashed on every cold load. -->
        <div v-if="loading && !rows.length" class="rn-day__empty" data-testid="day-loading">
          <div class="rn-day__empty-sub">Loading your routines…</div>
        </div>
        <div v-else-if="!rows.length" class="rn-day__empty" data-testid="day-empty">
          <div class="rn-day__empty-title">No routines yet</div>
          <div class="rn-day__empty-sub">Add the first one and the dial fills in around it.</div>
        </div>

        <div v-for="row in rows" :key="row.id">
          <div
            class="rn-day__row"
            :class="{ 'rn-day__row--selected': row.selected, 'rn-day__row--flash': row.flash }"
            data-testid="day-row"
            :data-row="row.id"
            @click="$emit('open', row.id)"
          >
            <div class="rn-day__row-time" :style="{ color: row.isNow ? '#e68900' : 'rgba(0,0,0,.6)' }">
              {{ row.time }}
            </div>

            <div class="rn-day__rail">
              <div class="rn-day__rail-top" :style="{ background: row.isFirst ? 'transparent' : 'rgba(0,0,0,.12)' }"></div>
              <div
                class="rn-day__dot"
                :style="{
                  background: row.isNow ? '#e68900' : '#288bd5',
                  boxShadow: `0 0 0 3px ${row.isNow ? 'rgba(255,152,0,.35)' : 'transparent'}`,
                }"
              ></div>
              <div class="rn-day__rail-line" :style="{ background: row.isLast ? 'transparent' : 'rgba(0,0,0,.12)' }"></div>
            </div>

            <div class="rn-day__row-body">
              <div class="rn-day__row-head">
                <div class="rn-day__row-name">{{ row.name }}</div>
                <div
                  class="rn-day__pts"
                  :style="{
                    background: row.isNow ? 'rgba(255,152,0,.12)' : 'rgba(40,139,213,.1)',
                    color: row.isNow ? '#e68900' : '#288bd5',
                  }"
                >{{ pointsLabel(row.points) }}</div>
              </div>

              <div class="rn-day__row-when">
                {{ row.time }} – {{ row.end }} · {{ row.duration }}<template v-if="row.isNow">
                  · <b class="rn-day__now-word">now</b></template>
              </div>

              <div class="rn-day__chips">
                <div class="rn-day__chip" data-testid="day-chip-steps">
                  <i class="rn-mi rn-day__chip-glyph">format_list_numbered</i>{{ row.stepsLabel }}
                </div>
                <div
                  v-if="agentName(row.id)"
                  class="rn-day__chip rn-day__chip--agent"
                  data-testid="day-chip-agent"
                >
                  <i class="rn-mi rn-day__chip-glyph">smart_toy</i>{{ agentName(row.id) }}
                </div>
                <div
                  v-if="goalLabel(row.id)"
                  class="rn-day__chip rn-day__chip--goal"
                  data-testid="day-chip-goal"
                >
                  <i class="rn-mi rn-day__chip-glyph">flag</i>
                  <span class="rn-day__chip-text">{{ goalLabel(row.id) }}</span>
                </div>
              </div>
            </div>

            <i class="rn-mi rn-day__chevron">chevron_right</i>
          </div>

          <!-- An empty stretch of 3 hours or more is the one place a new routine
               is worth offering unprompted. -->
          <div
            v-if="row.hasGap"
            class="rn-day__gap"
            data-testid="day-gap"
            :data-gap="row.id"
            @click="$emit('insert', row.gapAtMinutes)"
          >
            <div class="rn-day__row-time"></div>
            <div class="rn-day__gap-rail"><div class="rn-day__gap-dash"></div></div>
            <i class="rn-mi rn-day__gap-glyph">add_circle_outline</i>
            <div class="rn-day__gap-label">Add routine at {{ row.gapAt }}</div>
            <div class="rn-day__gap-span">· {{ row.gapLabel }} block</div>
          </div>
        </div>

        <div class="rn-day__new" data-testid="day-new" @click="$emit('new')">
          <i class="rn-mi rn-day__new-glyph">add_circle_outline</i>New routine
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { SHELLS, resolveShell } from '../../constants/navigation';
import {
  DIAL,
  DIAL_TICKS,
  MINUTES_PER_DAY,
  buildArcs,
  buildNowMarker,
  buildRows,
  centreContent,
  dialSize,
  pointsLabel,
  sortByTime,
} from '../../utils/dayDial';

/** How often the NOW marker catches up with the clock. */
const CLOCK_TICK_MS = 60000;

const clockMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export default {
  name: 'OrganismRoutineDayPlan',

  props: {
    /** Routine templates: `{ id, name, time, points, steps, tags }`. Any order. */
    items: { type: Array, default: () => [] },
    /**
     * True until the list has arrived once. An empty `items` then means
     * "unknown", so the empty state is held back.
     */
    loading: { type: Boolean, default: false },
    /** phone | tablet | desktop. Empty resolves from the one breakpoint rule. */
    shell: { type: String, default: '' },
    /**
     * Minutes since midnight for the NOW marker. `null` follows the local clock,
     * which is what the real screen wants; a test passes a number so the orange
     * arc does not depend on when the suite runs.
     */
    nowMinutes: { type: Number, default: null },
    selectedId: { type: String, default: '' },
    /** The just-saved routine, which tints once (`rn-flash`). */
    flashId: { type: String, default: '' },
    /** routine id -> agent name, for the blue agent chip. */
    agents: { type: Object, default: () => ({}) },
    /** routine id -> `{ body, pct }` for the linked year goal chip. */
    goals: { type: Object, default: () => ({}) },
  },

  data() {
    return { clock: clockMinutes(), timer: null };
  },

  computed: {
    DIAL() { return DIAL; },
    DIAL_TICKS() { return DIAL_TICKS; },

    shellName() {
      if (SHELLS.indexOf(this.shell) !== -1) return this.shell;
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },

    dial() {
      return dialSize(this.shellName);
    },

    /**
     * Written out rather than as the `inset` shorthand — the shorthand needs
     * Chrome 87 / Safari 14.1, and this ships inside a WebView (the chassis'
     * ResponsiveSheet spells its offsets out for the same reason).
     */
    centreInset() {
      const offset = `${this.dial.inset}px`;
      return {
        top: offset, right: offset, bottom: offset, left: offset,
      };
    },

    /** The one derivation both halves read. */
    sorted() {
      return sortByTime(this.items);
    },

    now() {
      if (this.nowMinutes == null) return this.clock;
      const n = Number(this.nowMinutes);
      return Number.isFinite(n) ? ((n % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY : 0;
    },

    arcs() {
      return buildArcs(this.sorted, { now: this.now, selectedId: this.selectedId });
    },

    rows() {
      return buildRows(this.sorted, {
        now: this.now,
        selectedId: this.selectedId,
        flashId: this.flashId,
      });
    },

    nowMarker() {
      return buildNowMarker(this.now);
    },

    centre() {
      if (this.loading && !this.sorted.length) {
        return {
          over: 'TODAY', overColor: 'rgba(0,0,0,.45)', title: '…', sub: 'Loading',
        };
      }
      return centreContent(this.sorted, { now: this.now, selectedId: this.selectedId });
    },

    /** Re-creating the node is how the fade replays — see the template comment. */
    centreKey() {
      return this.selectedId || 'today';
    },
  },

  mounted() {
    // Only when the marker actually follows the clock: a fixed `nowMinutes` has
    // nothing to catch up with, and a test should not leave a timer behind.
    if (this.nowMinutes == null) {
      this.timer = setInterval(() => { this.clock = clockMinutes(); }, CLOCK_TICK_MS);
    }
  },

  beforeDestroy() {
    if (this.timer) clearInterval(this.timer);
  },

  methods: {
    pointsLabel,
    agentName(id) {
      return (this.agents && this.agents[id]) || '';
    },
    goalLabel(id) {
      const goal = this.goals && this.goals[id];
      return (goal && goal.body) || '';
    },
  },
};
</script>

<style>
/* Every selector is prefixed with the organism's root class — the app has one
   global stylesheet and a bare `.row` here would reach into Vuetify's grid. */
.rn-day {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-day__card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}

.rn-day__dial-card {
  padding: 16px 12px 12px;
  display: flex;
  justify-content: center;
}

.rn-day__dial {
  position: relative;
  flex-shrink: 0;
}

.rn-day__arc {
  cursor: pointer;
  transition: opacity .2s, stroke-width .2s;
}

.rn-day__tick {
  font-size: 10px;
  font-weight: 600;
  fill: rgba(0, 0, 0, .4);
}

.rn-day__centre {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  animation: rn-fade .25s ease;
  pointer-events: none;
}

.rn-day__centre-over {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
}

.rn-day__centre-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 2px;
}

.rn-day__centre-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin-top: 3px;
}

/* --- the timeline ------------------------------------------------------- */

.rn-day__list {
  padding: 6px 12px 6px 8px;
  min-width: 0;
}

.rn-day__empty {
  padding: 22px 10px 18px;
  text-align: center;
}

.rn-day__empty-title {
  font-size: 15px;
  font-weight: 600;
}

.rn-day__empty-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin-top: 4px;
}

.rn-day__row {
  display: flex;
  gap: 10px;
  cursor: pointer;
  border-radius: 12px;
  padding: 0 4px;
  background: transparent;
}

.rn-day__row--selected {
  background: rgba(40, 139, 213, .06);
}

.rn-day__row--flash {
  animation: rn-flash .9s ease;
}

.rn-day__row-time {
  width: 40px;
  flex-shrink: 0;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding-top: 14px;
}

.rn-day__rail {
  width: 14px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rn-day__rail-top {
  width: 2px;
  height: 15px;
}

.rn-day__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rn-day__rail-line {
  flex: 1;
  width: 2px;
  min-height: 14px;
}

.rn-day__row-body {
  flex: 1;
  min-width: 0;
  padding: 12px 0;
}

.rn-day__row-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-day__row-name {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-day__pts {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.rn-day__row-when {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin-top: 3px;
}

.rn-day__now-word {
  color: #e68900;
}

.rn-day__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.rn-day__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
  background: #f4f4f4;
  font-size: 11px;
  color: rgba(0, 0, 0, .65);
  max-width: 100%;
}

.rn-day__chip--agent {
  background: rgba(25, 118, 210, .08);
  color: #1976d2;
}

.rn-day__chip--goal {
  max-width: 190px;
}

.rn-day__chip-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-day__chip-glyph {
  font-size: 14px;
}

.rn-day__chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
  align-self: center;
  flex-shrink: 0;
}

/* --- the inline gap row ------------------------------------------------- */

.rn-day__gap {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 4px;
  cursor: pointer;
  color: #288bd5;
}

.rn-day__gap .rn-day__row-time {
  padding-top: 0;
}

.rn-day__gap-rail {
  width: 14px;
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  justify-content: center;
}

.rn-day__gap-dash {
  width: 2px;
  background-image: linear-gradient(rgba(0, 0, 0, .22) 50%, transparent 0);
  background-size: 2px 6px;
}

.rn-day__gap-glyph {
  font-size: 18px;
}

.rn-day__gap-label {
  font-size: 12px;
  font-weight: 600;
}

.rn-day__gap-span {
  font-size: 11px;
  color: rgba(0, 0, 0, .4);
}

.rn-day__new {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  margin-top: 4px;
  padding-left: 14px;
  color: #288bd5;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.rn-day__new-glyph {
  font-size: 26px;
}

/* --- tablet + desktop: the dial and the list side by side --------------- */

.rn-day--tablet,
.rn-day--desktop {
  flex-direction: row;
  gap: 14px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.rn-day--tablet .rn-day__card,
.rn-day--desktop .rn-day__card {
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-day--tablet .rn-day__dial-col,
.rn-day--desktop .rn-day__dial-col {
  width: 380px;
  flex-shrink: 0;
}

/* 440 beside a 360 dial, against tablet's 380 beside a 300 — the design's own
   two splits, not one scaled guess. */
.rn-day--desktop {
  gap: 20px;
}

.rn-day--desktop .rn-day__dial-col {
  width: 440px;
}

.rn-day--tablet .rn-day__dial-card,
.rn-day--desktop .rn-day__dial-card {
  padding: 20px 16px 16px;
}

.rn-day--tablet .rn-day__list-col,
.rn-day--desktop .rn-day__list-col {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}

.rn-day--tablet .rn-day__list,
.rn-day--desktop .rn-day__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 14px 6px 10px;
}
</style>
