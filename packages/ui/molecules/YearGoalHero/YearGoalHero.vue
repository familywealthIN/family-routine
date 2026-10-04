<template>
  <!--
    The hero: ring + title + status chip + ONE rule line, and on the phone the
    routine chip, the ‹ › goal steppers and the collapsible "ABOUT THIS GOAL".

    The rule line is the whole of what used to be an info alert listing all three
    thresholds. It has exactly two states — "Auto-ticked by {n} month goals" when
    the year is done, "Ticks after {n} month goals · {n} to go" when it is not.
  -->
  <div class="rn-ygh" :class="`rn-ygh--${shell}`" data-testid="year-goal-hero">
    <div class="rn-ygh__top">
      <button
        v-if="shell === 'phone' && steppable"
        type="button"
        class="rn-ygh__step"
        :style="{ opacity: hasPrev ? 1 : 0.3 }"
        title="Previous year goal"
        data-testid="year-goal-prev"
        @click="$emit('step', -1)"
      ><i class="rn-mi">chevron_left</i></button>

      <progress-ring
        :key="`ring-${goal.id}`"
        class="rn-ygh__ring"
        :size="ringSize"
        :view-box="96"
        :r="42"
        :stroke="ringStroke"
        :value="goal.percent"
        :color="goal.ringColor"
        track-color="rgba(0,0,0,.06)"
        transition="stroke-dashoffset .6s cubic-bezier(.3,1.3,.5,1), stroke .3s"
      >
        <div class="rn-ygh__ring-text">
          <div
            class="rn-ygh__pct"
            :style="{ color: goal.ringColor, fontSize: `${pctSize}px` }"
            data-testid="year-goal-percent"
          >{{ goal.percent }}%</div>
          <div class="rn-ygh__count" data-testid="year-goal-count">
            {{ goal.monthsDone }}/{{ yearThreshold }} months
          </div>
        </div>
      </progress-ring>

      <button
        v-if="shell === 'phone' && steppable"
        type="button"
        class="rn-ygh__step"
        :style="{ opacity: hasNext ? 1 : 0.3 }"
        title="Next year goal"
        data-testid="year-goal-next"
        @click="$emit('step', 1)"
      ><i class="rn-mi">chevron_right</i></button>

      <!-- Tablet / desktop put the title beside the ring instead of under it. -->
      <div v-if="shell !== 'phone'" class="rn-ygh__side">
        <div class="rn-ygh__eyebrow">
          <span>{{ eyebrow }}</span>
          <span v-if="indexLabel" class="rn-ygh__index">{{ indexLabel }}</span>
        </div>
        <div class="rn-ygh__title" data-testid="year-goal-title">{{ goal.body }}</div>
        <div class="rn-ygh__meta">
          <span
            class="rn-ygh__chip"
            :style="{ background: goal.status.bg, color: goal.status.chipColor }"
            data-testid="year-goal-status"
          >{{ goal.status.label }}</span>
          <span class="rn-ygh__rule" data-testid="year-goal-rule">{{ goal.rule }}</span>
        </div>
      </div>

      <!--
        Tablet and desktop draw the 12-month strip inside this same card, to the
        right of a hairline. The strip is passed in rather than imported so the
        hero stays one job: the goal's headline numbers.
      -->
      <template v-if="shell !== 'phone' && $slots.strip">
        <div class="rn-ygh__divider"></div>
        <div class="rn-ygh__strip"><slot name="strip"></slot></div>
      </template>
    </div>

    <template v-if="shell === 'phone'">
      <button
        type="button"
        class="rn-ygh__routine"
        data-testid="year-goal-routine-chip"
        @click="$emit('open-switcher')"
      >
        <i class="rn-mi rn-ygh__routine-icon">history</i>
        <b>{{ goal.routineName || 'No routine linked' }}</b>
        <span v-if="indexLabel" class="rn-ygh__routine-dot">·</span>
        <span v-if="indexLabel">{{ indexLabel }}</span>
        <i class="rn-mi rn-ygh__routine-more">unfold_more</i>
      </button>

      <div class="rn-ygh__title rn-ygh__title--phone" data-testid="year-goal-title">{{ goal.body }}</div>

      <div class="rn-ygh__meta rn-ygh__meta--phone">
        <span
          class="rn-ygh__chip"
          :style="{ background: goal.status.bg, color: goal.status.chipColor }"
          data-testid="year-goal-status"
        >{{ goal.status.label }} · {{ goal.year }}</span>
        <span class="rn-ygh__rule" data-testid="year-goal-rule">{{ goal.rule }}</span>
      </div>

      <div class="rn-ygh__about" @click="$emit('toggle-about')">
        <div class="rn-ygh__about-head">
          <span>ABOUT THIS GOAL</span>
          <i class="rn-mi rn-ygh__about-chev">{{ aboutOpen ? 'expand_less' : 'expand_more' }}</i>
        </div>
        <div v-if="aboutOpen" class="rn-ygh__about-body" data-testid="year-goal-about">
          <div v-for="(line, i) in goal.about" :key="i" class="rn-ygh__bullet">
            <span class="rn-ygh__dot"></span>
            <span>{{ line }}</span>
          </div>
          <div v-if="!goal.about.length" class="rn-ygh__about-empty">
            No description yet. Add one when you edit this goal.
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';

