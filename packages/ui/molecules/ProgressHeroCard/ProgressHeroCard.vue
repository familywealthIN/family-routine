<template>
  <!--
    The Progress hero (packages/design/Progress.dc.html § GP/GT/GD).

    The old page drew the progress statement and the Routine Efficiency card as
    two separate tiles; the redesign MERGES them, so one card carries the
    sentence, the 44px figure, the info formula and the trend you can scrub.

    Two honesty rules are baked in rather than left to the host:
      - the figure prints an em dash (not 0) when there is no efficiency card
        yet; a figure we could not load is not a zero (FocusPointsChip's rule).
      - the delta needs the PREVIOUS period's figure. `getProgressReport`
        returns one window per call, so when no `previous` is supplied the card
        says so instead of printing a plausible "up 0 pts".

    `formula` is the server's own wording, shipped on the efficiency card as
    `description` (D-13). This component never composes that sentence: one
    definition of the metric means one definition of its explanation too.
  -->
  <div class="rn-phero" data-testid="progress-hero">
    <div v-if="statement" class="rn-phero__statement" data-testid="progress-statement">
      {{ statement }}
    </div>

    <div class="rn-phero__figure">
      <div class="rn-phero__value" data-testid="progress-efficiency">
        {{ hasValue ? rounded : '—' }}<span v-if="hasValue" class="rn-phero__pct">%</span>
      </div>
      <div class="rn-phero__meta">
        <div class="rn-phero__label">
          Routine efficiency
          <i
            v-if="formula"
            class="rn-mi rn-phero__info"
            title="How it's calculated"
            data-testid="progress-formula-toggle"
            @click="open = !open"
          >info</i>
        </div>
        <div
          class="rn-phero__delta"
          :style="{ color: deltaColor }"
          data-testid="progress-delta"
        >{{ deltaLabel }}</div>
      </div>
    </div>

    <div v-if="open && formula" class="rn-phero__formula" data-testid="progress-formula">
      {{ formula }}
    </div>

    <template v-if="hasSeries">
      <MiniSparkline
        :values="series"
        :previous="previous"
        :labels="seriesLabels"
        :selected-index="selectedIndex"
        @select="$emit('select-point', $event)"
      />
      <div class="rn-phero__readout" data-testid="progress-readout">
        <span class="rn-phero__dot"></span>
        <b class="rn-phero__sel">{{ selectedName }}</b>
        <span class="rn-phero__selval">{{ selectedValue }}</span>
        <span class="rn-phero__gap"></span>
        <span v-if="previous != null" class="rn-phero__ref">
          <span class="rn-phero__refline"></span>{{ previousLabel }}
        </span>
      </div>
    </template>
    <div v-else-if="trendNote" class="rn-phero__note" data-testid="progress-trend-empty">
      {{ trendNote }}
    </div>
  </div>
</template>

<script>
import MiniSparkline from '../MiniSparkline/MiniSparkline.vue';
import { PROGRESS_COLORS } from '../../constants/progress';

const UNKNOWN_FG = 'rgba(0,0,0,.45)';

const isNumber = (v) => v != null && Number.isFinite(Number(v));

export default {
  name: 'MoleculeProgressHeroCard',
  components: { MiniSparkline },
  props: {
    statement: { type: String, default: '' },
    /** Routine Efficiency, 0-100. `null` means "not loaded", never "zero". */
    efficiency: { type: Number, default: null },
    /** The server's formula sentence (the `efficiency` card's `description`). */
    formula: { type: String, default: '' },
    /** The previous period's efficiency - the delta and the dashed line. */
    previous: { type: Number, default: null },
    /** "yesterday" / "last week" / "August" / "2025". */
    previousLabel: { type: String, default: '' },
    /** Per-point efficiency across the period. Empty = no trend to draw. */
    series: { type: Array, default: () => [] },
    seriesLabels: { type: Array, default: () => [] },
    /** One readable name per series point ("Mon 7", "Workout"). */
    pointNames: { type: Array, default: () => [] },
    selectedIndex: { type: Number, default: null },
    /** Shown in place of the trend when there is no series. */
    trendNote: { type: String, default: '' },
  },
  data() {
    return { open: false };
  },
  computed: {
    hasValue() {
      return isNumber(this.efficiency);
    },
    rounded() {
      return Math.round(Number(this.efficiency));
    },
    hasSeries() {
      return this.series.some(isNumber);
    },
    /** Mirrors MiniSparkline's rule so the readout names the dot it highlights. */
    activeIndex() {
      const real = this.series.reduce((acc, v, i) => {
        if (isNumber(v)) acc.push(i);
        return acc;
      }, []);
      if (!real.length) return null;
      if (this.selectedIndex != null && real.indexOf(this.selectedIndex) !== -1) {
        return this.selectedIndex;
      }
      return real[real.length - 1];
    },
    selectedName() {
      if (this.activeIndex == null) return '';
      return this.pointNames[this.activeIndex] || '';
    },
    selectedValue() {
      if (this.activeIndex == null) return '';
      return `${Math.round(Number(this.series[this.activeIndex]))}%`;
    },
    delta() {
      if (!this.hasValue || !isNumber(this.previous)) return null;
      return Math.round(Number(this.efficiency)) - Math.round(Number(this.previous));
    },
    deltaLabel() {
      if (this.delta == null) {
        return this.previousLabel ? `No ${this.previousLabel} to compare yet` : '';
      }
      const arrow = this.delta >= 0 ? '▲' : '▼';
      return `${arrow} ${Math.abs(this.delta)} pts vs ${this.previousLabel}`;
    },
    deltaColor() {
      if (this.delta == null) return UNKNOWN_FG;
      return this.delta >= 0 ? PROGRESS_COLORS.up : PROGRESS_COLORS.down;
    },
  },
};
</script>

<style>
.rn-phero {
  padding: 16px 16px 12px;
}

.rn-phero__statement {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  text-wrap: pretty;
}

.rn-phero__figure {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.rn-phero__value {
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1px;
  color: #288bd5;
  font-variant-numeric: tabular-nums;
}

.rn-phero__pct {
  font-size: 22px;
}

.rn-phero__meta {
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;
}

.rn-phero__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.rn-phero__info {
  font-size: 16px;
  color: rgba(0, 0, 0, .4);
  cursor: pointer;
}

.rn-phero__delta {
  font-size: 12px;
  font-weight: 600;
}

.rn-phero__formula {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f7f7f7;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .65);
  animation: rn-fade .15s ease;
}

.rn-phero__note {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f7f7f7;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .55);
}

.rn-phero__readout {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 13px;
}

.rn-phero__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #288bd5;
}

.rn-phero__sel {
  font-weight: 700;
  white-space: nowrap;
}

.rn-phero__selval {
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
}

.rn-phero__gap {
  flex: 1;
}

.rn-phero__ref {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
  white-space: nowrap;
}

.rn-phero__refline {
  width: 14px;
  border-top: 1.5px dashed rgba(0, 0, 0, .35);
}
</style>
