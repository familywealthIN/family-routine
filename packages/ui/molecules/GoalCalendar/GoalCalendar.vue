<template>
  <!--
    The Goals calendar (Goals.dc.html): a progress RING per day, not "N Goals".

    On the phone it shows only the selected week and pulls open to the full
    month; tablet and desktop always draw the whole month, so they pass
    `collapsible: false` and get the hint line instead of the toggle.

    Pure: props in, `select-day` / `toggle` / `prev-month` / `next-month` out.
    `cells` is built by `utils/goalCascade.calendarCells`, which supplies FACTS
    (total, done, selected, today, future). The colour rule below is the chassis
    ring rule and is presentation, so it lives here — green at 100%, orange for
    today, blue otherwise, transparent for a future day.

    The month label is flanked by two chevrons rather than the old page's pair of
    outlined "Prev"/"Next" buttons under the grid: the month is the thing being
    changed, so the control sits on it. They are NEVER disabled while the month
    read is in flight (ARCHITECTURE § 3.7) — the old buttons took an
    `isNavigating` lock and ate the second tap.
  -->
  <section class="rn-gcal" data-testid="goal-calendar">
    <header class="rn-gcal__head">
      <div class="rn-gcal__nav">
        <button
          type="button"
          class="rn-gcal__step"
          title="Previous month"
          aria-label="Previous month"
          data-testid="goal-calendar-prev"
          @click="$emit('prev-month')"
        >
          <i class="rn-mi rn-gcal__step-glyph">chevron_left</i>
        </button>
        <div class="rn-gcal__month">{{ monthLabel }}</div>
        <button
          type="button"
          class="rn-gcal__step"
          title="Next month"
          aria-label="Next month"
          data-testid="goal-calendar-next"
          @click="$emit('next-month')"
        >
          <i class="rn-mi rn-gcal__step-glyph">chevron_right</i>
        </button>
      </div>
      <div
        v-if="collapsible"
        class="rn-gcal__toggle"
        data-testid="goal-calendar-toggle"
        @click="$emit('toggle')"
      >
        {{ expanded ? 'Week' : 'Month' }}
        <i class="rn-mi rn-gcal__toggle-glyph">{{ expanded ? 'expand_less' : 'expand_more' }}</i>
      </div>
      <div v-else-if="hint" class="rn-gcal__hint">{{ hint }}</div>
    </header>

    <!-- D-10: a month we never received must not draw thirty empty rings, which
         read as "you planned nothing all month". -->
    <div v-if="loadError" class="rn-gcal__error" data-testid="goal-calendar-error">
      Couldn’t load this month — nothing has been deleted.
      <button
        type="button"
        class="rn-gcal__retry"
        data-testid="goal-calendar-retry"
        @click="$emit('retry')"
      >Retry</button>
    </div>

    <div v-else class="rn-gcal__grid">
      <div
        v-for="(label, index) in DOW_LABELS"
        :key="`dow-${index}`"
        class="rn-gcal__dow"
      >{{ label }}</div>

      <div
        v-for="cell in visibleCells"
        :key="cell.key"
        class="rn-gcal__cell"
        :class="{ 'rn-gcal__cell--blank': cell.blank }"
        :data-testid="cell.blank ? 'goal-calendar-pad' : `goal-calendar-day-${cell.day}`"
        @click="onSelect(cell)"
      >
        <ProgressRing
          v-if="!cell.blank"
          :size="RING.size"
          :view-box="RING.viewBox"
          :r="RING.r"
          :stroke="RING.stroke"
          :value="cell.value"
          :color="ringColor(cell)"
          :track-color="trackColor(cell)"
          :fill="fillColor(cell)"
          transition="stroke-dashoffset .4s"
        >
          <span class="rn-gcal__num" :style="numStyle(cell)">{{ cell.day }}</span>
        </ProgressRing>
      </div>
    </div>
  </section>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';
import {
  CALENDAR_RING, DOW_LABELS, RING_DEFAULT, RING_DONE, RING_NOW,
} from '../../constants/goalsCascade';

const SELECTED = '#288bd5';

export default {
  name: 'MoleculeGoalCalendar',
  components: { ProgressRing },
  props: {
    /** "September 2026". */
    monthLabel: { type: String, default: '' },
    /** `calendarCells()` — whole Sunday-first weeks, blanks padded. */
    cells: { type: Array, default: () => [] },
    /** Phone only: the month is folded to the selected week until pulled open. */
    collapsible: { type: Boolean, default: false },
    expanded: { type: Boolean, default: false },
    /** Replaces the toggle where the month is always open ("Tap a day"). */
    hint: { type: String, default: '' },
    /** The month read failed AND nothing is cached. Never "a request is in flight". */
    loadError: { type: Boolean, default: false },
  },
  data() {
    return { RING: CALENDAR_RING, DOW_LABELS };
  },
  computed: {
    /**
     * The selected week is the 7-cell row holding the selected day. Falling back
     * to the first row rather than an empty grid matters: a month with no
     * selection at all (a date outside it) must still draw something.
     */
    visibleCells() {
      if (!this.collapsible || this.expanded) return this.cells;
      const index = this.cells.findIndex((cell) => !cell.blank && cell.selected);
      const start = index === -1 ? 0 : Math.floor(index / 7) * 7;
      return this.cells.slice(start, start + 7);
    },
  },
  methods: {
    onSelect(cell) {
      if (cell.blank) return;
      this.$emit('select-day', cell.date, cell);
    },
    ringColor(cell) {
      if (cell.selected) return '#fff';
      if (cell.value >= 100) return RING_DONE;
      // A day that has not happened yet has nothing to report — no arc at all,
      // rather than a grey one that reads as "you missed it".
      if (cell.future) return 'transparent';
      return cell.today ? RING_NOW : RING_DEFAULT;
    },
    trackColor(cell) {
      if (cell.selected) return SELECTED;
      return cell.total ? 'rgba(0,0,0,.08)' : 'transparent';
    },
    fillColor(cell) {
      return cell.selected ? SELECTED : 'none';
    },
    numStyle(cell) {
      let color = 'rgba(0,0,0,.8)';
      if (cell.selected) color = '#fff';
      else if (cell.today) color = '#e68900';
      else if (cell.future) color = 'rgba(0,0,0,.45)';
      return { color, fontWeight: cell.selected || cell.today ? 700 : 500 };
    },
  },
};
</script>

<style>
.rn-gcal {
  display: block;
  padding: 12px 10px 6px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-gcal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 6px;
}

.rn-gcal__nav {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.rn-gcal__month {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.rn-gcal__step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .54);
  font: inherit;
  cursor: pointer;
}

.rn-gcal__step:hover {
  background: rgba(0, 0, 0, .05);
  color: #288bd5;
}

.rn-gcal__step-glyph {
  font-size: 20px;
}

.rn-gcal__toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-gcal__toggle-glyph {
  font-size: 18px;
}

.rn-gcal__hint {
  font-size: 12px;
  color: rgba(0, 0, 0, .45);
}

.rn-gcal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.rn-gcal__dow {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: rgba(0, 0, 0, .4);
  padding-bottom: 2px;
}

.rn-gcal__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  cursor: pointer;
}

.rn-gcal__cell--blank {
  visibility: hidden;
  cursor: default;
}

.rn-gcal__num {
  font-size: 12px;
}

.rn-gcal__error {
  padding: 14px 6px 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, .55);
}

.rn-gcal .rn-gcal__retry {
  display: block;
  margin: 8px auto 0;
  padding: 6px 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(211, 47, 47, .08);
  color: #d32f2f;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
