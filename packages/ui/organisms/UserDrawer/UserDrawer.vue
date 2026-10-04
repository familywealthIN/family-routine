<template>
  <!--
    The left drawer the avatar opens. D/K/G moved here out of the home screen
    (design handoff § User drawer) so the home screen can be only the focused
    routine.
  -->
  <div v-if="value" class="rn-drawer-root">
    <div class="rn-drawer__scrim" data-testid="user-drawer-scrim" @click="$emit('input', false)"></div>
    <aside class="rn-drawer" data-testid="user-drawer">
      <header class="rn-drawer__head">
        <img
          class="rn-drawer__avatar"
          :src="picture || '/img/default-user.png'"
          :alt="`Profile picture of ${name || 'User'}`"
          @error="$event.target.src = '/img/default-user.png'"
        />
        <div class="rn-drawer__id">
          <div class="rn-drawer__name">{{ name || 'Routine Notes' }}</div>
          <div class="rn-drawer__email">{{ email }}</div>
        </div>
        <i
          class="rn-mi rn-drawer__close"
          data-testid="user-drawer-close"
          title="Close"
          @click="$emit('input', false)"
        >close</i>
      </header>

      <div class="rn-drawer__section-label">TODAY'S BALANCE</div>
      <div class="rn-drawer__donuts">
        <div v-for="score in scores" :key="score.key" class="rn-drawer__donut">
          <div class="rn-drawer__donut-ring">
            <svg viewBox="0 0 48 48" class="rn-drawer__donut-svg">
              <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="5" />
              <circle
                cx="24" cy="24" r="21" fill="none"
                :stroke="score.color" stroke-width="5"
                :stroke-dasharray="DONUT_CIRCUMFERENCE"
                :stroke-dashoffset="DONUT_CIRCUMFERENCE * (1 - clamp(score.pct) / 100)"
                stroke-linecap="round"
              />
            </svg>
            <div class="rn-drawer__donut-letter" :style="{ color: score.color }">{{ score.key }}</div>
          </div>
          <div class="rn-drawer__donut-pct">{{ Math.round(score.pct) }}%</div>
          <div class="rn-drawer__donut-label">{{ score.label }}</div>
        </div>
      </div>

      <div class="rn-drawer__streak">
        <i class="rn-mi rn-drawer__streak-icon">local_fire_department</i>
        <div class="rn-drawer__streak-text">
          <div class="rn-drawer__streak-days">{{ streakDays }}-day streak</div>
          <div v-if="streakHint" class="rn-drawer__streak-hint">{{ streakHint }}</div>
        </div>
        <!-- Fixed drawer copy is name · email · `{points} points` · `{n}-day streak`
             (chassis.md § Drawer). The pill sits on the streak row so neither
             number is stated twice. -->
        <div v-if="points !== null" class="rn-drawer__points" data-testid="drawer-points">
          <i class="rn-mi rn-drawer__points-icon">diamond</i>
          <span>{{ pointsLabel }}</span>
        </div>
      </div>

      <nav class="rn-drawer__nav">
        <div
          v-for="item in navItems"
          :key="item.key || item.label"
          class="rn-drawer__nav-row"
          :style="rowStyle(item)"
          :data-testid="`drawer-nav-${(item.key || item.label).toLowerCase().replace(/\s+/g, '-')}`"
          @click="$emit('navigate', item)"
        >
          <i class="rn-mi rn-drawer__nav-icon">{{ item.icon }}</i>
          <span>{{ item.label }}</span>
        </div>
      </nav>
    </aside>
  </div>
</template>

<script>
import { STIMULI, STIMULUS_ORDER } from '../../constants/routineFocus';

// r=21 in a 48 viewBox.
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 21;

