<template>
  <!--
    Phone top bar. "Home" fades out once the focused routine is ticked and the
    centre slot takes over: a 34px green ring plus the routine name, popped in
    after the tick animation lands. That ring is also the flight TARGET, so the
    page measures it through `ringTargetRect()` / `nameTargetRect()`.
  -->
  <div class="rn-topbar">
    <!--
      Inbox sits at the leading edge, where the design puts it: it is the one
      header control that is about work the day has NOT placed yet, so it reads
      before the title rather than competing with the points chip.
    -->
    <div
      class="rn-topbar__inbox"
      title="Inbox"
      data-testid="topbar-inbox"
      @click="$emit('open-inbox')"
    >
      <div class="rn-topbar__inbox-btn">
        <i class="rn-mi rn-topbar__inbox-icon">inbox</i>
      </div>
      <div
        v-if="inboxCount > 0"
        class="rn-topbar__inbox-badge"
        data-testid="topbar-inbox-badge"
      >{{ inboxCount }}</div>
    </div>

    <div class="rn-topbar__title" :style="{ opacity: ticked ? 0 : 1 }">{{ title }}</div>

    <div class="rn-topbar__centre" :style="{ visibility: showMini ? 'visible' : 'hidden' }">
      <div ref="ringTarget" class="rn-topbar__mini-wrap">
        <template v-if="miniBreathing">
          <div
            class="rn-topbar__mini-breathe"
            :style="{ borderColor: miniColor, animation: breatheOne }"
          ></div>
          <div
            class="rn-topbar__mini-breathe"
            :style="{ borderColor: miniColor, animation: breatheTwo }"
          ></div>
        </template>
        <div
          class="rn-topbar__mini"
          :style="{ background: miniColor, animation: showMini ? popAnimation : 'none' }"
          :title="miniTitle"
          data-testid="topbar-mini-ring"
          @click="$emit('mini-click')"
        >
          <i class="rn-mi rn-topbar__mini-icon">{{ miniGlyph }}</i>
        </div>
      </div>
      <div ref="nameTarget" class="rn-topbar__mini-name">{{ routineName }}</div>
    </div>

    <focus-points-chip
      :available="available"
      :pending-today="pendingToday"
      :entitled="entitled"
      :loading="pointsLoading"
      :error="pointsError"
      @click="$emit('open-points')"
    />
    <div class="rn-topbar__avatar-btn" data-testid="topbar-avatar" @click="$emit('open-drawer')">
      <img
        class="rn-topbar__avatar"
        :src="picture || '/img/default-user.png'"
        :alt="`Profile picture of ${userName || 'User'}`"
        @error="$event.target.src = '/img/default-user.png'"
      />
    </div>
  </div>
</template>

<script>
import FocusPointsChip from '../../molecules/FocusPointsChip/FocusPointsChip.vue';

export default {
  name: 'OrganismRoutineTopBar',
  components: { FocusPointsChip },
  props: {
    title: { type: String, default: 'Home' },
    ticked: { type: Boolean, default: false },
    routineName: { type: String, default: '' },
    /** Hidden while the tick ghost is still flying — otherwise both are visible. */
    flying: { type: Boolean, default: false },
    miniColor: { type: String, default: '#4CAF50' },
    miniGlyph: { type: String, default: 'check' },
    miniTitle: { type: String, default: 'Ticked — tap to undo' },
    miniBreathing: { type: Boolean, default: false },
    /** Goal items with no routine. 0 hides the badge entirely. */
    inboxCount: { type: Number, default: 0 },
    miniRingMs: { type: Number, default: 1800 },
    available: { type: Number, default: 0 },
    pendingToday: { type: Number, default: 0 },
    entitled: { type: Boolean, default: false },
    pointsLoading: { type: Boolean, default: false },
    pointsError: { type: Boolean, default: false },
    picture: { type: String, default: '' },
    userName: { type: String, default: '' },
  },
  computed: {
    showMini() {
      return this.ticked && !this.flying;
    },
    popAnimation() {
      return 'rn-pop .5s cubic-bezier(.3,1.6,.5,1)';
    },
    breatheOne() {
      return `rn-breathe ${this.miniRingMs}ms ease-out infinite`;
    },
    breatheTwo() {
      return `rn-breathe ${this.miniRingMs}ms ease-out ${this.miniRingMs / 2}ms infinite`;
    },
  },
  methods: {
    ringTargetRect() {
      const el = this.$refs.ringTarget;
      return el ? el.getBoundingClientRect() : null;
    },
    nameTargetRect() {
      const el = this.$refs.nameTarget;
      return el ? el.getBoundingClientRect() : null;
    },
  },
};
</script>

<style>
.rn-topbar {
  position: relative;
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 8px 0 16px;
  flex-shrink: 0;
  background: #f4f4f4;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-topbar__inbox {
  position: relative;
  width: 40px;
  height: 40px;
  margin: 0 10px 0 0;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-topbar__inbox-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
  color: rgba(0, 0, 0, .65);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-topbar__inbox-icon {
  font-size: 22px;
}

.rn-topbar__inbox-badge {
  position: absolute;
  top: -2px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 8px;
  background: #FF9800;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px #f4f4f4;
}

.rn-topbar__title {
  font-size: 24px;
  font-weight: 500;
  flex: 1;
  transition: opacity .3s;
}

.rn-topbar__centre {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 170px;
  z-index: 2;
}

.rn-topbar__mini-wrap {
  position: relative;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

.rn-topbar__mini-breathe {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  box-sizing: border-box;
  pointer-events: none;
}

.rn-topbar__mini {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(76, 175, 80, .35);
}

.rn-topbar__mini-icon {
  font-size: 20px;
}

.rn-topbar__mini-name {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 170px;
  text-align: center;
}

/* 40px, filled edge to edge — the design's phone header draws the avatar as the
   tap target, not an image inset inside one. It was 36/32. */
.rn-topbar__avatar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-topbar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
