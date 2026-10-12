<template>
  <!--
    The segmented control the redesign uses four times: Progress
    (Day · Week · Month · Year), Profile (12h / 24h), About (5 feature tabs) and
    the agent event kind (URL / cURL). Two variants, one geometry generalised
    from Progress:

      thumb      width `calc((100% - 6px) / n)`   left `calc(3px + i * (100% - 6px) / n)`
      underline  width `calc(100% / n)`           left `calc(i * 100% / n)`

    The mock hardcodes `/ 4` because Progress happens to have four periods; here
    `n` is `segments.length`, so the 2-segment and 5-segment uses get the same
    maths instead of their own copies.

    Vuetify's v-tabs / v-btn-toggle are not reused: both bring their own slider,
    ripple, height and active-class colours, and the chassis pins the track
    radius, thumb radius, shadow and 280ms easing to exact values.
  -->
  <div
    class="rn-switch"
    :class="[`rn-switch--${variant}`, `rn-switch--${size}`]"
    role="tablist"
    data-testid="sliding-switch"
  >
    <div
      v-if="indicatorStyle"
      class="rn-switch__indicator"
      :class="`rn-switch__indicator--${variant}`"
      :style="indicatorStyle"
      data-testid="sliding-switch-indicator"
    ></div>
    <div
      v-for="seg in resolvedSegments"
      :key="seg.key"
      class="rn-switch__seg"
      :class="{ 'rn-switch__seg--active': seg.active }"
      :style="segStyle(seg)"
      role="tab"
      :aria-selected="seg.active ? 'true' : 'false'"
      data-testid="sliding-switch-segment"
      @click="pick(seg)"
    >
      <i v-if="seg.icon" class="rn-mi rn-switch__icon">{{ seg.icon }}</i>
      <span class="rn-switch__label">{{ seg.label }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculeSlidingSwitch',
  model: { prop: 'value', event: 'input' },
  props: {
    /**
     * `['12', '24']` or `[{ key, label, icon }]`. A bare string is both key and
     * label, which is all the 12h/24h and URL/cURL switches need.
     */
    segments: { type: Array, default: () => [] },
    value: { type: [String, Number], default: null },
    /** `thumb` = Progress/Profile pill. `underline` = About feature tabs. */
    variant: { type: String, default: 'thumb' },
    /**
     * `sm` = the 34px chassis pill. `xs` = the compact one: a tighter track and
     * 11px labels, for a switch that has to hold five words (DateSelector's
     * Day · Week · Month · Year · Lifetime) inside a dialog.
     */
    size: { type: String, default: 'sm' },
    /**
     * Segment height. Defaults by `size` (34 / 28); 52 for the icon-over-label
     * tabs. Pass it only to override the size's own height.
     */
    height: { type: Number, default: null },
    indicatorColor: { type: String, default: '#288bd5' },
    activeColor: { type: String, default: 'rgba(0,0,0,.87)' },
    inactiveColor: { type: String, default: 'rgba(0,0,0,.55)' },
  },
  computed: {
    /** The track's padding, which the thumb geometry has to subtract. */
    inset() {
      return this.size === 'xs' ? 2 : 3;
    },
    resolvedHeight() {
      if (this.height != null) return this.height;
      return this.size === 'xs' ? 28 : 34;
    },
    resolvedSegments() {
      return this.segments.map((raw, index) => {
        const seg = typeof raw === 'object' && raw !== null ? raw : { key: raw, label: raw };
        const key = seg.key != null ? seg.key : seg.label;
        return {
          index,
          key,
          label: seg.label != null ? seg.label : key,
          icon: seg.icon || null,
          active: key === this.value,
        };
      });
    },
    count() {
      return this.resolvedSegments.length;
    },
    /** Falls back to the first segment so the indicator is never orphaned. */
    activeIndex() {
      const found = this.resolvedSegments.findIndex((seg) => seg.active);
      return found === -1 ? 0 : found;
    },
    isUnderline() {
      return this.variant === 'underline';
    },
    /** Null for an empty switch — there is nothing to point at. */
    indicatorStyle() {
      const n = this.count;
      if (!n) return null;
      const i = this.activeIndex;
      if (this.isUnderline) {
        return {
          left: `calc(${i} * 100% / ${n})`,
          width: `calc(100% / ${n})`,
          background: this.indicatorColor,
        };
      }
      const pad = this.inset;
      return {
        left: `calc(${pad}px + ${i} * (100% - ${pad * 2}px) / ${n})`,
        width: `calc((100% - ${pad * 2}px) / ${n})`,
      };
    },
  },
  methods: {
    segStyle(seg) {
      return {
        height: `${this.resolvedHeight}px`,
        color: seg.active ? this.activeColor : this.inactiveColor,
      };
    },
    /** Re-picking the active segment is a no-op — no event, no animation replay. */
    pick(seg) {
      if (seg.active) return;
      this.$emit('input', seg.key);
      this.$emit('change', seg.key);
    },
  },
};
</script>

<style>
.rn-switch {
  position: relative;
  display: flex;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-switch--thumb {
  padding: 3px;
  border-radius: 12px;
  background: rgba(0, 0, 0, .06);
}

/* Compact: 2px of track instead of 3, and labels small enough that five
   segments fit a phone dialog without wrapping. The thumb geometry reads the
   same inset from `inset()`, so the two stay in step. */
.rn-switch--thumb.rn-switch--xs {
  padding: 2px;
  border-radius: 10px;
}

.rn-switch--underline {
  border-bottom: 1px solid rgba(0, 0, 0, .08);
}

.rn-switch__indicator {
  position: absolute;
  transition: left .28s cubic-bezier(.4, 0, .2, 1);
}

.rn-switch__indicator--thumb {
  top: 3px;
  bottom: 3px;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
}

.rn-switch--xs .rn-switch__indicator--thumb {
  top: 2px;
  bottom: 2px;
  border-radius: 8px;
}

.rn-switch__indicator--underline {
  bottom: 0;
  height: 2px;
}

.rn-switch__seg {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  transition: color .2s;
  padding: 0 2px;
}

/* The icon-over-label tab stacks; the pill stays on one line. */
.rn-switch--underline .rn-switch__seg {
  flex-direction: column;
  font-size: 11px;
  border-radius: 0;
}

.rn-switch--xs .rn-switch__seg {
  font-size: 11px;
  border-radius: 8px;
  padding: 0 1px;
}

.rn-switch__icon {
  font-size: 20px;
}
</style>
