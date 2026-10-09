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
          <!-- D/K/G as the previous dashboard drew them: three 50px progress
               circles, letter inside, under the name. -->
          <div class="rn-drawer__scores" data-testid="drawer-scores">
            <atom-progress-circular
              v-for="score in scores"
              :key="score.key"
              :value="clamp(score.pct)"
              :size="50"
              :rotate="-90"
              width="6"
              :color="score.color"
              :title="`${score.label} ${Math.round(score.pct)}%`"
              :data-testid="`drawer-score-${score.key}`"
            >{{ score.key }}</atom-progress-circular>
          </div>
        </div>
        <i
          class="rn-mi rn-drawer__close"
          data-testid="user-drawer-close"
          title="Close"
          @click="$emit('input', false)"
        >close</i>
      </header>

      <div class="rn-drawer__streak">
        <i class="rn-mi rn-drawer__streak-icon">local_fire_department</i>
        <div class="rn-drawer__streak-text">
          <div class="rn-drawer__streak-days">{{ streakDays }}-day streak</div>
          <div v-if="streakHint" class="rn-drawer__streak-hint">{{ streakHint }}</div>
        </div>
      </div>

      <!-- On time vs late, the old "Tasks in Time / out of Time" bar as a ribbon. -->
      <molecule-timing-ribbon
        v-if="timing"
        :slots="timing.slots"
        :counts="timing.counts"
        :next-index="timing.nextIndex"
        :skip="timing.skip"
        :rate="timing.rate"
        :delta="timing.delta"
      />

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
import AtomProgressCircular from '../../atoms/ProgressCircular/ProgressCircular.vue';
import MoleculeTimingRibbon from '../../molecules/TimingRibbon/TimingRibbon.vue';
import { STIMULI, STIMULUS_ORDER } from '../../constants/routineFocus';

export default {
  name: 'OrganismUserDrawer',
  components: { AtomProgressCircular, MoleculeTimingRibbon },
  props: {
    value: { type: Boolean, default: false },
    name: { type: String, default: '' },
    /** Accepted for callers' sake; the drawer no longer shows the email. */
    email: { type: String, default: '' },
    picture: { type: String, default: '' },
    /** { D, K, G } percentages — the same numbers the old dashboard's rings showed. */
    stimulusTotals: { type: Object, default: () => ({ D: 0, K: 0, G: 0 }) },
    streakDays: { type: Number, default: 0 },
    streakHint: { type: String, default: '' },
    /** Accepted for callers' sake; the drawer no longer shows points. */
    points: { type: Number, default: null },
    /** [{ key, icon, label, route, active, color }] — the chassis More list. */
    navItems: { type: Array, default: () => [] },
    /**
     * `drawerTiming()` (web-app utils/routineTiming): today's check-ins and the
     * week's on-time rate. Null while unknown, and the ribbon is left out.
     */
    timing: { type: Object, default: null },
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
    // `item.color` lets the list carry its own emphasis. Every row sits on the
    // same rhythm: the More list's `gap` (a breather above Profile in the
    // tablet flyout) made one gap in the phone list wider than the rest.
    rowStyle(item) {
      return {
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
  align-items: flex-start;
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

.rn-drawer__scores {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.rn-drawer__scores .v-progress-circular__info {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, .87);
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
