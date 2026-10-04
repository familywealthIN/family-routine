<template>
  <!--
    One quadrant's items, grouped by routine in time order with a trailing
    "No routine" bucket; the routine whose window contains now carries the
    orange NOW badge (Priority.dc.html — the same grouping every list on every
    screen uses).

    Rows carry at most one chip, decided by `chipFor(item)` in
    constants/priority.js so the DELEGATE and AUTOMATE state machines are a pure
    function of the row and cannot disagree between the phone list and the four
    quadrant cards.

    NOT the old `PriorityGoalList`: that one is a Vuetify `v-list` with no
    routine grouping, no NOW badge and no chips, and it is still the Goals-page
    day drawer's list — so this is a second, additive molecule rather than a
    rewrite of a shared one.
  -->
  <div :key="seq" class="rn-plist" data-testid="priority-task-list">
    <div v-for="group in groups" :key="group.key" class="rn-plist__group">
      <div class="rn-plist__group-head">
        <div class="rn-plist__time" :style="{ color: group.isNow ? '#e68900' : 'rgba(0,0,0,.5)' }">
          {{ group.time }}
        </div>
        <div class="rn-plist__group-name">{{ group.name }}</div>
        <div v-if="group.isNow" class="rn-plist__now" data-testid="priority-now-badge">NOW</div>
        <div class="rn-plist__rule"></div>
      </div>

      <div
        v-for="row in group.rows"
        :key="row.id"
        class="rn-plist__row"
        :data-testid="`priority-row-${row.id}`"
      >
        <i
          class="rn-mi rn-plist__box"
          :style="{ color: row.isComplete ? color : 'rgba(0,0,0,.54)' }"
          :data-testid="`priority-toggle-${row.id}`"
          role="button"
          @click="$emit('toggle', row)"
        >{{ row.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>

        <div class="rn-plist__main">
          <div
            class="rn-plist__body"
            :style="bodyStyle(row)"
            @click="$emit('open', row)"
          >{{ row.body }}</div>
          <div v-if="row.meta" class="rn-plist__meta">{{ row.meta }}</div>

          <div
            v-if="chip(row)"
            class="rn-plist__chip"
            :style="chipStyle(row)"
            :data-testid="`priority-chip-${row.id}`"
            @click="onChip(row)"
          >
            <span v-if="chip(row).pulse" class="rn-plist__dot" data-testid="priority-chip-dot"></span>
            <i class="rn-mi rn-plist__chip-icon">{{ chip(row).icon }}</i>
            <span>{{ chip(row).label }}</span>
          </div>
        </div>

        <i
          class="rn-mi rn-plist__move"
          title="Move to another quadrant"
          :data-testid="`priority-move-${row.id}`"
          role="button"
          @click="$emit('move', row)"
        >open_with</i>
      </div>
    </div>

    <div v-if="!groups.length" class="rn-plist__empty" data-testid="priority-list-empty">
      {{ emptyText }}
    </div>
  </div>
</template>

<script>
import { chipFor } from '../../constants/priority';

export default {
  name: 'MoleculePriorityTaskList',
  props: {
    /** [{ key, time, name, isNow, rows: [item] }] — already in render order. */
    groups: { type: Array, default: () => [] },
    /** The owning quadrant's colour — a ticked checkbox takes it. */
    color: { type: String, default: '#288bd5' },
    emptyText: { type: String, default: 'Nothing here' },
    /** Bumped to replay the list entrance when the selected quadrant changes. */
    seq: { type: Number, default: 0 },
  },
  methods: {
    chip(row) {
      return chipFor(row);
    },
    bodyStyle(row) {
      return {
        textDecoration: row.isComplete ? 'line-through' : 'none',
        color: row.isComplete ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.87)',
      };
    },
    chipStyle(row) {
      const chip = this.chip(row);
      return {
        background: chip.bg,
        color: chip.color,
        border: `1px solid ${chip.border}`,
        cursor: chip.clickable ? 'pointer' : 'default',
      };
    },
    onChip(row) {
      const chip = this.chip(row);
      if (!chip || !chip.clickable) return;
      this.$emit('action', { item: row, type: chip.type });
    },
  },
};
</script>

<style>
.rn-plist__group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0 2px;
}

.rn-plist__time {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rn-plist__group-name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .4px;
  text-transform: uppercase;
  color: rgba(0, 0, 0, .55);
}

.rn-plist__now {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 152, 0, .14);
  color: #e68900;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .4px;
}

.rn-plist__rule {
  flex: 1;
  height: 1px;
  background: rgba(0, 0, 0, .06);
}

.rn-plist__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  min-height: 44px;
}

.rn-plist__box {
  font-size: 28px;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-plist__main {
  flex: 1;
  min-width: 0;
  padding-top: 3px;
}

.rn-plist__body {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
  cursor: pointer;
}

.rn-plist__meta {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.rn-plist__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  margin-top: 8px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  box-sizing: border-box;
}

/* The mid-run pulse — chassis.md § Motion pins it to `rn-pulse 1s infinite`. */
.rn-plist__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1976d2;
  flex-shrink: 0;
  animation: rn-pulse 1s ease-in-out infinite;
}

.rn-plist__chip-icon {
  font-size: 16px;
}

.rn-plist__move {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 20px;
  color: rgba(0, 0, 0, .4);
  cursor: pointer;
}

.rn-plist__move:hover {
  background: rgba(0, 0, 0, .05);
}

.rn-plist__empty {
  padding: 20px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, .45);
}
</style>
