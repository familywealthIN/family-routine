<template>
  <div class="weekday-selector" :class="{ 'weekday-selector--compact': isCompact }">
    <div
      v-for="(weekDay, i) in weekDays"
      :key="weekDay.day"
      :data-testid="`weekday-${weekDay.fullDate}`"
      :style="cellStyle"
      @click="onClick(i)"
      @pointerdown="pressStart(weekDay)"
      @pointerup="pressEnd"
      @pointerleave="pressEnd"
      @pointercancel="pressEnd"
      @contextmenu="onContextMenu(weekDay, $event)"
      :class="['day-column', { active: weekDay.isActive, disabled: isLoading }]"
    >
      <div class="day-label">{{ weekDay.day }}</div>
      <div class="ring-container" :style="ringStyle">
        <svg :viewBox="`0 0 ${svgSize} ${svgSize}`" class="rings-svg">
          <!-- Track circles (background) -->
          <circle
            :cx="center" :cy="center" :r="ringG.radius"
            fill="none" :stroke="trackColor" :stroke-width="strokeWidth"
          />
          <circle
            :cx="center" :cy="center" :r="ringK.radius"
            fill="none" :stroke="trackColor" :stroke-width="strokeWidth"
          />
          <circle
            :cx="center" :cy="center" :r="ringD.radius"
            fill="none" :stroke="trackColor" :stroke-width="strokeWidth"
          />
          <!-- Value circles (filled progress) -->
          <circle
            :cx="center" :cy="center" :r="ringG.radius"
            fill="none" stroke="#2196F3" :stroke-width="strokeWidth"
            :stroke-dasharray="ringG.circumference"
            :stroke-dashoffset="getRingOffset(weekDay.fullDate, 'G', ringG.circumference)"
            stroke-linecap="round"
            class="ring-value"
          />
          <circle
            :cx="center" :cy="center" :r="ringK.radius"
            fill="none" stroke="#E53935" :stroke-width="strokeWidth"
            :stroke-dasharray="ringK.circumference"
            :stroke-dashoffset="getRingOffset(weekDay.fullDate, 'K', ringK.circumference)"
            stroke-linecap="round"
            class="ring-value"
          />
          <circle
            :cx="center" :cy="center" :r="ringD.radius"
            fill="none" stroke="#4caf50" :stroke-width="strokeWidth"
            :stroke-dasharray="ringD.circumference"
            :stroke-dashoffset="getRingOffset(weekDay.fullDate, 'D', ringD.circumference)"
            stroke-linecap="round"
            class="ring-value"
          />
        </svg>
        <div class="day-number">{{ weekDay.dayNumber }}</div>
        <!--
          A skipped day is not a failed one, so it does not read as an empty
          ring. The pause overlay covers the rings entirely — their value for a
          skipped day is noise.
        -->
        <div
          v-if="isSkipped(weekDay.fullDate)"
          class="day-skipped"
          :data-testid="`weekday-skipped-${weekDay.fullDate}`"
          title="Routines are paused for this day"
        >
          <i class="rn-mi">pause</i>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment';

/**
 * How much cell there is around the ring in the compact (header) form: the
 * design's iPad and desktop frames both draw a 28px ring in a 38px cell. The
 * cell does not stretch there — the strip sits beside the date at a 40px pitch
 * (38 + the 2px gap), it does not spread across the row.
 */
const CELL_SURROUND = 10;

