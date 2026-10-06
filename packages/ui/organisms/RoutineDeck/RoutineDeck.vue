<template>
  <!--
    Phone card deck: the "N OF M TICKED" header, the two routines peeking behind
    the focus card, and the focus card itself in the default slot.

    Routines switch by swiping the card sideways, like a card stack: the card
    follows the finger (or a mouse drag), and past the threshold it flies off and
    the neighbour slides in from the other side; short of it, it snaps back.
    Swipe left = next routine, swipe right = previous. There are no ‹ › buttons —
    the owner asked for the swipe to be the only switch. Tapping a peek card still
    focuses that routine.

    The gesture locks its axis after the first few pixels: a mostly-vertical
    drag is left entirely to the browser (the checklist/chat scroll, pull to
    refresh), and `touch-action: pan-y` on the stage means a horizontal one never
    starts a scroll. Presentational — the page owns which routine is focused and
    hears `prev` / `next`.
  -->
  <!--
    No header bar: the owner removed the "N OF M TICKED" counter (it took a row
    of the phone's height), and "Back to now" moved INTO the focus card's status
    row — the same placement and style the large shells already use.
  -->
  <div class="rn-deck">

    <div
      ref="stage"
      class="rn-deck__stage"
      :class="{ 'rn-deck__stage--dragging': phase === 'drag' }"
      data-testid="deck-stage"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click.capture="onClickCapture"
    >
      <div
        v-for="(peek, i) in peeks"
        :key="peek.id"
        class="rn-deck__peek"
        :style="peekStyle(i)"
        @click="$emit('focus-routine', peek.id)"
      >
        <span class="rn-deck__peek-left">
          <i class="rn-mi rn-deck__peek-icon" :style="{ color: peek.stateColor }">{{ peek.stateIcon }}</i>
          {{ peek.time }} · {{ peek.name }}
        </span>
        <span class="rn-deck__peek-right">{{ peek.stimulus }} +{{ peek.points }}</span>
      </div>
      <div
        ref="card"
        class="rn-deck__card"
        :class="{ 'rn-deck__card--moving': moving }"
        :style="cardStyle"
        data-testid="deck-card"
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
// Pixels of travel before the gesture decides it is horizontal or vertical.
const AXIS_LOCK_PX = 8;
// A horizontal lock needs the drag to be clearly sideways, not a diagonal scroll.
const AXIS_RATIO = 1.2;
// Release past this many px (or a quarter of the card, whichever is smaller)...
const COMMIT_PX = 90;
// ...or flicked faster than this (px/ms) commits the switch.
const FLICK_VELOCITY = 0.5;
// No neighbour that way: the card still moves, but against resistance.
const RUBBER_BAND = 0.3;
const OUT_MS = 200;
const IN_MS = 240;
const SNAP_MS = 220;

export default {
  name: 'OrganismRoutineDeck',
  props: {
    /** The next two routines after the focused one: { id, name, time, points, stimulus, stateIcon, stateColor } */
    peeks: { type: Array, default: () => [] },
    /** Whether a swipe right / left has a routine to go to. */
    hasPrev: { type: Boolean, default: false },
    hasNext: { type: Boolean, default: false },
  },
  data() {
    return {
      /** idle | pending | drag | snap | out | in-start | in */
      phase: 'idle',
      dragX: 0,
      /** -1 = leaving to the left (next), 1 = to the right (prev). */
      direction: 0,
      width: 0,
    };
  },
  computed: {
    /** The card is lifted off the stack (deeper shadow) while it is in motion. */
    moving() {
      return this.phase === 'drag' || this.phase === 'out' || this.phase === 'snap'
        || this.phase === 'in-start' || this.phase === 'in';
    },
    cardStyle() {
      const x = this.dragX;
      const rotate = this.phase === 'drag' || this.phase === 'out'
        ? Math.max(-6, Math.min(6, x * 0.02))
        : 0;
      let transition = 'none';
      if (this.phase === 'snap') transition = `transform ${SNAP_MS}ms cubic-bezier(.2, .8, .2, 1)`;
      if (this.phase === 'out') transition = `transform ${OUT_MS}ms ease-in, opacity ${OUT_MS}ms ease-in`;
      if (this.phase === 'in') transition = `transform ${IN_MS}ms cubic-bezier(.2, .8, .2, 1), opacity ${IN_MS}ms ease-out`;
      const fading = this.phase === 'out' || this.phase === 'in-start';
      return {
        transform: x || rotate ? `translateX(${x}px) rotate(${rotate}deg)` : 'none',
        opacity: fading ? 0 : 1,
        // The inline transition replaces the stylesheet's, so the shadow's
        // lift has to ride along here.
        transition: transition === 'none'
          ? 'box-shadow .2s ease-out'
          : `${transition}, box-shadow .2s ease-out`,
      };
    },
  },
  beforeDestroy() {
    this.clearTimers();
  },
  methods: {
    peekStyle(index) {
      // 28px / 14px up, 0.96 / 0.92 — the second card peeks out from behind
      // the first, both anchored at the top so the focus card's own top edge
      // stays the dominant line.
      return {
        transform: `translateY(-${28 - index * 14}px) scale(${1 - (index + 1) * 0.04})`,
        zIndex: 2 - index,
      };
    },

    // --- gesture ------------------------------------------------------------
    onPointerDown(event) {
      // Primary button / first finger only, and never mid-animation.
      if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      if (this.phase !== 'idle' && this.phase !== 'snap') return;
      this.gesture = {
        id: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        t: Date.now(),
        lastX: event.clientX,
        lastT: Date.now(),
        velocity: 0,
      };
      this.moved = false;
      this.phase = 'pending';
    },
    onPointerMove(event) {
      const g = this.gesture;
      if (!g || event.pointerId !== g.id) return;
      const dx = event.clientX - g.x0;
      const dy = event.clientY - g.y0;

      if (this.phase === 'pending') {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
        if (Math.abs(dx) > Math.abs(dy) * AXIS_RATIO) {
          this.phase = 'drag';
          this.moved = true;
          const { stage } = this.$refs;
          this.width = (stage && stage.clientWidth) || 360;
          if (stage && stage.setPointerCapture) {
            try { stage.setPointerCapture(g.id); } catch (e) { /* pointer already gone */ }
          }
        } else {
          // Vertical: hand the whole gesture back to the scroller.
          this.endGesture();
          return;
        }
      }
      if (this.phase !== 'drag') return;

      if (event.cancelable) event.preventDefault();
      const now = Date.now();
      const dt = Math.max(1, now - g.lastT);
      g.velocity = (event.clientX - g.lastX) / dt;
      g.lastX = event.clientX;
      g.lastT = now;
      const allowed = dx < 0 ? this.hasNext : this.hasPrev;
      this.dragX = allowed ? dx : dx * RUBBER_BAND;
    },
    onPointerUp(event) {
      const g = this.gesture;
      if (!g || event.pointerId !== g.id) return;
      if (this.phase !== 'drag') {
        this.endGesture();
        return;
      }
      const dx = this.dragX;
      const goingNext = dx < 0;
      const allowed = goingNext ? this.hasNext : this.hasPrev;
      const threshold = Math.min(COMMIT_PX, this.width * 0.25);
      const flicked = Math.abs(g.velocity) > FLICK_VELOCITY
        && Math.sign(g.velocity) === Math.sign(dx);
      this.gesture = null;
      if (allowed && (Math.abs(dx) > threshold || flicked)) {
        this.commit(goingNext ? 'next' : 'prev');
      } else {
        this.snapBack();
      }
    },
    onPointerCancel(event) {
      const g = this.gesture;
      if (!g || event.pointerId !== g.id) return;
      if (this.phase === 'drag') {
        this.gesture = null;
        this.snapBack();
      } else {
        this.endGesture();
      }
    },
    /** A drag is not a tap: swallow the click that ends it. */
    onClickCapture(event) {
      if (!this.moved) return;
      this.moved = false;
      event.stopPropagation();
      event.preventDefault();
    },
    endGesture() {
      this.gesture = null;
      if (this.phase === 'pending') this.phase = 'idle';
    },

    // --- animation ----------------------------------------------------------
    snapBack() {
      this.phase = 'snap';
      this.dragX = 0;
      this.clearTimers();
      this.timer = setTimeout(() => {
        if (this.phase === 'snap') this.phase = 'idle';
      }, SNAP_MS);
    },
    /**
     * Fly the card off, switch the routine while it is invisible, then bring
     * the new one in from the opposite edge. The focus card is the same
     * component instance either side of the switch (only its props change), so
     * the deck animates its wrapper rather than relying on enter/leave.
     */
    commit(which) {
      const width = this.width || 360;
      const sign = which === 'next' ? -1 : 1;
      this.clearTimers();
      this.phase = 'out';
      this.dragX = sign * (width + 40);
      this.timer = setTimeout(() => {
        this.$emit(which);
        this.phase = 'in-start';
        this.dragX = -sign * width * 0.5;
        this.$nextTick(() => {
          // Force a layout so the off-screen start position is committed before
          // the slide back to 0 — no rAF, which a hidden tab never runs.
          if (this.$refs.card) this.$refs.card.getBoundingClientRect();
          this.phase = 'in';
          this.dragX = 0;
          this.timer = setTimeout(() => {
            if (this.phase === 'in') this.phase = 'idle';
          }, IN_MS);
        });
      }, OUT_MS);
    },
    clearTimers() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    },
  },
};
</script>

