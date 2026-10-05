<template>
  <!--
    The one ring the redesign draws everywhere (docs/redesign/chassis.md § Rings).

    `c = 2*PI*r`, `stroke-dashoffset = c * (1 - value/100)`, SVG rotated -90deg
    so the fill starts at 12 o'clock, round line caps. Every ring in the chassis
    table is this component with different `size` / `viewBox` / `r` / `stroke`.

    `viewBox` is a separate prop from `size` on purpose: the designs draw a 44px
    ladder step and a 26px Priority tile inside a 48-unit box, and a 120px Year
    hero inside a 96-unit box, so the rendered size and the coordinate space are
    genuinely independent. It is NOT derivable from `r + stroke` — the mocks pad
    the box by different amounts.

    The centre slot sits outside the <svg> so the -90deg rotation cannot tip the
    label on its side.
  -->
  <div class="rn-ring" :style="rootStyle">
    <svg
      class="rn-ring__svg"
      :viewBox="`0 0 ${box} ${box}`"
      focusable="false"
      aria-hidden="true"
    >
      <circle
        v-if="trackColor !== 'none'"
        class="rn-ring__track"
        data-testid="progress-ring-track"
        :cx="centre"
        :cy="centre"
        :r="r"
        :fill="fill"
        :stroke="trackColor"
        :stroke-width="resolvedTrackWidth"
      />
      <circle
        class="rn-ring__value"
        data-testid="progress-ring-value"
        :cx="centre"
        :cy="centre"
        :r="r"
        fill="none"
        :stroke="resolvedColor"
        :stroke-width="stroke"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        :style="{ transition }"
      />
    </svg>
    <div v-if="$slots.default" class="rn-ring__centre"><slot></slot></div>
  </div>
</template>

<script>
/** The chassis palette's ring colours. */
const DONE = '#4CAF50';
const CURRENT = '#FF9800';
const DEFAULT = '#288bd5';

export default {
  name: 'MoleculeProgressRing',
  props: {
    /** Rendered diameter in px. */
    size: { type: Number, default: 48 },
    /** SVG coordinate space. Falls back to `size` when the two agree. */
    viewBox: { type: Number, default: null },
    /** Radius, in viewBox units. */
    r: { type: Number, default: 20 },
    /** Arc stroke width, in viewBox units. */
    stroke: { type: Number, default: 4 },
    /** Track stroke width. Defaults to the arc's, which is what every mock does. */
    trackWidth: { type: Number, default: null },
    /** Percentage 0-100. Values above 100 clamp — the arc cannot overshoot. */
    value: { type: Number, default: 0 },
    /** Explicit colour. Omit to let the chassis colour rule decide. */
    color: { type: String, default: null },
    /** `none` drops the track circle entirely. */
    trackColor: { type: String, default: 'rgba(0,0,0,.08)' },
    /** The Goals calendar day tints the track's interior. */
    fill: { type: String, default: 'none' },
    /** Today / the running routine — orange even at 0%. */
    current: { type: Boolean, default: false },
    /** Grey for a future or empty period. */
    emptyColor: { type: String, default: 'rgba(0,0,0,.18)' },
    transition: { type: String, default: 'stroke-dashoffset .5s' },
  },
  computed: {
    box() {
      return this.viewBox || this.size;
    },
    centre() {
      return this.box / 2;
    },
    rootStyle() {
      return { width: `${this.size}px`, height: `${this.size}px` };
    },
    resolvedTrackWidth() {
      return this.trackWidth == null ? this.stroke : this.trackWidth;
    },
    /** Raw float. Tests compare against the chassis table's rounded literals. */
    circumference() {
      return 2 * Math.PI * this.r;
    },
    dashArray() {
      return this.circumference.toFixed(2);
    },
    /** The arc clamps at both ends; a 140% period still reads as a full ring. */
    clamped() {
      const v = Number(this.value);
      if (!Number.isFinite(v)) return 0;
      return Math.min(100, Math.max(0, v));
    },
    dashOffset() {
      return (this.circumference * (1 - this.clamped / 100)).toFixed(2);
    },
    /**
     * Chassis colour rule: green at 100%, orange for today/current, grey when
     * empty, blue otherwise. `current` beats `empty` — the routine you are in
     * right now is orange before you have earned anything from it.
     */
    resolvedColor() {
      if (this.color) return this.color;
      if (this.clamped >= 100) return DONE;
      if (this.current) return CURRENT;
      if (this.clamped <= 0) return this.emptyColor;
      return DEFAULT;
    },
  },
};
</script>

<style>
.rn-ring {
  position: relative;
  flex-shrink: 0;
  line-height: 0;
}

.rn-ring__svg {
  width: 100%;
  height: 100%;
  display: block;
  transform: rotate(-90deg);
}

.rn-ring__centre {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
