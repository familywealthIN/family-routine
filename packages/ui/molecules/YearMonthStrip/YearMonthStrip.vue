<template>
  <!--
    The 12-month strip that replaced the nested expansion panels. Tap a month to
    focus it; the focus card below is the only place a month's weeks and days
    live, so there is no second level of accordion anywhere on this page.

    Three tile states, from `yearGoalModel.monthTile`:
      done   — a solid green disc with a check
      active — a ring reading `n/3`
      empty  — a dashed track with `+` (future) or `−` (past)
  -->
  <div class="rn-yms" :class="`rn-yms--${shell}`" data-testid="year-month-strip">
    <button
      v-for="tile in tiles"
      :key="tile.key"
      type="button"
      class="rn-yms__tile"
      :class="{ 'rn-yms__tile--selected': tile.selected }"
      :title="tile.title"
      :data-testid="`month-tile-${tile.index}`"
      :data-state="tile.state"
      @click="$emit('select', tile.index)"
    >
      <span
        class="rn-yms__label"
        :style="{ color: tile.labelColor, fontWeight: tile.labelWeight }"
      >{{ tile.label }}</span>

      <span class="rn-yms__ring">
        <progress-ring
          :size="36"
          :view-box="48"
          :r="20"
          :stroke="3"
          :value="tile.ringValue"
          :color="tile.ringColor"
          :track-color="tile.track"
          transition="stroke-dashoffset .4s"
        />
        <!-- The dashed empty track is a second circle: ProgressRing's track is
             solid by contract, and a dash pattern is this page's only use. -->
        <svg v-if="tile.trackDash" class="rn-yms__dash" viewBox="0 0 48 48" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            :stroke="tile.track"
            stroke-width="3"
            :stroke-dasharray="tile.trackDash"
          />
        </svg>
        <span class="rn-yms__disc" :style="{ background: tile.fill }">
          <i
            v-if="tile.icon"
            class="rn-mi rn-yms__icon"
            :style="{ color: tile.iconColor }"
          >{{ tile.icon }}</i>
          <span
            v-else-if="tile.text"
            class="rn-yms__text"
            :style="{ color: tile.ringColor }"
          >{{ tile.text }}</span>
        </span>
      </span>

      <span
        v-if="showBodies"
        class="rn-yms__body"
        :style="{ color: tile.state === 'empty' ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.75)' }"
      >{{ tile.bodyText }}</span>
    </button>
  </div>
</template>

<script>
import ProgressRing from '../ProgressRing/ProgressRing.vue';

export default {
  name: 'MoleculeYearMonthStrip',
  components: { ProgressRing },
  props: {
    /** `yearGoalModel.monthTiles(tree, selectedIndex)`. */
    tiles: { type: Array, default: () => [] },
    shell: { type: String, default: 'phone' },
  },
  computed: {
    /**
     * Desktop has room for the month goal's body under each tile; the phone's
     * 6-column grid and the tablet's 12 do not, and a clipped word is worse
     * than no word (the `title` attribute carries it on every shell).
     */
    showBodies() {
      return this.shell === 'desktop';
    },
  },
};
</script>

<style>
.rn-yms {
  display: grid;
  gap: 4px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* Phone wraps 12 months into two rows of six; tablet and desktop get one row. */
.rn-yms--phone {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.rn-yms--tablet,
.rn-yms--desktop {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 2px;
}

.rn-yms__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background .2s;
  min-width: 0;
}

.rn-yms__tile--selected {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .12);
}

.rn-yms__label {
  font-size: 10px;
  line-height: 1;
}

.rn-yms--desktop .rn-yms__label {
  font-size: 11px;
}

.rn-yms__ring {
  position: relative;
  width: 36px;
  height: 36px;
  display: block;
}

.rn-yms__dash {
  position: absolute;
  top: 0;
  left: 0;
  width: 36px;
  height: 36px;
  transform: rotate(-90deg);
}

.rn-yms__disc {
  position: absolute;
  top: 4px;
  right: 4px;
  bottom: 4px;
  left: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .3s;
}

.rn-yms__icon {
  font-size: 16px;
}

.rn-yms__text {
  font-size: 10px;
  font-weight: 700;
}

.rn-yms__body {
  font-size: 10px;
  line-height: 1.25;
  text-align: center;
  padding: 0 4px;
  height: 25px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
