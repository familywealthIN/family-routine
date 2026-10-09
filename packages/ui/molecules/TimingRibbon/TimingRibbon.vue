<template>
  <!--
    Today on the clock: one segment per routine, in the order the day runs,
    coloured by how its check-in landed. The next one still to come pulses, so
    the ribbon reads as "where the day is" as much as "how it went". Under it,
    the rolling week's on-time rate and its change on the week before.
  -->
  <div class="rn-tr" data-testid="timing-ribbon">
    <div class="rn-tr__head">
      <span class="rn-tr__title">Today on the clock</span>
      <span v-if="!skip && slots.length" class="rn-tr__score" data-testid="timing-ribbon-score">
        {{ counts.onTime }}<span class="rn-tr__of">/{{ slots.length }}</span> on time
      </span>
    </div>

    <div v-if="skip" class="rn-tr__note" data-testid="timing-ribbon-rest">Rest day: nothing on the clock.</div>
    <template v-else-if="slots.length">
      <div class="rn-tr__ribbon" role="img" :aria-label="ariaLabel">
        <span
          v-for="(slot, index) in slots"
          :key="slot.id || index"
          class="rn-tr__seg"
          :class="[`rn-tr__seg--${slot.state}`, { 'rn-tr__seg--next': index === nextIndex }]"
          :style="segStyle(slot)"
          :title="`${slot.name} · ${slot.time} · ${label(slot.state)}`"
          :data-testid="`timing-seg-${index}`"
        ></span>
      </div>
      <div class="rn-tr__legend">
        <span
          v-for="key in legend"
          :key="key"
          class="rn-tr__key"
          :data-testid="`timing-key-${key}`"
        ><i class="rn-tr__dot" :style="{ background: TIMING[key].color }"></i>{{ counts[key] }} {{ TIMING[key].label }}</span>
      </div>
    </template>
    <div v-else class="rn-tr__note">No routines today yet.</div>

    <div v-if="rate != null" class="rn-tr__week" data-testid="timing-ribbon-week">
      This week <b>{{ rate }}%</b> on time
      <span
        v-if="delta"
        class="rn-tr__delta"
        :class="delta > 0 ? 'rn-tr__delta--up' : 'rn-tr__delta--down'"
        data-testid="timing-ribbon-delta"
      >{{ delta > 0 ? '▲' : '▼' }} {{ Math.abs(delta) }} vs last week</span>
      <span v-else-if="delta === 0" class="rn-tr__delta">same as last week</span>
    </div>
  </div>
</template>

<script>
import { TIMING, TIMING_ORDER } from '../../constants/timing';

export default {
  name: 'MoleculeTimingRibbon',
  props: {
    /** Today's check-ins in time order: [{ id, name, time, state }]. */
    slots: { type: Array, default: () => [] },
    /** { onTime, late, missed, pending } for today. */
    counts: { type: Object, default: () => ({}) },
    /** Index of the next check-in still to come, or -1. */
    nextIndex: { type: Number, default: -1 },
    skip: { type: Boolean, default: false },
    /** The rolling week's on-time %, or null when nothing has landed. */
    rate: { type: Number, default: null },
    /** Points against the week before, or null when either is unknown. */
    delta: { type: Number, default: null },
  },
  data() {
    return { TIMING };
  },
  computed: {
    /** Only the states that happened today, so the line stays short. */
    legend() {
      return TIMING_ORDER.filter((key) => (this.counts[key] || 0) > 0);
    },
    ariaLabel() {
      return this.legend.map((key) => `${this.counts[key]} ${TIMING[key].label}`).join(', ');
    },
  },
  methods: {
    label(state) {
      return (TIMING[state] || TIMING.pending).label;
    },
    segStyle(slot) {
      return { background: (TIMING[slot.state] || TIMING.pending).color };
    },
  },
};
</script>

<style>
.rn-tr {
  margin: 0 12px 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f7f7f7;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-tr__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.rn-tr__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, .54);
}

.rn-tr__score {
  font-size: 13px;
  font-weight: 700;
  color: rgba(0, 0, 0, .87);
}

.rn-tr__of {
  font-weight: 500;
  color: rgba(0, 0, 0, .45);
}

.rn-tr__ribbon {
  display: flex;
  gap: 3px;
  height: 10px;
  margin-top: 10px;
}

.rn-tr__seg {
  flex: 1;
  min-width: 4px;
  border-radius: 5px;
}

.rn-tr__seg--next {
  animation: rn-tr-pulse 1.6s ease-in-out infinite;
  box-shadow: 0 0 0 2px #288bd5 inset;
}

@keyframes rn-tr-pulse {
  50% { opacity: .45; }
}

@media (prefers-reduced-motion: reduce) {
  .rn-tr__seg--next { animation: none; }
}

.rn-tr__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(0, 0, 0, .6);
}

.rn-tr__key {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.rn-tr__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rn-tr__note {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-tr__week {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 12px;
  color: rgba(0, 0, 0, .7);
}

.rn-tr__delta {
  margin-left: 4px;
  color: rgba(0, 0, 0, .45);
}

.rn-tr__delta--up { color: #2e7d32; }
.rn-tr__delta--down { color: #c62828; }
</style>
