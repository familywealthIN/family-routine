<template>
  <!--
    The D/K/G trio: three concentric rings at r 56 / 42 / 28 in a 128-unit box,
    stroke-width 10 (docs/redesign/chassis.md § Rings).

    Why a third component and not an extension of an existing one — both
    candidates were checked first:
      · `organisms/StimulusSummary` stacks three SEPARATE 50px v-progress-circular
        cards. Not concentric, Vuetify-driven, no legend. Nothing to extend.
      · `organisms/WeekdaySelector` does draw concentric D/K/G, but at r 18/20/22
        in a 48-unit box with stroke 2, seven times across a weekday strip, and
        it owns moment() date derivation. It is a different ring at a different
        scale inside a non-pure component.
    So the shared part is the ring MATHS, which this composes from
    `ProgressRing` — the trio adds no second circumference formula.

    Colours and copy come from `constants/routineFocus.js` STIMULI, the one
    token set the week selector and the drawer already read.

    Values legitimately exceed 100% early in a period (one gym session on day 1
    of a 7-day week). ProgressRing clamps the arc so it cannot wrap past 12
    o-clock, while the legend prints the real number.
  -->
  <div class="rn-dkg" data-testid="dkg-ring-trio">
    <div class="rn-dkg__rings" :style="{ width: `${size}px`, height: `${size}px` }">
      <ProgressRing
        v-for="ring in rings"
        :key="ring.key"
        class="rn-dkg__ring"
        :size="size"
        :view-box="BOX"
        :r="ring.r"
        :stroke="STROKE"
        :value="ring.value"
        :color="ring.color"
        :track-color="trackColor"
        transition="stroke-dashoffset .5s"
        :data-testid="`dkg-ring-${ring.key}`"
      />
      <div v-if="$slots.default" class="rn-dkg__centre"><slot></slot></div>
    </div>

    <div v-if="legend" class="rn-dkg__legend" data-testid="dkg-legend">
      <div v-if="heading" class="rn-dkg__heading">{{ heading }}</div>
      <div
        v-for="ring in rings"
        :key="ring.key"
        class="rn-dkg__row"
        data-testid="dkg-legend-row"
      >
        <div
          class="rn-dkg__badge"
          :style="{ background: ring.tint, color: ring.color }"
        >{{ ring.key }}</div>
        <div class="rn-dkg__text">
          <div class="rn-dkg__label">{{ ring.label }}</div>
          <div class="rn-dkg__hint">{{ ring.hint }}</div>
        </div>
        <div class="rn-dkg__value" data-testid="dkg-legend-value">{{ ring.display }}%</div>
      </div>
    </div>
  </div>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';
import { STIMULI, STIMULUS_ORDER } from '../../constants/routineFocus';

/** Outer to inner, matching the legend order D · K · G. */
const RADII = { D: 56, K: 42, G: 28 };

export default {
  name: 'MoleculeDkgRingTrio',
  components: { ProgressRing },
  props: {
    /** Percentages keyed by stimulus, e.g. `{ D: 92, K: 140, G: 61 }`. */
    values: { type: Object, default: () => ({}) },
    /** Rendered diameter. The 128-unit coordinate space never changes. */
    size: { type: Number, default: 128 },
    legend: { type: Boolean, default: true },
    /** e.g. "BALANCE · AVG PER DAY". */
    heading: { type: String, default: '' },
    trackColor: { type: String, default: 'rgba(0,0,0,.06)' },
  },
  data() {
    return { BOX: 128, STROKE: 10 };
  },
  computed: {
    rings() {
      return STIMULUS_ORDER.map((key) => {
        const token = STIMULI[key];
        const raw = Number(this.values[key]);
        const value = Number.isFinite(raw) ? raw : 0;
        return {
          key,
          r: RADII[key],
          color: token.color,
          tint: token.tint,
          label: token.label,
          hint: token.hint,
          /** The arc is clamped by ProgressRing; the label stays honest. */
          value,
          display: Math.round(value),
        };
      });
    },
  },
};
</script>

<style>
.rn-dkg {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-dkg__rings {
  position: relative;
  flex-shrink: 0;
}

/* The three rings share one coordinate space by stacking, so each ProgressRing
   keeps its own track without a second SVG geometry. */
.rn-dkg__ring {
  position: absolute;
  top: 0;
  left: 0;
}

.rn-dkg__centre {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.rn-dkg__legend {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rn-dkg__heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-dkg__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-dkg__badge {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-dkg__text {
  flex: 1;
  min-width: 0;
}

.rn-dkg__label {
  font-size: 13px;
  font-weight: 600;
}

.rn-dkg__hint {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
}

.rn-dkg__value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
