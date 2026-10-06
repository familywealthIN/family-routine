<template>
  <!--
    Pull down to refresh, for touch screens. Wraps any content; when a downward
    drag starts while every scroller under the finger (inside this wrapper) is
    already at its top, an indicator follows the finger down and, released past
    `threshold`, emits `refresh`. The host does the refetch and reports it back
    through `refreshing`, which keeps the indicator spinning until it is false.

    Touch only, and passive: it never blocks a scroll. A drag that turns out
    horizontal first (the routine deck's swipe) is ignored, as is any drag that
    starts with a scroller under the finger not at its top.

    Presentational — no data, no Apollo.
  -->
  <div
    class="rn-ptr"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="onTouchCancel"
  >
    <div
      class="rn-ptr__indicator"
      :class="{ 'rn-ptr__indicator--armed': armed, 'rn-ptr__indicator--busy': refreshing }"
      :style="indicatorStyle"
      data-testid="pull-refresh-indicator"
      aria-hidden="true"
    >
      <i class="rn-mi rn-ptr__icon" :style="iconStyle">refresh</i>
    </div>
    <slot></slot>
  </div>
</template>

<script>
// Pixels before the gesture commits to an axis.
const AXIS_LOCK_PX = 8;
// Finger travel is damped so the indicator lags it, like the native control.
const DAMPING = 0.5;
// Where the indicator rests while refreshing.
const REST_PX = 56;

export default {
  name: 'MoleculePullToRefresh',
  props: {
    /** The host's refetch is in flight. */
    refreshing: { type: Boolean, default: false },
    /** Damped pull distance (px) that arms a refresh. */
    threshold: { type: Number, default: 64 },
    /** Furthest the indicator travels. */
    max: { type: Number, default: 96 },
    disabled: { type: Boolean, default: false },
  },
  data() {
    return {
      /** Damped distance the indicator is pulled down. */
      pull: 0,
      pulling: false,
    };
  },
  computed: {
    armed() {
      return this.pull >= this.threshold;
    },
    offset() {
      if (this.refreshing && !this.pulling) return REST_PX;
      return this.pull;
    },
    indicatorStyle() {
      const visible = this.offset > 0 || this.refreshing;
      return {
        transform: `translate(-50%, ${this.offset - 44}px)`,
        opacity: visible ? Math.min(1, this.offset / this.threshold + (this.refreshing ? 1 : 0)) : 0,
        transition: this.pulling ? 'none' : 'transform .25s ease, opacity .25s ease',
      };
    },
    iconStyle() {
      if (this.refreshing) return {};
      return { transform: `rotate(${Math.round((this.pull / this.threshold) * 270)}deg)` };
    },
  },
  methods: {
    onTouchStart(event) {
      if (this.disabled || this.refreshing || !event.touches || event.touches.length !== 1) {
        this.gesture = null;
        return;
      }
      const touch = event.touches[0];
      this.gesture = {
        x0: touch.clientX,
        y0: touch.clientY,
        axis: '',
        atTop: this.allScrollersAtTop(event.target),
      };
    },
    onTouchMove(event) {
      const g = this.gesture;
      if (!g || !event.touches || !event.touches.length) return;
      const touch = event.touches[0];
      const dx = touch.clientX - g.x0;
      const dy = touch.clientY - g.y0;
      if (!g.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
        // Only a downward, mostly-vertical drag from the very top is a pull.
        if (!g.atTop || dy <= 0 || Math.abs(dx) >= Math.abs(dy)) {
          this.gesture = null;
          return;
        }
        g.axis = 'y';
        g.y0 = touch.clientY;
        this.pulling = true;
      }
      this.pull = Math.max(0, Math.min(this.max, (touch.clientY - g.y0) * DAMPING));
    },
    onTouchEnd() {
      const armed = this.pulling && this.armed;
      this.reset();
      if (armed) this.$emit('refresh');
    },
    onTouchCancel() {
      this.reset();
    },
    reset() {
      this.gesture = null;
      this.pulling = false;
      this.pull = 0;
    },
    /** Every scroll container between the touch target and this wrapper is at its top. */
    allScrollersAtTop(target) {
      let node = target;
      while (node && node !== this.$el && node.nodeType === 1) {
        if (node.scrollTop > 0) return false;
        node = node.parentElement;
      }
      return !this.$el || this.$el.scrollTop <= 0;
    },
  },
};
</script>

<style>
.rn-ptr {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.rn-ptr__indicator {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 20;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
}

.rn-ptr__icon {
  font-size: 22px;
  color: rgba(0, 0, 0, .45);
}

.rn-ptr__indicator--armed .rn-ptr__icon,
.rn-ptr__indicator--busy .rn-ptr__icon {
  color: #288bd5;
}

.rn-ptr__indicator--busy .rn-ptr__icon {
  animation: rn-ptr-spin .8s linear infinite;
}

@keyframes rn-ptr-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