/** Year hero ring sizes per shell — chassis.md § Rings (120 / 80 / 100, r42). */
const RING = {
  phone: { size: 120, stroke: 7, pct: 28 },
  tablet: { size: 80, stroke: 8, pct: 19 },
  desktop: { size: 100, stroke: 8, pct: 24 },
};

export default {
  name: 'MoleculeYearGoalHero',
  components: { ProgressRing },
  props: {
    /**
     * `utils/yearGoalModel.buildYearGoal()` output. A view-model, not a server
     * payload — this component does no arithmetic of its own, which is why the
     * 83% rounding can be pinned by a unit test on the model instead of here.
     */
    goal: { type: Object, required: true },
    shell: { type: String, default: 'phone' },
    /** `TH.year`, passed in so the copy never hardcodes a second 6. */
    yearThreshold: { type: Number, default: 6 },
    /** "3 of 7" — omitted when there is only one year goal. */
    indexLabel: { type: String, default: '' },
    hasPrev: { type: Boolean, default: false },
    hasNext: { type: Boolean, default: false },
    aboutOpen: { type: Boolean, default: false },
  },
  computed: {
    steppable() {
      return this.hasPrev || this.hasNext;
    },
    ringSize() {
      return (RING[this.shell] || RING.phone).size;
    },
    ringStroke() {
      return (RING[this.shell] || RING.phone).stroke;
    },
    pctSize() {
      return (RING[this.shell] || RING.phone).pct;
    },
    eyebrow() {
      const routine = this.goal.routineName;
      return routine ? routine.toUpperCase() : `YEAR GOAL · ${this.goal.year}`;
    },
  },
};
</script>

<style>
.rn-ygh {
  background: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  box-sizing: border-box;
}

.rn-ygh--phone {
  border-radius: 16px;
  padding: 20px 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rn-ygh--tablet,
.rn-ygh--desktop {
  border-radius: 20px;
  padding: 14px 20px;
}

.rn-ygh__top {
  display: flex;
  align-items: center;
  gap: 18px;
}

.rn-ygh--tablet .rn-ygh__top,
.rn-ygh--desktop .rn-ygh__top {
  width: 100%;
}

.rn-ygh__step {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: #f4f4f4;
  color: rgba(0, 0, 0, .6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity .2s;
}

.rn-ygh__step .rn-mi {
  font-size: 22px;
}

.rn-ygh__ring-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rn-ygh__pct {
  font-weight: 700;
  line-height: 1;
}

.rn-ygh__count {
  font-size: 10px;
  color: rgba(0, 0, 0, .54);
  margin-top: 4px;
  white-space: nowrap;
}

.rn-ygh__side {
  min-width: 0;
  width: 220px;
  flex-shrink: 0;
}

.rn-ygh--desktop .rn-ygh__side {
  width: 260px;
}

.rn-ygh__divider {
  width: 1px;
  align-self: stretch;
  background: rgba(0, 0, 0, .06);
  flex-shrink: 0;
}

.rn-ygh__strip {
  flex: 1;
  min-width: 0;
}

.rn-ygh__eyebrow {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  white-space: nowrap;
}

.rn-ygh__index {
  font-weight: 400;
}

.rn-ygh__title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 2px;
}

.rn-ygh--desktop .rn-ygh__title {
  font-size: 22px;
}

.rn-ygh__title--phone {
  font-size: 22px;
  margin-top: 10px;
  text-align: center;
}

.rn-ygh__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.rn-ygh__meta--phone {
  margin-top: 8px;
  justify-content: center;
}

.rn-ygh__chip {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.rn-ygh__rule {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-ygh__routine {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  height: 26px;
  padding: 0 10px 0 8px;
  border: 0;
  border-radius: 13px;
  background: #f4f4f4;
  font-family: inherit;
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
  cursor: pointer;
  max-width: 100%;
}

.rn-ygh__routine b {
  color: rgba(0, 0, 0, .8);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-ygh__routine-icon {
  font-size: 15px;
  color: #288bd5;
}

.rn-ygh__routine-dot {
  color: rgba(0, 0, 0, .3);
}

.rn-ygh__routine-more {
  font-size: 16px;
}

.rn-ygh__about {
  align-self: stretch;
  margin-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  padding-top: 10px;
  cursor: pointer;
}

.rn-ygh__about-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .5);
}

.rn-ygh__about-chev {
  font-size: 20px;
  color: rgba(0, 0, 0, .45);
}

.rn-ygh__about-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0 4px;
}

.rn-ygh__bullet {
  display: flex;
  gap: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .75);
}

.rn-ygh__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #288bd5;
  margin-top: 9px;
  flex-shrink: 0;
}

.rn-ygh__about-empty {
  font-size: 13px;
  color: rgba(0, 0, 0, .45);
}
</style>