export default {
  name: 'OrganismWeekdaySelector',

  props: {
    selectedDate: {
      type: String,
      default: () => moment().format('DD-MM-YYYY'),
    },
    weekStimuliMap: {
      type: Object,
      default: () => ({}),
    },
    loadingDay: {
      type: Number,
      default: null,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    /**
     * Ring diameter in px. Null keeps the responsive default (36 on phone,
     * 48 above) — the Routine Focus header asks for its own size instead,
     * because there the strip sits in a 64px row, not on its own line.
     */
    ringSize: {
      type: Number,
      default: null,
    },
    /**
     * Days (DD-MM-YYYY) whose routines are paused. Drawn as a pause overlay.
     */
    skippedDates: {
      type: Array,
      default: () => [],
    },
    /**
     * Which cell can be long-pressed. Only today's routines can be skipped —
     * `skipRoutine` takes the day's routine document id and the quota is counted
     * from the week start to today, so arming the gesture on another day would
     * promise something the server will refuse.
     */
    todayDate: {
      type: String,
      default: null,
    },
    /** How long a press has to be held before it counts as a long press. */
    longPressMs: {
      type: Number,
      default: 520,
    },
  },
  data() {
    const svgSize = 48;
    const center = svgSize / 2;
    const strokeWidth = 2;
    const radiusD = 18;
    const radiusK = 20;
    const radiusG = 22;
    return {
      weekDays: [],
      svgSize,
      center,
      strokeWidth,
      trackColor: 'rgba(0,0,0,0.08)',
      ringD: { radius: radiusD, circumference: 2 * Math.PI * radiusD },
      ringK: { radius: radiusK, circumference: 2 * Math.PI * radiusK },
      ringG: { radius: radiusG, circumference: 2 * Math.PI * radiusG },
      pressTimer: null,
      // A long press that fired must swallow the click that follows it,
      // otherwise the gesture both opens the skip sheet AND selects the day.
      suppressClick: false,
    };
  },
  beforeDestroy() {
    this.pressEnd();
  },
  computed: {
    /**
     * A host that names its own ring size is the Routine Focus header, where the
     * strip is a seven-cell row beside the date rather than a full-width band.
     * That is the only thing the two forms differ by, so it keys off the one
     * prop already plumbed for it instead of a second `variant`.
     */
    isCompact() {
      return !!this.ringSize;
    },
    ringStyle() {
      if (!this.ringSize) return {};
      return { width: `${this.ringSize}px`, height: `${this.ringSize}px` };
    },
    cellStyle() {
      if (!this.isCompact) return {};
      return { flex: '0 0 auto', width: `${this.ringSize + CELL_SURROUND}px` };
    },
  },
  watch: {
    selectedDate: {
      handler(newDate, oldDate) {
        if (!oldDate) {
          // Initial load — full build
          this.weekDays = this.buildWeekdays();
          return;
        }
        const newMoment = moment(newDate, 'DD-MM-YYYY');
        const oldMoment = moment(oldDate, 'DD-MM-YYYY');

        if (newMoment.isoWeek() === oldMoment.isoWeek() && newMoment.year() === oldMoment.year()) {
          // Same week — only toggle active flag (optimistic, no rebuild)
          const selectedWeekday = newMoment.weekday();
          this.weekDays = this.weekDays.map((day, i) => ({
            ...day,
            isActive: selectedWeekday === i,
          }));
        } else {
          // Different week — full rebuild needed
          this.weekDays = this.buildWeekdays();
        }
      },
      immediate: true,
    },
  },
  methods: {
    buildWeekdays() {
      const weekDays = [];
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDate = moment(this.selectedDate, 'DD-MM-YYYY');
      const selectedWeekday = currentDate.weekday();
      const weekStart = currentDate.clone().startOf('week');

      dayLabels.forEach((day, i) => {
        const dayMoment = moment(weekStart).add(i, 'days');
        weekDays.push({
          dayNumber: dayMoment.format('D'),
          fullDate: dayMoment.format('DD-MM-YYYY'),
          isActive: selectedWeekday === i,
          day,
        });
      });

      return weekDays;
    },
    isSkipped(date) {
      return (this.skippedDates || []).indexOf(date) >= 0;
    },
    /** Only today arms the gesture — see the `todayDate` prop. */
    canLongPress(weekDay) {
      return !!this.todayDate && !!weekDay && weekDay.fullDate === this.todayDate;
    },
    pressStart(weekDay) {
      this.pressEnd();
      if (this.isLoading || !this.canLongPress(weekDay)) return;
      this.pressTimer = setTimeout(() => {
        this.pressTimer = null;
        this.suppressClick = true;
        this.$emit('long-press', weekDay.fullDate);
      }, this.longPressMs);
    },
    pressEnd() {
      if (this.pressTimer) {
        clearTimeout(this.pressTimer);
        this.pressTimer = null;
      }
    },
    /** Pointer users get the same sheet from the context menu. */
    onContextMenu(weekDay, event) {
      if (!this.canLongPress(weekDay)) return;
      if (event && event.preventDefault) event.preventDefault();
      this.pressEnd();
      this.suppressClick = true;
      this.$emit('long-press', weekDay.fullDate);
    },
    onClick(index) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.isLoading) return;
      this.handleDateSelect(index);
    },
    handleDateSelect(index) {
      if (this.weekDays[index] && this.weekDays[index].isActive) {
        return; // Already selected — no-op
      }

      const newDate = this.weekDays[index].fullDate;

      // Optimistic: immediately update active state
      this.weekDays = this.weekDays.map((weekDay, i) => ({
        ...weekDay,
        isActive: i === index,
      }));

      this.$emit('date-selected', newDate);
    },
    getRingOffset(dateStr, stimulus, circumference) {
      const stimuli = this.weekStimuliMap[dateStr];
      if (!stimuli) {
        return circumference;
      }
      const value = stimuli[stimulus] || 0;
      const pct = Math.min(Math.max(value, 0), 100);
      return circumference * (1 - pct / 100);
    },
  },
};
</script>

<style scoped>
.weekday-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 4px 4px;
}

.day-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 12px 2px;
  border-radius: 12px;
  transition: background-color 0.2s ease;
  flex: 1;
  min-width: 0;
}

.day-column:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.day-column.active {
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.day-column.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.day-label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 2px;
  text-transform: capitalize;
}

.day-column.active .day-label {
  color: rgba(0, 0, 0, 0.7);
  font-weight: 600;
}

.ring-container {
  position: relative;
  width: 48px;
  height: 48px;
}

.rings-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-value {
  transition: stroke-dashoffset 0.5s ease;
}

.day-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.day-skipped {
  position: absolute;
  top: 2px;
  right: 2px;
  bottom: 2px;
  left: 2px;
  border-radius: 50%;
  background: #fff3e0;
  color: #e68900;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.day-skipped .rn-mi {
  font-size: 15px;
}

.day-column.active .day-number {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
}

/*
  The compact (Routine Focus header) form. Seven 38px cells at a 40px pitch with
  10px labels and 11px numbers — the same figures on iPad and desktop. The full
  form's 11px/14px type belongs to the legacy dashboard's 48px strip, and reading
  it into the header stretched every cell to 50px.
*/
.weekday-selector--compact {
  justify-content: center;
  gap: 2px;
  padding: 0;
}

.weekday-selector--compact .day-column {
  padding: 3px 0;
}

.weekday-selector--compact .day-label {
  font-size: 10px;
}

.weekday-selector--compact .day-number {
  font-size: 11px;
}

/* Mobile: smaller rings */
@media (max-width: 600px) {
  .ring-container {
    width: 36px;
    height: 36px;
  }

  .day-label {
    font-size: 10px;
  }

  .day-number {
    font-size: 11px;
  }

  .day-column {
    padding: 8px 1px;
  }
}
</style>
