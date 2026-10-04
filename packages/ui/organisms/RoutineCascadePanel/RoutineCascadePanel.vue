<template>
  <!--
    Week / Month / Year panel shown inside the focus card when a cascade tab is
    active. One goal, its unit grid, and what it rolls up into.

    The thresholds it counts against are the real ones from
    `utils/getDates.js → threshold` (week 5 days, month 3 weeks, year 6 months),
    which is also what the server's autoCheckTaskPeriod uses — so "4 / 5 days ·
    Active" is the same arithmetic that will auto-tick the parent.
  -->
  <div v-if="cascade" class="rn-cascade">
    <div class="rn-cascade__head">
      <i class="rn-mi rn-cascade__status-icon" :style="{ color: cascade.statusColor }">
        {{ cascade.complete ? 'check_circle' : 'radio_button_checked' }}
      </i>
      <div class="rn-cascade__head-text">
        <div class="rn-cascade__title">{{ cascade.title }}</div>
        <div class="rn-cascade__range">{{ cascade.range }}</div>
      </div>
    </div>

    <div class="rn-cascade__counts">
      <div class="rn-cascade__count">
        <b>{{ cascade.done }}</b> / {{ cascade.threshold }} {{ cascade.unitName }} ·
        <span :style="{ color: cascade.statusColor, fontWeight: 600 }">{{ cascade.statusLabel }}</span>
      </div>
      <div class="rn-cascade__rule">{{ cascade.rule }}</div>
    </div>

    <div class="rn-cascade__bar">
      <div
        class="rn-cascade__bar-fill"
        :style="{ width: `${cascade.pct}%`, background: cascade.statusColor }"
      ></div>
    </div>

    <div class="rn-cascade__grid" :style="{ gridTemplateColumns: gridColumns }">
      <div
        v-for="(unit, i) in cascade.units"
        :key="`u-${i}-${unit.label}`"
        class="rn-cascade__unit"
        :style="{ background: unit.bg }"
      >
        <i class="rn-mi rn-cascade__unit-icon" :style="{ color: unit.color }">{{ unit.icon }}</i>
        <div
          class="rn-cascade__unit-label"
          :style="{ fontWeight: unit.state === 'active' ? 700 : 500, color: unit.fg }"
        >{{ unit.label }}</div>
        <div v-if="unit.sub" class="rn-cascade__unit-sub">{{ unit.sub }}</div>
      </div>
    </div>

    <template v-if="cascade.linked && cascade.linked.length">
      <div class="rn-cascade__linked-label">{{ cascade.linkedLabel }}</div>
      <div
        v-for="(linked, i) in cascade.linked"
        :key="`l-${i}-${linked.body}`"
        class="rn-cascade__linked"
      >
        <span class="rn-cascade__linked-tag">{{ linked.label }}</span>
        <span
          class="rn-cascade__linked-body"
          :style="{
            textDecoration: linked.isComplete ? 'line-through' : 'none',
            color: linked.isComplete ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.8)',
          }"
        >{{ linked.body }}</span>
      </div>
    </template>

    <div v-if="cascade.parent" class="rn-cascade__parent">{{ cascade.parent }}</div>
  </div>
  <div v-else class="rn-cascade__empty">
    No goal set for this period yet. Use Add task → Goal to set one.
  </div>
</template>

<script>
export default {
  name: 'OrganismRoutineCascadePanel',
  props: {
    /**
     * {
     *   title, range, unitName, done, threshold, complete, statusLabel,
     *   statusColor, pct, rule, parent, cols,
     *   units: [{ label, sub, state, icon, color, fg, bg }],
     *   linked: [{ label, body, isComplete }], linkedLabel
     * }
     * Built by the page from the real goal data — this organism only draws it.
     */
    cascade: { type: Object, default: null },
  },
  computed: {
    gridColumns() {
      const cols = (this.cascade && this.cascade.cols) || 7;
      return `repeat(${cols}, minmax(0, 1fr))`;
    },
  },
};
</script>

<style>
.rn-cascade {
  padding-top: 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-cascade__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.rn-cascade__status-icon {
  font-size: 20px;
  margin-top: 1px;
}

.rn-cascade__head-text {
  flex: 1;
  min-width: 0;
}

.rn-cascade__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.rn-cascade__range {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin-top: 2px;
}

.rn-cascade__counts {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
}

.rn-cascade__count {
  white-space: nowrap;
}

.rn-cascade__count b {
  color: rgba(0, 0, 0, .87);
}

.rn-cascade__rule {
  font-size: 10px;
  color: rgba(0, 0, 0, .45);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-cascade__bar {
  height: 6px;
  border-radius: 3px;
  background: #eee;
  overflow: hidden;
  margin-top: 6px;
}

.rn-cascade__bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .4s;
}

.rn-cascade__grid {
  display: grid;
  gap: 2px;
  margin-top: 10px;
}

.rn-cascade__unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 0;
  border-radius: 8px;
  min-width: 0;
}

.rn-cascade__unit-icon {
  font-size: 16px;
}

.rn-cascade__unit-label {
  font-size: 9px;
}

.rn-cascade__unit-sub {
  font-size: 8px;
  color: rgba(0, 0, 0, .4);
}

.rn-cascade__linked-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  margin-top: 12px;
  text-transform: uppercase;
}

.rn-cascade__linked {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.rn-cascade__linked-tag {
  flex-shrink: 0;
  min-width: 34px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 0, 0, .45);
  text-transform: uppercase;
}

.rn-cascade__linked-body {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-cascade__parent {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
  margin-top: 10px;
  padding-bottom: 8px;
}

.rn-cascade__empty {
  padding: 24px 0;
  font-size: 13px;
  color: rgba(0, 0, 0, .45);
  text-align: center;
}
</style>
