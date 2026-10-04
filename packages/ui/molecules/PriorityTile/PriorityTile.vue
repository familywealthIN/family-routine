<template>
  <!--
    One cell of the phone 2x2 map (Priority.dc.html, PP frame).

    On the phone the map is NAVIGATION — tapping a tile swaps the single list
    card below, so the tile carries the selected ring + tint and `rn-bump`.
    On tablet/desktop all four quadrant cards render at once, so the map is not
    drawn there at all and this component is phone-only by construction.
  -->
  <div
    class="rn-ptile"
    :class="{ 'rn-ptile--selected': selected }"
    :style="rootStyle"
    :data-testid="`priority-tile-${quadrant.key}`"
    role="button"
    :aria-pressed="String(!!selected)"
    @click="$emit('select', quadrant.key)"
  >
    <div class="rn-ptile__head">
      <div class="rn-ptile__label" :style="{ color: quadrant.color }">{{ quadrant.label }}</div>
      <progress-ring
        :size="TILE_RING.size"
        :view-box="TILE_RING.viewBox"
        :r="TILE_RING.r"
        :stroke="TILE_RING.stroke"
        :track-color="TILE_RING.track"
        :value="quadrant.pct"
        :color="quadrant.color"
        transition="stroke-dashoffset .4s"
      />
    </div>
    <div class="rn-ptile__counts">
      <div class="rn-ptile__open" data-testid="priority-tile-open">{{ quadrant.open }}</div>
      <div class="rn-ptile__done">open · {{ quadrant.done }} done</div>
    </div>
    <div class="rn-ptile__verb">{{ quadrant.verb }}</div>
  </div>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';
import { TILE_RING } from '../../constants/priority';

export default {
  name: 'MoleculePriorityTile',
  components: { ProgressRing },
  props: {
    /** One QUADRANTS entry widened with `open` / `done` / `pct`. */
    quadrant: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    /**
     * Bump the tile (`rn-bump`) because something just landed in it. The page
     * flips this off again; the mocks restart the keyframe by swapping names,
     * which chassis.md § Motion says not to port.
     */
    bumping: { type: Boolean, default: false },
  },
  data() {
    return { TILE_RING };
  },
  computed: {
    rootStyle() {
      return {
        background: this.selected ? this.quadrant.tint : '#fafafa',
        boxShadow: `inset 0 0 0 ${this.selected ? '2px' : '0px'} ${this.quadrant.color}`,
        animation: this.bumping ? 'rn-bump .5s ease' : 'none',
      };
    },
  },
};
</script>

<style>
.rn-ptile {
  position: relative;
  box-sizing: border-box;
  min-height: 84px;
  padding: 10px 10px 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: background .2s, box-shadow .2s;
}

.rn-ptile__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.rn-ptile__label {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .4px;
}

.rn-ptile__counts {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}

.rn-ptile__open {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: rgba(0, 0, 0, .87);
}

.rn-ptile__done {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
}

.rn-ptile__verb {
  margin-top: 4px;
  font-size: 10px;
  color: rgba(0, 0, 0, .5);
}
</style>
