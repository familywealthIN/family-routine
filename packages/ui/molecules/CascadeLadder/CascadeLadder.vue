<template>
  <!--
    The cascade ladder — Today → Week → Month → Year → Life (Goals.dc.html).

    This is the page's NAVIGATION, not a summary: tapping a step swaps the list
    below it. The `×5` / `×3` / `×6` chips sit BETWEEN two steps because they are
    the roll-up rule that joins them, and there is none after Year → Life (a
    lifetime goal is ticked by hand).

    Pure: props in, `select` out. The step that just auto-ticked arrives with
    `pop: true` and replays `rn-pop` through its `:key` — the mocks alternate two
    identical keyframes to do the same thing (chassis.md § Motion).
  -->
  <section class="rn-ladder" data-testid="cascade-ladder">
    <div class="rn-ladder__row">
      <div
        v-for="step in steps"
        :key="step.key"
        class="rn-ladder__cell"
      >
        <div
          class="rn-ladder__step"
          :class="{ 'rn-ladder__step--active': step.active }"
          :data-testid="`ladder-step-${step.key}`"
          role="tab"
          :aria-selected="String(!!step.active)"
          @click="$emit('select', step.key)"
        >
          <ProgressRing
            :size="RING.size"
            :view-box="RING.viewBox"
            :r="RING.r"
            :stroke="RING.stroke"
            :value="step.value"
            :color="step.color"
            transition="stroke-dashoffset .5s cubic-bezier(.3,1.3,.5,1)"
          >
            <span
              :key="`${step.key}-${step.pop ? 'pop' : 'still'}`"
              class="rn-ladder__num"
              :class="{ 'rn-ladder__num--pop': step.pop, 'rn-ladder__num--active': step.active }"
              :data-testid="`ladder-num-${step.key}`"
            >{{ step.num }}</span>
          </ProgressRing>
          <div
            class="rn-ladder__label"
            :class="{ 'rn-ladder__label--active': step.active }"
          >{{ step.label }}</div>
        </div>

        <div
          v-if="step.threshold"
          class="rn-ladder__arrow"
          :data-testid="`ladder-threshold-${step.key}`"
        >
          <i class="rn-mi rn-ladder__chevron">chevron_right</i>
          <div class="rn-ladder__th">{{ step.threshold }}</div>
        </div>
      </div>
    </div>

    <div v-if="rule" class="rn-ladder__rule" data-testid="cascade-rule">
      <i class="rn-mi rn-ladder__rule-glyph">{{ ruleIcon }}</i>
      <span class="rn-ladder__rule-text">{{ rule }}</span>
    </div>
  </section>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';
import { LADDER_RING } from '../../constants/goalsCascade';

export default {
  name: 'MoleculeCascadeLadder',
  components: { ProgressRing },
  props: {
    /**
     * `[{ key, label, num, value, color, active, threshold, pop }]` — built by
     * `utils/goalCascade.buildCascade`, never derived here. A molecule that
     * recomputed the tallies would be a second definition of the cascade.
     */
    steps: { type: Array, default: () => [] },
    /** The sentence under the ladder: what this level rolls up into. */
    rule: { type: String, default: '' },
    ruleIcon: { type: String, default: '' },
  },
  data() {
    return { RING: LADDER_RING };
  },
};
</script>

<style>
.rn-ladder {
  display: block;
  padding: 12px 8px 10px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-ladder__row {
  display: flex;
  align-items: flex-start;
}

.rn-ladder__cell {
  display: flex;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.rn-ladder__step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: background .2s;
}

.rn-ladder__step--active {
  background: rgba(40, 139, 213, .1);
}

.rn-ladder__num {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, .6);
}

.rn-ladder__num--active {
  color: rgba(0, 0, 0, .87);
}

.rn-ladder__num--pop {
  animation: rn-pop .6s cubic-bezier(.3, 1.6, .5, 1);
}

.rn-ladder__label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, .5);
  white-space: nowrap;
}

.rn-ladder__label--active {
  color: #1f6fab;
}

.rn-ladder__arrow {
  width: 14px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  color: rgba(0, 0, 0, .3);
}

.rn-ladder__chevron {
  font-size: 14px;
}

.rn-ladder__th {
  font-size: 9px;
  font-weight: 700;
}

.rn-ladder__rule {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 8px 0;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
}

.rn-ladder__rule-glyph {
  font-size: 16px;
  color: #288bd5;
}

.rn-ladder__rule-text {
  flex: 1;
  min-width: 0;
}
</style>
