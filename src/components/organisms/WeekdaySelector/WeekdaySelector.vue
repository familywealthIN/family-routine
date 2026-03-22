<template>
  <div class="weekday-selector">
    <div
      v-for="(weekDay, i) in weekDays"
      :key="weekDay.day"
      @click="!isLoading && handleDateSelect(i)"
      :class="['day-column', { active: weekDay.isActive, disabled: isLoading }]"
    >
      <div class="day-label">{{ weekDay.day }}</div>
      <div class="ring-container">
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
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment';

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
    };
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

.day-column.active .day-number {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
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
