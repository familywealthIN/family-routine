<template>
  <!--
    One member's week: three stat tiles and a routines x days grid.

    The grid's three cell states come from `utils/groupModel.weekCell`. The one
    that matters is `later` — a routine today whose time has not arrived is drawn
    transparent with a dashed ring, NEVER as a miss, because nobody has failed a
    routine that has not started.

    On phone the page puts this inside a ResponsiveSheet; on tablet and desktop it
    sits permanently beside the list, where it carries no close affordance (the
    mock leaves its close icon `visibility:hidden` — so it is simply omitted).
  -->
  <section class="rn-gmweek" data-testid="group-member-week">
    <header class="rn-gmweek__head">
      <div class="rn-gmweek__avatar" :style="{ background: color }">
        <img
          v-if="picture"
          class="rn-gmweek__avatar-img"
          :src="picture"
          :alt="name"
          @error="onImageError"
        />
        <template v-else>{{ glyph }}</template>
      </div>
      <div class="rn-gmweek__id">
        <div class="rn-gmweek__name">{{ name }}</div>
        <div class="rn-gmweek__sub">{{ email }} · {{ streak }}-day streak</div>
      </div>
      <button
        v-if="closable"
        type="button"
        class="rn-gmweek__close"
        aria-label="Close"
        data-testid="group-member-week-close"
        @click="$emit('close')"
      >
        <i class="rn-mi">close</i>
      </button>
    </header>

    <div class="rn-gmweek__stats">
      <div v-for="stat in stats" :key="stat.key" class="rn-gmweek__stat">
        <div class="rn-gmweek__stat-key">{{ stat.key }}</div>
        <div class="rn-gmweek__stat-value">{{ stat.value }}</div>
      </div>
    </div>

    <div class="rn-gmweek__legend-row">
      <div class="rn-gmweek__eyebrow">THIS WEEK · ROUTINES × DAYS</div>
      <div class="rn-gmweek__legend">
        <span class="rn-gmweek__legend-item">
          <span class="rn-gmweek__swatch rn-gmweek__swatch--done"></span>ticked
        </span>
        <span class="rn-gmweek__legend-item">
          <span class="rn-gmweek__swatch rn-gmweek__swatch--missed"></span>missed
        </span>
        <span class="rn-gmweek__legend-item">
          <span class="rn-gmweek__swatch rn-gmweek__swatch--later"></span>later today
        </span>
      </div>
    </div>

    <p v-if="!rows.length" class="rn-gmweek__empty" data-testid="group-member-week-empty">
      {{ emptyText }}
    </p>

    <div v-else class="rn-gmweek__grid" :style="gridStyle" data-testid="group-member-week-grid">
      <div></div>
      <div
        v-for="head in dayHeads"
        :key="head.key"
        class="rn-gmweek__day-head"
        :style="{ color: head.color }"
      >
        {{ head.label }}
      </div>

      <template v-for="row in rows">
        <div :key="`${row.key}-label`" class="rn-gmweek__row-label">
          <div class="rn-gmweek__row-time">{{ row.time }}</div>
          <div class="rn-gmweek__row-name">{{ row.name }}</div>
        </div>
        <div
          v-for="cell in row.cells"
          :key="cell.key"
          class="rn-gmweek__cell"
          :class="`rn-gmweek__cell--${cell.state}`"
          :data-state="cell.state"
          :title="cell.title"
          :style="{ background: cell.bg, boxShadow: cell.ring }"
        >
          <i v-if="cell.icon" class="rn-mi rn-gmweek__cell-icon">{{ cell.icon }}</i>
        </div>
      </template>

      <div class="rn-gmweek__total-label">DAY SCORE</div>
      <div
        v-for="total in dayTotals"
        :key="`${total.key}-total`"
        class="rn-gmweek__total"
        :style="{ color: total.color }"
      >
        {{ total.value }}
      </div>
    </div>
  </section>
</template>

<script>
import { initials } from '../../constants/groups';

export default {
  name: 'OrganismGroupMemberWeek',
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    picture: { type: String, default: '' },
    color: { type: String, default: '#288bd5' },
    streak: { type: Number, default: 0 },
    weekAverage: { type: Number, default: 0 },
    todayScore: { type: Number, default: 0 },
    /** `{ key, label, isToday, color }` per column, from `weekGrid`. */
    dayHeads: { type: Array, default: () => [] },
    /** `{ key, name, time, cells }` per routine, from `weekGrid`. */
    rows: { type: Array, default: () => [] },
    /** `{ key, value, color }` per column — the DAY SCORE row. */
    dayTotals: { type: Array, default: () => [] },
    /** This is the signed-in user's own week — the copy speaks to "you". */
    you: { type: Boolean, default: false },
    /** Phone sheet only. Tablet/desktop keep the panel open, so: no close. */
    closable: { type: Boolean, default: false },
  },
  computed: {
    emptyText() {
      return this.you
        ? 'No routine history yet — your week fills in once you log a day.'
        : 'No routine history yet — check back once they have logged a day.';
    },
    glyph() {
      return initials(this.name || this.email);
    },
    stats() {
      return [
        { key: 'THIS WEEK', value: `${this.weekAverage}%` },
        { key: 'TODAY', value: `${this.todayScore}%` },
        { key: 'STREAK', value: `${this.streak} days` },
      ];
    },
    gridStyle() {
      return { gridTemplateColumns: `104px repeat(${this.dayHeads.length || 7}, minmax(0, 1fr))` };
    },
  },
  methods: {
    onImageError(event) {
      event.target.style.display = 'none';
    },
  },
};
</script>

<style>
.rn-gmweek {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-gmweek__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 12px;
}

.rn-gmweek__avatar {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.rn-gmweek__avatar-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rn-gmweek__id {
  flex: 1;
  min-width: 0;
}

.rn-gmweek__name {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.rn-gmweek__sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-gmweek__close {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-gmweek__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.rn-gmweek__stat {
  padding: 10px 12px;
  border-radius: 12px;
  background: #f7f7f7;
}

.rn-gmweek__stat-key {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-gmweek__stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 2px;
}

.rn-gmweek__legend-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 18px;
}

.rn-gmweek__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-gmweek__legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
  flex-wrap: wrap;
}

.rn-gmweek__legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rn-gmweek__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.rn-gmweek__swatch--done {
  background: #4CAF50;
}

.rn-gmweek__swatch--missed {
  background: rgba(0, 0, 0, .1);
}

.rn-gmweek__swatch--later {
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .25);
}

.rn-gmweek__empty {
  margin: 12px 0 0;
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
}

.rn-gmweek__grid {
  display: grid;
  gap: 4px;
  margin-top: 10px;
  align-items: center;
}

.rn-gmweek__day-head {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
}

.rn-gmweek__row-label {
  min-width: 0;
  padding-right: 4px;
  line-height: 1.2;
}

.rn-gmweek__row-time {
  font-size: 10px;
  font-weight: 600;
  color: rgba(0, 0, 0, .4);
  font-variant-numeric: tabular-nums;
}

.rn-gmweek__row-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-gmweek__cell {
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* "later today" — a dashed outline, never the missed grey. box-sizing keeps the
   26px row height identical to the ringed cells beside it. */
.rn-gmweek__cell--later {
  border: 1px dashed rgba(0, 0, 0, .28);
  box-sizing: border-box;
}

.rn-gmweek__cell-icon {
  font-size: 14px;
}

.rn-gmweek__total-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, .45);
  padding-top: 4px;
}

.rn-gmweek__total {
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  padding-top: 4px;
}
</style>
