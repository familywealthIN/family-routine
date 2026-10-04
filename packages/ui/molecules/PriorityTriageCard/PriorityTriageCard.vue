<template>
  <!--
    The triage card (Priority.dc.html): exactly ONE unsorted item at a time, with
    a ghost card 6px behind at 60% opacity when more are queued.

    "Skip" defers the item to the back of the queue — it does NOT assign a
    quadrant, so it emits its own event and never one of the four buttons'.
  -->
  <div class="rn-ptriage" data-testid="priority-triage">
    <div v-if="hasBehind" class="rn-ptriage__ghost" data-testid="priority-triage-ghost"></div>
    <div :key="seq" class="rn-ptriage__card" :class="`rn-ptriage__card--${shellKind}`">
      <div class="rn-ptriage__head">
        <i class="rn-mi rn-ptriage__head-icon">move_to_inbox</i>
        <div class="rn-ptriage__head-label" data-testid="priority-triage-count">
          TRIAGE · {{ count }} LEFT
        </div>
        <div
          class="rn-ptriage__skip"
          data-testid="priority-triage-skip"
          role="button"
          @click="$emit('skip', item)"
        >Skip</div>
      </div>
      <div class="rn-ptriage__body" data-testid="priority-triage-body">{{ item.body }}</div>
      <div v-if="item.meta" class="rn-ptriage__meta">{{ item.meta }}</div>
      <div class="rn-ptriage__btns">
        <div
          v-for="q in quadrants"
          :key="q.key"
          class="rn-ptriage__btn"
          :style="{ background: q.tint, color: q.color }"
          :data-testid="`priority-triage-${q.key}`"
          role="button"
          @click="$emit('assign', { item: item, quadrant: q.key })"
        >
          <i class="rn-mi rn-ptriage__btn-icon">{{ q.icon }}</i>
          <div class="rn-ptriage__btn-text">
            <div>{{ q.label }}</div>
            <div class="rn-ptriage__btn-sub">{{ q.sub }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculePriorityTriageCard',
  props: {
    /** The one item being triaged — `{ id, body, meta }`. */
    item: { type: Object, required: true },
    /** How many are still queued, including this one. */
    count: { type: Number, default: 1 },
    /** The 4 QUADRANTS entries, in grid order. */
    quadrants: { type: Array, default: () => [] },
    shell: { type: String, default: 'phone' },
    /**
     * Bumped by the page to replay the card's entrance when the next item slides
     * in. (The mock alternates `rn-card0`/`rn-card1`; Vue re-keys instead.)
     */
    seq: { type: Number, default: 0 },
  },
  computed: {
    hasBehind() {
      return this.count > 1;
    },
    /** Phone cards are r16, tablet/desktop r20 — chassis.md § Palette. */
    shellKind() {
      return this.shell === 'phone' ? 'phone' : 'wide';
    },
  },
};
</script>

<style>
.rn-ptriage {
  position: relative;
}

/* The queue behind the current card: offset 6px, 60% opacity. */
.rn-ptriage__ghost {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -6px;
  height: 30px;
  border-radius: 16px;
  background: #fff;
  opacity: .6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .06);
}

.rn-ptriage__card {
  position: relative;
  background: #fff;
  padding: 14px 14px 12px;
  animation: rn-pop .3s cubic-bezier(.3, 1.2, .5, 1);
}

.rn-ptriage__card--phone {
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}

.rn-ptriage__card--wide {
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-ptriage__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-ptriage__head-icon {
  font-size: 18px;
  color: #288bd5;
}

.rn-ptriage__head-label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .5);
}

.rn-ptriage__skip {
  padding: 4px 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .5);
  cursor: pointer;
}

.rn-ptriage__body {
  margin: 8px 0 2px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.rn-ptriage__meta {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-ptriage__btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 12px;
}

.rn-ptriage__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .1s;
}

.rn-ptriage__btn:active {
  transform: scale(.97);
}

.rn-ptriage__btn-icon {
  font-size: 18px;
}

.rn-ptriage__btn-text {
  min-width: 0;
}

.rn-ptriage__btn-sub {
  font-size: 10px;
  font-weight: 500;
  opacity: .8;
}
</style>
