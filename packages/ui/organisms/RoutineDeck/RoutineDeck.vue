<template>
  <!--
    Phone card deck: the ‹ › header, the two routines peeking behind the focus
    card, and the focus card itself in the default slot. Tapping a peek card
    focuses that routine (design handoff § Card deck).
  -->
  <div class="rn-deck">
    <div class="rn-deck__head">
      <button
        type="button"
        class="rn-deck__nav"
        :style="{ opacity: hasPrev ? 1 : 0.35 }"
        :disabled="!hasPrev"
        title="Previous routine"
        data-testid="deck-prev"
        @click="$emit('prev')"
      >
        <i class="rn-mi rn-deck__nav-icon">chevron_left</i>
      </button>
      <div class="rn-deck__counter">
        <div class="rn-deck__counter-text">{{ tickedCount }} OF {{ totalCount }} TICKED</div>
        <div
          v-if="showBackToNow"
          class="rn-deck__back"
          data-testid="deck-back-to-now"
          @click="$emit('back-to-now')"
        >Back to now</div>
      </div>
      <button
        type="button"
        class="rn-deck__nav"
        :style="{ opacity: hasNext ? 1 : 0.35 }"
        :disabled="!hasNext"
        title="Next routine"
        data-testid="deck-next"
        @click="$emit('next')"
      >
        <i class="rn-mi rn-deck__nav-icon">chevron_right</i>
      </button>
    </div>

    <div class="rn-deck__stage">
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
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrganismRoutineDeck',
  props: {
    /** The next two routines after the focused one: { id, name, time, points, stimulus, stateIcon, stateColor } */
    peeks: { type: Array, default: () => [] },
    tickedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    hasPrev: { type: Boolean, default: false },
    hasNext: { type: Boolean, default: false },
    showBackToNow: { type: Boolean, default: false },
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

.rn-deck__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 8px;
  flex-shrink: 0;
}

.rn-deck__nav {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, .87);
}

.rn-deck__nav[disabled] {
  cursor: default;
}

.rn-deck__nav-icon {
  font-size: 22px;
}

.rn-deck__counter {
  text-align: center;
  min-width: 0;
}

.rn-deck__counter-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-deck__back {
  font-size: 12px;
  font-weight: 600;
  color: #FF9800;
  cursor: pointer;
  margin-top: 2px;
}

.rn-deck__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  margin-top: 30px;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, .06);
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
