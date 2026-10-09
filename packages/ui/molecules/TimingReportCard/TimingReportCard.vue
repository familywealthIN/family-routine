<template>
  <!--
    On the clock: how the period's routine check-ins landed against their
    windows. The detailed version of the drawer's day ribbon:
      - the period's on-time rate and one bar split on time / late / missed;
      - a stacked bar per day (per routine on Day, per month on Year);
      - the weekday rhythm, coloured by each day's on-time rate;
      - every routine, the ones slipping first.
    Pure: props in, `open-routine` out.
  -->
  <section class="rn-ptime" data-testid="timing-report">
    <div class="rn-ptime__head">
      <i class="rn-mi rn-ptime__glyph">schedule</i>
      <div class="rn-ptime__title">On the clock</div>
      <div v-if="rate != null" class="rn-ptime__rate" data-testid="timing-report-rate">
        {{ rate }}%<span class="rn-ptime__rate-sub"> on time</span>
      </div>
    </div>

    <div v-if="error" class="rn-ptime__empty">We couldn't load your check-in times.</div>
    <div v-else-if="loading" class="rn-ptime__empty" role="status">Loading check-in times…</div>
    <div v-else-if="!landed && !totals.pending" class="rn-ptime__empty" data-testid="timing-report-empty">
      No check-ins in this {{ periodNoun }} yet.
    </div>

    <template v-else>
      <!-- The whole period as one split bar. -->
      <div class="rn-ptime__split" role="img" :aria-label="splitLabel">
        <span
          v-for="key in splitKeys"
          :key="key"
          class="rn-ptime__split-part"
          :style="{ flexGrow: totals[key], background: TIMING[key].color }"
        ></span>
      </div>
      <div class="rn-ptime__legend">
        <span v-for="key in legendKeys" :key="key" class="rn-ptime__key" :data-testid="`timing-report-${key}`">
          <i class="rn-ptime__dot" :style="{ background: TIMING[key].color }"></i>
          <b>{{ totals[key] }}</b> {{ TIMING[key].label }}
        </span>
      </div>

      <!-- Bars: stacked, shared scale. -->
      <div v-if="buckets.length > 1" class="rn-ptime__bars" data-testid="timing-report-bars">
        <div
          v-for="bucket in buckets"
          :key="bucket.key"
          class="rn-ptime__bar-col"
          :title="barTitle(bucket)"
        >
          <div class="rn-ptime__bar">
            <span
              v-for="key in barKeys"
              :key="key"
              class="rn-ptime__bar-part"
              :style="{ height: `${(bucket[key] / maxBucket) * 100}%`, background: TIMING[key].color }"
            ></span>
            <span v-if="bucket.skip" class="rn-ptime__bar-rest" title="Rest day">·</span>
          </div>
          <div class="rn-ptime__bar-label">{{ bucket.label }}</div>
        </div>
      </div>

      <!-- Weekday rhythm. -->
      <div v-if="showWeekdays" class="rn-ptime__section">
        <div class="rn-ptime__section-title">Your weekly rhythm</div>
        <div class="rn-ptime__week">
          <div
            v-for="day in weekdays"
            :key="day.index"
            class="rn-ptime__day"
            :style="dayStyle(day)"
            :data-testid="`timing-weekday-${day.label}`"
          >
            <div class="rn-ptime__day-label">{{ day.label }}</div>
            <div class="rn-ptime__day-rate">{{ day.rate == null ? '–' : `${day.rate}%` }}</div>
          </div>
        </div>
        <div v-if="rhythmLine" class="rn-ptime__hint" data-testid="timing-rhythm">{{ rhythmLine }}</div>
      </div>

      <!-- Routines, slipping first. -->
      <div v-if="routines.length" class="rn-ptime__section">
        <div class="rn-ptime__section-title">By routine</div>
        <a
          v-for="row in shownRoutines"
          :key="row.id || row.name"
          class="rn-ptime__row"
          href="#"
          data-testid="timing-routine-row"
          @click.prevent="$emit('open-routine', row.id)"
        >
          <div class="rn-ptime__row-name">
            {{ row.name }}<span v-if="row.time" class="rn-ptime__row-time"> · {{ row.time }}</span>
          </div>
          <div class="rn-ptime__row-bar">
            <span
              v-for="key in splitKeys"
              :key="key"
              :style="{ flexGrow: row[key] || 0, background: TIMING[key].color }"
            ></span>
          </div>
          <div class="rn-ptime__row-rate">{{ row.rate == null ? '–' : `${row.rate}%` }}</div>
        </a>
        <button
          v-if="routines.length > limit"
          type="button"
          class="rn-ptime__more"
          data-testid="timing-routine-more"
          @click="expanded = !expanded"
        >{{ expanded ? 'Show fewer' : `Show all ${routines.length}` }}</button>
      </div>
    </template>
  </section>
</template>

<script>
import { TIMING } from '../../constants/timing';

const SPLIT = ['onTime', 'late', 'missed'];

