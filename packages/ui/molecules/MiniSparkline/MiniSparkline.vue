<template>
  <!--
    Progress' trend line (docs/redesign/chassis.md, Progress.dc.html).

      W = 320, H = 96
      X(i) = n === 1 ? W/2 : i * W / (n - 1)
      Y(v) = H - 6 - (v / 100) * (H - 14)

    `atoms/Sparkline` (a v-sparkline wrapper) was checked first and does not fit:
    it has no null handling, no previous-period reference line, no selection and
    no hit zones — all four are the point of this component. It stays for the
    legacy cards.

    The dots and hit zones are absolutely-positioned DIVs, not SVG circles,
    because the <svg> is `preserveAspectRatio="none"` — it stretches to the card
    width, which would squash a circle into an ellipse. Divs stay round and the
    hit zone stays a predictable px/% box.

    The hit zone is a FULL inter-point-wide invisible column, not the visual dot:
    on a phone the dot is 8px and a thumb is not, so taps have to land on the
    column. A null point gets a zero-size dot (so the gap is visible) and no
    hit zone (there is nothing to select).
  -->
  <div class="rn-spark" data-testid="mini-sparkline">
    <div class="rn-spark__plot" :style="{ height: `${H}px` }">
      <svg
        class="rn-spark__svg"
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <line
          v-if="refY !== null"
          data-testid="mini-sparkline-reference"
          x1="0"
          :y1="refY"
          :x2="W"
          :y2="refY"
          stroke="rgba(0,0,0,.18)"
          stroke-width="1"
          stroke-dasharray="3 4"
          vector-effect="non-scaling-stroke"
        />
        <path v-if="areaD" :d="areaD" :fill="areaFill" data-testid="mini-sparkline-area" />
        <path
          v-if="lineD"
          :d="lineD"
          fill="none"
          :stroke="color"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          data-testid="mini-sparkline-line"
        />
        <line
          v-if="guideX !== null"
          data-testid="mini-sparkline-guide"
          :x1="guideX"
          y1="0"
          :x2="guideX"
          :y2="H"
          stroke="rgba(40,139,213,.35)"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <div
        v-for="dot in dots"
        :key="`dot-${dot.index}`"
        class="rn-spark__dot"
        :class="{ 'rn-spark__dot--selected': dot.selected }"
        :style="dot.style"
        data-testid="mini-sparkline-dot"
      ></div>

      <div
        v-for="zone in hitZones"
        :key="`hit-${zone.index}`"
        class="rn-spark__hit"
        :style="zone.style"
        :data-index="zone.index"
        data-testid="mini-sparkline-hit"
        @click="select(zone.index)"
      ></div>
    </div>

    <div v-if="labels.length" class="rn-spark__axis" data-testid="mini-sparkline-axis">
      <span v-for="(label, i) in labels" :key="`x-${i}-${label}`">{{ label }}</span>
    </div>
  </div>
</template>

<script>
const W = 320;
const H = 96;

export default {
  name: 'MoleculeMiniSparkline',
  props: {
    /** Percentages, `null` for a day with no data (a skipped day, not a zero). */
    values: { type: Array, default: () => [] },
    /** The previous period average — drawn as the dashed reference line. */
    previous: { type: Number, default: null },
    /** X-axis tick labels. Rendered verbatim, evenly spaced. */
    labels: { type: Array, default: () => [] },
    /**
     * Selected index. `null` selects the last non-null point. Supports
     * `:selected-index.sync` as well as a plain `@select` listener.
     */
    selectedIndex: { type: Number, default: null },
    color: { type: String, default: '#288bd5' },
    areaFill: { type: String, default: 'rgba(40,139,213,.1)' },
  },
  data() {
    return { W, H };
  },
  computed: {
    n() {
      return this.values.length;
    },
    /** Indices whose value is a finite number — everything else is a gap. */
    realIndices() {
      return this.values.reduce((acc, v, i) => {
        if (v != null && Number.isFinite(Number(v))) acc.push(i);
        return acc;
      }, []);
    },
    /** Inter-point width: the hit column width, and the whole plot when n is 1. */
    hitWidth() {
      if (this.n <= 1) return W;
      return W / (this.n - 1);
    },
    points() {
      return this.values.map((v, i) => ({
        index: i,
        value: v,
        x: this.xAt(i),
        /** A gap still needs a y so its zero-size dot sits on the baseline. */
        y: this.yAt(v == null || !Number.isFinite(Number(v)) ? 0 : Number(v)),
      }));
    },
    lineD() {
      return this.realIndices
        .map((i, j) => {
          const p = this.points[i];
          return `${j ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        })
        .join(' ');
    },
    /** Closed back along the baseline so the fill has a bottom edge. */
    areaD() {
      const real = this.realIndices;
      if (!real.length || !this.lineD) return '';
      const first = this.points[real[0]];
      const last = this.points[real[real.length - 1]];
      return `${this.lineD} L${last.x.toFixed(1)} ${H} L${first.x.toFixed(1)} ${H} Z`;
    },
    refY() {
      if (this.previous == null || !Number.isFinite(Number(this.previous))) return null;
      return this.yAt(Number(this.previous)).toFixed(1);
    },
    /** The caller's choice when it points at real data, else the last real point. */
    activeIndex() {
      const real = this.realIndices;
      if (!real.length) return null;
      if (this.selectedIndex != null && real.indexOf(this.selectedIndex) !== -1) {
        return this.selectedIndex;
      }
      return real[real.length - 1];
    },
    guideX() {
      if (this.activeIndex == null) return null;
      return this.xAt(this.activeIndex).toFixed(1);
    },
    dots() {
      return this.points.map((p) => {
        const isGap = p.value == null || !Number.isFinite(Number(p.value));
        const selected = !isGap && p.index === this.activeIndex;
        let size = '8px';
        if (isGap) size = '0px';
        else if (selected) size = '12px';
        return {
          index: p.index,
          selected,
          style: {
            left: `${((p.x / W) * 100).toFixed(2)}%`,
            top: `${p.y.toFixed(1)}px`,
            width: size,
            height: size,
            borderColor: this.color,
            background: selected ? this.color : '#fff',
          },
        };
      });
    },
    /**
     * One full inter-point-wide column per selectable point, centred on it and
     * clipped at the left edge so the first column cannot sit off-canvas.
     */
    hitZones() {
      const hw = this.hitWidth;
      return this.realIndices.map((i) => {
        const left = Math.max(0, this.xAt(i) - hw / 2);
        return {
          index: i,
          style: {
            left: `${((left / W) * 100).toFixed(2)}%`,
            width: `${((hw / W) * 100).toFixed(2)}%`,
          },
        };
      });
    },
  },
  methods: {
    xAt(i) {
      if (this.n === 1) return W / 2;
      if (this.n <= 0) return 0;
      return (i * W) / (this.n - 1);
    },
    yAt(v) {
      return H - 6 - (v / 100) * (H - 14);
    },
    select(index) {
      if (this.realIndices.indexOf(index) === -1) return;
      if (index === this.activeIndex) return;
      this.$emit('select', index);
      this.$emit('update:selectedIndex', index);
    },
  },
};
</script>

<style>
.rn-spark {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-spark__plot {
  position: relative;
  margin-top: 12px;
}

.rn-spark__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.rn-spark__dot {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  box-sizing: border-box;
  border-width: 2px;
  border-style: solid;
  pointer-events: none;
  transition: width .15s, height .15s;
}

/* The tap target, deliberately invisible and deliberately much wider than
   the dot it selects. */
.rn-spark__hit {
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: pointer;
}

.rn-spark__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(0, 0, 0, .4);
}
</style>
