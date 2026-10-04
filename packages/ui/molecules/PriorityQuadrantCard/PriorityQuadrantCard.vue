<template>
  <!--
    One of the FOUR cards tablet and desktop render simultaneously
    (Priority.dc.html PT/PD frames): a 4px colour cap, a header carrying the
    open count + done ring, then its own scroller.

    There is no tap-to-select here — on the wide shells the 2x2 is state display,
    not navigation, so this card is never "unselected".
  -->
  <section class="rn-pquad" :data-testid="`priority-quadrant-${quadrant.key}`">
    <div class="rn-pquad__cap" :style="{ background: quadrant.color }"></div>
    <header class="rn-pquad__head">
      <div class="rn-pquad__title-wrap">
        <div class="rn-pquad__label" :style="{ color: quadrant.color }">{{ quadrant.label }}</div>
        <div class="rn-pquad__sub">{{ quadrant.sub }} · {{ quadrant.verb }}</div>
      </div>
      <div class="rn-pquad__count">
        <div class="rn-pquad__open" data-testid="priority-quadrant-open">{{ quadrant.open }}</div>
        <div class="rn-pquad__open-label">open</div>
      </div>
      <progress-ring
        :size="TILE_RING.cardSize"
        :view-box="TILE_RING.viewBox"
        :r="TILE_RING.r"
        :stroke="TILE_RING.stroke"
        :track-color="TILE_RING.track"
        :value="quadrant.pct"
        :color="quadrant.color"
        transition="stroke-dashoffset .4s"
      />
    </header>
    <div class="rn-pquad__body rn-hidescroll">
      <priority-task-list
        :groups="quadrant.groups"
        :color="quadrant.color"
        empty-text="Nothing here"
        v-on="$listeners"
      />
    </div>
  </section>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';
import PriorityTaskList from '../PriorityTaskList/PriorityTaskList.vue';
import { TILE_RING } from '../../constants/priority';

export default {
  name: 'MoleculePriorityQuadrantCard',
  components: { ProgressRing, PriorityTaskList },
  props: {
    /** A QUADRANTS entry widened with `open` / `done` / `pct` / `groups`. */
    quadrant: { type: Object, required: true },
  },
  data() {
    return { TILE_RING };
  },
};
</script>

<style>
.rn-pquad {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-pquad__cap {
  height: 4px;
  flex-shrink: 0;
}

.rn-pquad__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 4px;
  flex-shrink: 0;
}

.rn-pquad__title-wrap {
  flex: 1;
  min-width: 0;
}

.rn-pquad__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: .4px;
}

.rn-pquad__sub {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
}

.rn-pquad__count {
  text-align: right;
}

.rn-pquad__open {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.rn-pquad__open-label {
  font-size: 10px;
  color: rgba(0, 0, 0, .45);
}

.rn-pquad__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 10px;
}
</style>
