<template>
  <div class="circadian-cycle py-6" :style="{ height: size + 'px' }">
    <svg :width="size * 3" :height="size" viewBox="-50 -50 300 300">
      <!-- Background circles for time periods -->
      <circle cx="100" cy="100" r="90" fill="none" stroke="#eee" stroke-width="20" />
      <!-- Hour markers -->
      <g v-for="hour in 24" :key="hour">
        <!-- Hour lines -->
        <line
          :x1="getHourPosition(hour, 82).x"
          :y1="getHourPosition(hour, 82).y"
          :x2="getHourPosition(hour, 90).x"
          :y2="getHourPosition(hour, 90).y"
          stroke="white"
          stroke-width="1"
          :opacity="hour % 3 === 0 ? 0.8 : 0.4"
        />
        <!-- Hour numbers -->
        <text
          :x="getHourPosition(hour, 70).x"
          :y="getHourPosition(hour, 70).y"
          class="hour-label"
          text-anchor="middle"
          dominant-baseline="middle"
          :fill="hour % 6 === 0 ? 'white' : '#ccc'"
          :font-weight="hour % 6 === 0 ? 'bold' : 'normal'"
        >{{ hour.toString().padStart(2, '0') }}</text>
      </g>

      <!-- Morning arc (5:00-9:00) -->
      <path :d="describeArc(100, 100, 90, timeToAngle('05:00'), timeToAngle('09:00'))" fill="none" stroke="#FFB74D"
        stroke-width="20" class="time-period morning" />

      <!-- Work arc (9:00-19:00) -->
      <path :d="describeArc(100, 100, 90, timeToAngle('09:00'), timeToAngle('19:00'))" fill="none" stroke="#81C784"
        stroke-width="20" class="time-period work" />

      <!-- Night arc (19:00-5:00) -->
      <path :d="describeArc(100, 100, 90, timeToAngle('19:00'), timeToAngle('05:00'))" fill="none" stroke="#7986CB"
        stroke-width="20" class="time-period night" />

      <!-- Routine items markers and labels -->
      <g v-for="(item, index) in routineItems" :key="item.id">
        <path :d="getConnectionPath(item.time, index)" stroke="white" fill="none" stroke-width="1" opacity="0.6" />
        <circle :cx="getPointX(item.time)" :cy="getPointY(item.time)" r="4" fill="white" stroke="#333"
          stroke-width="2" />
        <text :x="getLabelX(item.time, index)" :y="getLabelY(item.time, index)" class="item-label"
          :text-anchor="getLabelAnchor(item.time)">{{ item.name }}</text>
      </g>

      <!-- Center count -->
      <g class="center-count">
        <circle cx="100" cy="100" r="40" fill="rgba(0,0,0,0.3)" />
        <text x="100" y="95" text-anchor="middle" class="count">{{ routineItems.length }}</text>
        <text x="100" y="115" text-anchor="middle" class="label">Items</text>
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  name: 'CircadianCycle',
  props: {
    routineItems: {
      type: Array,
      required: true,
      default: () => [],
    },
    size: {
      type: Number,
      default: 200,
    },
  },
  methods: {
    timeToAngle(time) {
      const [hours, minutes] = time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      return (totalMinutes / (24 * 60)) * 360 - 90; // -90 to start at 12 o'clock
    },

    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    },

    describeArc(x, y, radius, startAngle, endAngle) {
      const start = this.polarToCartesian(x, y, radius, endAngle);
      const end = this.polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
      return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      ].join(' ');
    },

    describePeriodLabelArc(x, y, radius, startAngle, endAngle) {
      // Position label outside the time period arc
      const labelRadius = radius + 20;
      const start = this.polarToCartesian(x, y, labelRadius, startAngle);
      const end = this.polarToCartesian(x, y, labelRadius, endAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
      return [
        'M', start.x, start.y,
        'A', labelRadius, labelRadius, 0, largeArcFlag, 0, end.x, end.y,
      ].join(' ');
    },

    getHourMarkerStart(hour) {
      const angle = (hour / 24) * 360 - 90;
      return this.polarToCartesian(100, 100, 70, angle);
    },

    getHourMarkerEnd(hour) {
      const angle = (hour / 24) * 360 - 90;
      return this.polarToCartesian(100, 100, 80, angle);
    },

    getHourLabelPosition(hour) {
      const angle = (hour / 24) * 360 - 90;
      return this.polarToCartesian(100, 100, 75, angle);
    },

    getHourLabelAnchor(hour) {
      const angle = (hour / 24) * 360 - 90;
      return angle > 90 && angle < 270 ? 'end' : 'start';
    },

    formatHour(hour) {
      return hour.toString().padStart(2, '0');
    },

    getPointX(time) {
      const angle = this.timeToAngle(time);
      return this.polarToCartesian(100, 100, 90, angle).x;
    },

    getPointY(time) {
      const angle = this.timeToAngle(time);
      return this.polarToCartesian(100, 100, 90, angle).y;
    },

    getLabelX(time, index) {
      const angle = this.timeToAngle(time);
      const point = this.polarToCartesian(100, 100, 140 + (index % 2) * 20, angle);
      return point.x;
    },

    getLabelY(time, index) {
      const angle = this.timeToAngle(time);
      const point = this.polarToCartesian(100, 100, 140 + (index % 2) * 20, angle);
      return point.y;
    },

    getLabelAnchor(time) {
      const angle = this.timeToAngle(time);
      return angle > 90 && angle < 270 ? 'end' : 'start';
    },

    getConnectionPath(time, index) {
      const x1 = this.getPointX(time);
      const y1 = this.getPointY(time);
      const x2 = this.getLabelX(time, index);
      const y2 = this.getLabelY(time, index);

      return `M ${x1} ${y1} L ${x2} ${y2}`;
    },

    getHourPosition(hour, radius) {
      const angle = (hour / 24) * 360 - 90; // -90 to start at 12 o'clock
      return this.polarToCartesian(100, 100, radius, angle);
    },
  },
};
</script>

<style scoped>
.circadian-cycle {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.count {
  font-size: 24px;
  font-weight: bold;
  fill: white;
}

.label {
  font-size: 14px;
  fill: white;
  opacity: 0.8;
}

.hour-label {
  font-size: 11px;
  font-family: 'Arial', sans-serif;
  pointer-events: none; /* Prevent hovering interference */
  fill: white;
  opacity: 0.6;
}

.item-label {
  font-size: 11px;
  fill: white;
  opacity: 0.9;
}

.clock-label {
  font-size: 14px;
  font-weight: bold;
  fill: white;
  opacity: 0.8;
}

.time-period {
  transition: opacity 0.3s;
}

.time-period:hover {
  opacity: 0.8;
  cursor: pointer;
}
</style>
