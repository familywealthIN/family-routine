<template>
  <div class="circadian-cycle py-6" :style="{ height: size + 'px' }"> <svg :width="size * 3" :height="size"
      viewBox="-50 -50 300 300"> <!-- Gradient definitions for beautiful backgrounds -->
      <defs>
        <linearGradient id="morningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFF3E0;stop-opacity:0.6" />
          <stop offset="50%" style="stop-color:#FFE0B2;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#FFB74D;stop-opacity:0.6" />
        </linearGradient>
        <linearGradient id="workGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E8F5E8;stop-opacity:0.5" />
          <stop offset="50%" style="stop-color:#C8E6C9;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#81C784;stop-opacity:0.5" />
        </linearGradient>
        <linearGradient id="nightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E8EAF6;stop-opacity:0.6" />
          <stop offset="50%" style="stop-color:#C5CAE9;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#7986CB;stop-opacity:0.6" />
        </linearGradient>
        <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1A237E;stop-opacity:0.4" />
          <stop offset="25%" style="stop-color:#3F51B5;stop-opacity:0.3" />
          <stop offset="50%" style="stop-color:#9C27B0;stop-opacity:0.2" />
          <stop offset="75%" style="stop-color:#E91E63;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#FF5722;stop-opacity:0.4" />
        </linearGradient>
        <!-- Arc-specific gradients that follow the circular path -->
        <linearGradient id="morningArcGradient" gradientUnits="userSpaceOnUse" x1="134" y1="66" x2="166" y2="134">
          <stop offset="0%" style="stop-color:#FFD54F;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FF8F00;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="workArcGradient" gradientUnits="userSpaceOnUse" x1="166" y1="66" x2="34" y2="134">
          <stop offset="0%" style="stop-color:#A5D6A7;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#81C784;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#66BB6A;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="nightArcGradient" gradientUnits="userSpaceOnUse" x1="34" y1="134" x2="134" y2="66">
          <stop offset="0%" style="stop-color:#9FA8DA;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#7986CB;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#5C6BC0;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background circle with gradient --> <!-- Background circle with beautiful gradient layers -->
      <circle cx="100" cy="100" r="95" fill="url(#backgroundGradient)" stroke="none" />

      <!-- Additional gradient background layers for depth and beauty -->
      <circle cx="100" cy="100" r="92" fill="url(#morningGradient)" opacity="0.3" stroke="none" />
      <circle cx="100" cy="100" r="89" fill="url(#workGradient)" opacity="0.2" stroke="none" />
      <circle cx="100" cy="100" r="86" fill="url(#nightGradient)" opacity="0.3" stroke="none" />
      <!-- Background circles for time periods -->
      <circle cx="100" cy="100" r="90" fill="none" stroke="#eee" stroke-width="2" opacity="0.3" />

      <!-- Circadian cycle icons positioned at their proper 24-hour regions -->
      <!-- Sun icon for morning (5:00-9:00, positioned at 7:00) -->
      <g transform="translate(225, 125)">
        <circle cx="0" cy="0" r="16" fill="#FFD54F" opacity="1" stroke="#FF8F00" stroke-width="2" />
        <circle cx="0" cy="0" r="12" fill="#FFC107" opacity="1" />
        <g stroke="#FF8F00" stroke-width="3" opacity="1">
          <line x1="-24" y1="0" x2="-20" y2="0" />
          <line x1="20" y1="0" x2="24" y2="0" />
          <line x1="0" y1="-24" x2="0" y2="-20" />
          <line x1="0" y1="20" x2="0" y2="24" />
          <line x1="-17" y1="-17" x2="-14" y2="-14" />
          <line x1="14" y1="-14" x2="17" y2="-17" />
          <line x1="-17" y1="17" x2="-14" y2="14" />
          <line x1="14" y1="14" x2="17" y2="17" />
        </g>
        <text x="0" y="45" text-anchor="middle" class="icon-label">Morning</text>
      </g>

      <!-- Work/laptop icon for work time (9:00-17:00, positioned at 13:00) -->
      <g transform="translate(10, 190)">
        <rect x="-10" y="-6" width="20" height="12" rx="2" fill="#37474F" opacity="1" stroke="#263238"
          stroke-width="2" />
        <rect x="-12" y="6" width="24" height="2" rx="1" fill="#263238" opacity="1" />
        <rect x="-8" y="-4" width="16" height="8" fill="#1A1A1A" opacity="1" />
        <line x1="-6" y1="-2" x2="6" y2="-2" stroke="#4CAF50" stroke-width="1.5" opacity="1" />
        <line x1="-6" y1="0" x2="3" y2="0" stroke="#4CAF50" stroke-width="1.5" opacity="1" />
        <line x1="-6" y1="2" x2="4" y2="2" stroke="#4CAF50" stroke-width="1.5" opacity="1" />
        <rect x="-2" y="4" width="4" height="1" fill="#666" opacity="1" />
        <text x="0" y="35" text-anchor="middle" class="icon-label">Work</text>
      </g>

      <!-- Moon icon for night (17:00-5:00, positioned at 24:00/0:00 - top of circle) -->
      <g transform="translate(180, -30)">
        <circle cx="0" cy="0" r="18" fill="#1A237E" opacity="0.8" />
        <path d="M -12 -12 A 16 16 0 1 1 -12 12 A 12 12 0 1 0 -12 -12 Z" fill="#E1F5FE" opacity="1" stroke="#81C784"
          stroke-width="2" />
        <circle cx="-15" cy="-6" r="2" fill="#FFFFFF" opacity="1" />
        <circle cx="-8" cy="-14" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <circle cx="-18" cy="4" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <circle cx="-5" cy="8" r="1" fill="#FFFFFF" opacity="0.6" />
        <circle cx="-12" cy="12" r="1" fill="#FFFFFF" opacity="0.6" />
        <text x="0" y="45" text-anchor="middle" class="icon-label">Night</text>
      </g>

      <!-- Hour markers with enhanced styling -->
      <g v-for="hour in 24" :key="hour">
        <!-- Hour lines -->
        <line :x1="getHourPosition(hour, 82).x" :y1="getHourPosition(hour, 82).y" :x2="getHourPosition(hour, 90).x"
          :y2="getHourPosition(hour, 90).y" :stroke="getHourMarkerColor(hour)" :stroke-width="hour % 6 === 0 ? 2 : 1"
          :opacity="hour % 3 === 0 ? 0.9 : 0.5" />
        <!-- Hour numbers with enhanced styling -->
        <text :x="getHourPosition(hour, 70).x" :y="getHourPosition(hour, 70).y" class="hour-label" text-anchor="middle"
          dominant-baseline="middle" :fill="getHourLabelColor(hour)" :font-weight="hour % 6 === 0 ? 'bold' : 'normal'"
          :font-size="hour % 6 === 0 ? '12' : '10'">{{ hour.toString().padStart(2, '0') }}</text>
      </g> <!-- Morning arc (5:00-9:00) with solid color -->
      <path :d="describeArc(100, 100, 90, timeToAngle('05:00'), timeToAngle('09:00'))" fill="none" stroke="#FFB74D"
        stroke-width="20" class="time-period morning" />

      <!-- Work arc (9:00-19:00) with solid color -->
      <path :d="describeArc(100, 100, 90, timeToAngle('09:00'), timeToAngle('19:00'))" fill="none" stroke="#81C784"
        stroke-width="20" class="time-period work" />

      <!-- Night arc (19:00-5:00) with solid color -->
      <path :d="describeArc(100, 100, 90, timeToAngle('19:00'), timeToAngle('05:00'))" fill="none" stroke="#7986CB"
        stroke-width="20" class="time-period night" />

      <!-- Routine items markers and labels -->
      <g v-for="(item, index) in routineItems" :key="item.id">
        <path :d="getConnectionPath(item.time, index)" stroke="white" fill="none" stroke-width="1" opacity="0.6" />
        <circle :cx="getPointX(item.time)" :cy="getPointY(item.time)" r="4" fill="white" stroke="#333"
          stroke-width="2" />
        <text :x="getLabelX(item.time, index)" :y="getLabelY(item.time, index)" class="item-label"
          :text-anchor="getLabelAnchor(item.time)">{{ item.name }}</text>
      </g> <!-- Center count with enhanced styling -->
      <g class="center-count">
        <circle cx="100" cy="100" r="40" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
        <circle cx="100" cy="100" r="35" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
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

    getHourMarkerColor(hour) {
      // Special colors for key hours
      if (hour === 6 || hour === 7) return '#FFB74D'; // Morning hours
      if (hour === 12 || hour === 18) return '#81C784'; // Key work hours
      if (hour === 0 || hour === 22 || hour === 23) return '#7986CB'; // Night hours
      return 'white'; // Default
    },

    getHourLabelColor(hour) {
      // Enhanced color scheme for better visibility
      if (hour % 6 === 0) return 'white'; // Major hours
      if (hour === 6 || hour === 7) return '#FFB74D'; // Morning
      if (hour === 12 || hour === 18) return '#81C784'; // Work
      if (hour === 22 || hour === 23) return '#7986CB'; // Night
      return '#ccc'; // Default
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
  background: linear-gradient(135deg, rgba(26, 35, 126, 0.05) 0%, rgba(63, 81, 181, 0.02) 50%, rgba(156, 39, 176, 0.05) 100%);
  border-radius: 50%;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
}

.count {
  font-size: 28px;
  font-weight: bold;
  fill: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.label {
  font-size: 12px;
  fill: white;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.hour-label {
  font-size: 11px;
  font-family: 'Arial', sans-serif;
  pointer-events: none;
  /* Prevent hovering interference */
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
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.time-period:hover {
  opacity: 0.9;
  cursor: pointer;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transform: scale(1.02);
}

.period-labels {
  pointer-events: none;
}

.period-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: opacity 0.3s ease;
}

.morning-label {
  fill: #FF8F00;
}

.work-label {
  fill: #388E3C;
}

.night-label {
  fill: #3949AB;
}

.icon-label {
  font-size: 11px;
  font-weight: 600;
  fill: white;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
</style>