export default {
  name: 'OrganismUserDrawer',
  props: {
    value: { type: Boolean, default: false },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    picture: { type: String, default: '' },
    /** { D, K, G } percentages — the same numbers the old dashboard's rings showed. */
    stimulusTotals: { type: Object, default: () => ({ D: 0, K: 0, G: 0 }) },
    streakDays: { type: Number, default: 0 },
    streakHint: { type: String, default: '' },
    /**
     * Spendable balance — rendered as the fixed `{points} points` copy. Null
     * hides the pill: a caller with no balance to show must not assert zero (D-10).
     */
    points: { type: Number, default: null },
    /** [{ key, icon, label, route, active, color, gap }] — the chassis More list. */
    navItems: { type: Array, default: () => [] },
  },
  data() {
    return { DONUT_CIRCUMFERENCE };
  },
  watch: {
    // Escape closes the drawer like the scrim does. Listening only while open
    // keeps a closed drawer from swallowing Escape meant for anything else.
    value: {
      handler(open) {
        if (typeof document === 'undefined') return;
        if (open) document.addEventListener('keydown', this.onKeydown);
        else document.removeEventListener('keydown', this.onKeydown);
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (typeof document !== 'undefined') document.removeEventListener('keydown', this.onKeydown);
  },
  computed: {
    pointsLabel() {
      return `${Math.round(this.points).toLocaleString()} points`;
    },
    scores() {
      return STIMULUS_ORDER.map((key) => ({
        key,
        label: STIMULI[key].label,
        color: STIMULI[key].color,
        pct: Number(this.stimulusTotals[key]) || 0,
      }));
    },
  },
  methods: {
    onKeydown(event) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      this.$emit('input', false);
    },
    // D/K/G are percentages, but `countTotal('G')` multiplies by up to 4 early
    // in the week, so the raw value can exceed 100 — the ring must not wrap.
    clamp(value) {
      return Math.min(Math.max(value, 0), 100);
    },
    // `item.color` lets the list carry its own emphasis — Log out is red.
    rowStyle(item) {
      return {
        marginTop: item.gap || '0px',
        background: item.active ? 'rgba(40,139,213,.08)' : 'transparent',
        color: item.color || (item.active ? '#288bd5' : 'rgba(0,0,0,.7)'),
      };
    },
  },
};
</script>

<style>
.rn-drawer-root {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 60;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-drawer__scrim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, .4);
  animation: rn-fade .2s ease-out;
}

/* Right-anchored (chassis.md § Drawer): it is opened by the avatar at the right
   end of the header, so it slides in from that edge. */
.rn-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 300px;
  max-width: 86vw;
  background: #fff;
  overflow-y: auto;
  animation: rn-drawer-in-right .28s cubic-bezier(.4, 0, .2, 1);
  box-shadow: -4px 0 24px rgba(0, 0, 0, .2);
  padding-bottom: 24px;
}

.rn-drawer__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  background: #f4f8fc;
  /* Native WebView: the drawer runs under the status bar. */
  padding-top: calc(20px + env(safe-area-inset-top));
}

.rn-drawer__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.rn-drawer__id {
  flex: 1;
  min-width: 0;
}

.rn-drawer__close {
  font-size: 22px;
  color: rgba(0, 0, 0, .55);
  cursor: pointer;
  padding: 6px;
  flex-shrink: 0;
}

.rn-drawer__name {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-drawer__email {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-drawer__section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  padding: 16px 16px 8px;
}

.rn-drawer__donuts {
  display: flex;
  justify-content: space-around;
  padding: 0 8px 12px;
}

.rn-drawer__donut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rn-drawer__donut-ring {
  position: relative;
  width: 64px;
  height: 64px;
}

.rn-drawer__donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.rn-drawer__donut-letter {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  font-weight: 700;
}

.rn-drawer__donut-pct {
  font-size: 12px;
  font-weight: 600;
}

.rn-drawer__donut-label {
  font-size: 10px;
  color: rgba(0, 0, 0, .54);
}

.rn-drawer__streak {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 12px 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f7f7f7;
}

.rn-drawer__streak-icon {
  font-size: 26px;
  color: #FF9800;
  flex-shrink: 0;
}

.rn-drawer__streak-text {
  flex: 1;
  min-width: 0;
}

.rn-drawer__points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  background: #288bd5;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.rn-drawer__points-icon {
  font-size: 14px;
}

.rn-drawer__streak-days {
  font-size: 14px;
  font-weight: 700;
}

.rn-drawer__streak-hint {
  font-size: 11px;
  color: rgba(0, 0, 0, .54);
}

.rn-drawer__nav {
  border-top: 1px solid rgba(0, 0, 0, .06);
  padding-top: 6px;
}

.rn-drawer__nav-row {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 48px;
  padding: 0 16px;
  margin: 0 6px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.rn-drawer__nav-icon {
  font-size: 22px;
}
</style>