<style>
.rn-deck {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* `pan-y`: the browser keeps vertical scrolling (and every scroller inside the
   card inherits the restriction), while a horizontal drag is ours alone. */
.rn-deck__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  margin-top: 30px;
  touch-action: pan-y;
}

.rn-deck__stage--dragging {
  user-select: none;
  -webkit-user-select: none;
  cursor: grabbing;
}

/* The moving part. Above the peeks (z 1–2) so the card slides over them.
   It carries a stack shadow of its own (the focus card's shadow sits inside it
   and is clipped by nothing): soft at rest, deeper while dragged, so the card
   in hand visibly lifts off the one underneath. The phone body's 16px side
   padding leaves the blur room before its overflow clip. */
.rn-deck__card {
  position: relative;
  z-index: 3;
  height: 100%;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .06), 0 8px 18px -8px rgba(0, 0, 0, .14);
}

.rn-deck__card--moving {
  box-shadow: 0 6px 12px -4px rgba(0, 0, 0, .14), 0 16px 32px -10px rgba(0, 0, 0, .3);
}

.rn-deck__peek {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 120px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08), 0 4px 10px -4px rgba(0, 0, 0, .1);
  transform-origin: top center;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.rn-deck__peek-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rn-deck__peek-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.rn-deck__peek-right {
  flex-shrink: 0;
}
</style>