export default {
  name: 'MoleculeTimingReportCard',
  props: {
    /** { onTime, late, missed, pending } for the period. */
    totals: { type: Object, default: () => ({}) },
    /** On-time %, or null when nothing has landed. */
    rate: { type: Number, default: null },
    /** [{ key, label, title, onTime, late, missed, pending, skip }] */
    buckets: { type: Array, default: () => [] },
    /** Monday-first [{ index, label, rate, onTime, late, missed }] */
    weekdays: { type: Array, default: () => [] },
    /** [{ id, name, time, onTime, late, missed, pending, rate }], slipping first. */
    routines: { type: Array, default: () => [] },
    /** 'day' | 'week' | 'month' | 'year' — the weekday rhythm needs a week or more. */
    period: { type: String, default: 'week' },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
  },
  data() {
    return { TIMING, expanded: false, limit: 5 };
  },
  computed: {
    periodNoun() {
      return this.period;
    },
    landed() {
      return SPLIT.reduce((sum, key) => sum + (this.totals[key] || 0), 0);
    },
    splitKeys() {
      return SPLIT;
    },
    barKeys() {
      // Bottom-up in a column-reverse stack: on time sits on the baseline.
      return ['onTime', 'late', 'missed', 'pending'];
    },
    legendKeys() {
      return ['onTime', 'late', 'missed', 'pending'].filter((key) => (this.totals[key] || 0) > 0);
    },
    splitLabel() {
      return this.legendKeys.map((key) => `${this.totals[key]} ${TIMING[key].label}`).join(', ');
    },
    maxBucket() {
      const max = Math.max(0, ...this.buckets.map((b) => this.barKeys
        .reduce((sum, key) => sum + (b[key] || 0), 0)));
      return max || 1;
    },
    showWeekdays() {
      return this.period !== 'day' && this.weekdays.some((d) => d.rate != null);
    },
    /** "Strongest on Tue (92%), most slips on Sat (40%)" — only when they differ. */
    rhythmLine() {
      const rated = this.weekdays.filter((d) => d.rate != null);
      if (rated.length < 2) return '';
      const best = rated.reduce((a, b) => (b.rate > a.rate ? b : a));
      const worst = rated.reduce((a, b) => (b.rate < a.rate ? b : a));
      if (best.rate === worst.rate) return '';
      return `Strongest on ${best.label} (${best.rate}%), most slips on ${worst.label} (${worst.rate}%)`;
    },
    shownRoutines() {
      return this.expanded ? this.routines : this.routines.slice(0, this.limit);
    },
  },
  methods: {
    barTitle(bucket) {
      if (bucket.skip) return `${bucket.title} · rest day`;
      const parts = this.barKeys
        .filter((key) => bucket[key])
        .map((key) => `${bucket[key]} ${TIMING[key].label}`);
      return `${bucket.title}${parts.length ? ` · ${parts.join(', ')}` : ''}`;
    },
    /** A day's tile tinted green by its on-time rate; no data stays neutral. */
    dayStyle(day) {
      if (day.rate == null) return { background: 'rgba(0,0,0,.04)' };
      const alpha = 0.12 + (day.rate / 100) * 0.6;
      return { background: `rgba(76,175,80,${alpha.toFixed(2)})` };
    },
  },
};
</script>

<style>
.rn-ptime {
  padding: 14px 16px 12px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-ptime__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-ptime__glyph {
  font-size: 18px;
  color: #288bd5;
}

.rn-ptime__title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
}

.rn-ptime__rate {
  font-size: 18px;
  font-weight: 800;
  color: #2e7d32;
}

.rn-ptime__rate-sub {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, .5);
}

.rn-ptime__empty {
  padding: 14px 0 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, .5);
}

.rn-ptime__split {
  display: flex;
  gap: 2px;
  height: 12px;
  margin-top: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, .06);
}

.rn-ptime__split-part {
  flex-basis: 0;
  min-width: 0;
}

.rn-ptime__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
}

.rn-ptime__key {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.rn-ptime__key b {
  color: rgba(0, 0, 0, .87);
}

.rn-ptime__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rn-ptime__bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 96px;
  margin-top: 16px;
}

.rn-ptime__bar-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.rn-ptime__bar {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, .03);
}

.rn-ptime__bar-part {
  flex-shrink: 0;
}

.rn-ptime__bar-rest {
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: rgba(0, 0, 0, .35);
}

.rn-ptime__bar-label {
  margin-top: 4px;
  font-size: 10px;
  text-align: center;
  color: rgba(0, 0, 0, .45);
  white-space: nowrap;
  overflow: hidden;
}

.rn-ptime__section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, .06);
}

.rn-ptime__section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, .54);
}

.rn-ptime__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-top: 8px;
}

.rn-ptime__day {
  padding: 6px 0;
  border-radius: 8px;
  text-align: center;
}

.rn-ptime__day-label {
  font-size: 10px;
  color: rgba(0, 0, 0, .55);
}

.rn-ptime__day-rate {
  font-size: 12px;
  font-weight: 700;
}

.rn-ptime__hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
}

.rn-ptime__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 40px;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.rn-ptime__row-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-ptime__row-time {
  font-weight: 500;
  color: rgba(0, 0, 0, .45);
}

.rn-ptime__row-bar {
  display: flex;
  gap: 1px;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, .06);
}

.rn-ptime__row-bar span {
  flex-basis: 0;
}

.rn-ptime__row-rate {
  font-size: 13px;
  font-weight: 700;
  text-align: right;
}

.rn-ptime__more {
  margin-top: 6px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: #288bd5;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
